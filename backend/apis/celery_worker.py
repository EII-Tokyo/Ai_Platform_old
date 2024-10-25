# 标准库导入
import os
import time
import json
import subprocess
from PIL import Image
import cv2

# 第三方库导入
from bson.objectid import ObjectId
from pymongo import MongoClient
from minio import Minio
from celery import Celery, Task
from celery.contrib.abortable import AbortableTask
from celery.signals import (
    task_postrun,
    task_success,
    task_failure,
    task_revoked
)
from pydantic import ValidationError
from ultralytics import YOLO

# 自定义模块导入
from apis.logger import get_logger
from apis.celery_task_meta import YOLOTaskModel

# 初始化logger
logger = get_logger()

# 创建MongoDB客户端
mongo_client = MongoClient('mongodb://mongo:27017/')
db = mongo_client['yolo_tasks']
task_collection = db['tasks']
media_collection = db['medias']
model_collection = db['models']

# 创建MinIO客户端
minio_client = Minio(
    "minio:9000",
    access_key=os.environ.get('MINIO_ACCESS_KEY'),
    secret_key=os.environ.get('MINIO_SECRET_KEY'),
    secure=False
)

# 创建Celery应用
app = Celery('yolo_tasks', broker='redis://redis:6379/0', backend='redis://redis:6379/0')

# 配置Celery
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Shanghai',
    enable_utc=True,
    worker_concurrency=4,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    broker_connection_retry_on_startup=True,  # 添加此行
)

def update_collection(task_name, task_id, update_data):
    if task_name == 'convert_video':
        # 对于 convert_video 任务，我们需要通过 celery_task_id 查找对应的 video 记录
        video = media_collection.find_one({'celery_task_id': task_id})
        if video:
            media_collection.update_one(
                {'_id': video['_id']},
                {'$set': update_data}
            )
    elif task_name in ['run_yolo_image', 'run_yolo_video']:
        task_collection.update_one(
            {'celery_task_id': task_id},
            {'$set': update_data}
        )

@task_postrun.connect
def task_postrun_handler(task_id, task, *args, retval=None, state=None, **kwargs):
    if state:
        update_data = {'status': state, 'end_time': time.time()}
        update_collection(task.name, task_id, update_data)

@task_success.connect
def task_success_handler(sender, result, **kwargs):
    update_data = {'status': 'SUCCESS', 'result': result}
    update_collection(sender.name, sender.request.id, update_data)

@task_failure.connect
def task_failure_handler(sender, task_id, exception, einfo, *args, **kwargs):
    update_data = {'status': 'FAILURE', 'error_message': str(exception)}
    update_collection(sender.name, task_id, update_data)

@task_revoked.connect
def task_revoked_handler(request, terminated, signum, expired, **kwargs):
    update_data = {'status': 'REVOKED', 'end_time': time.time()}
    update_collection(request.task, request.id, update_data)

@app.task(base=AbortableTask, bind=True, name='convert_video')
def convert_video(self, video_id):
    try:
        video_info = media_collection.find_one({'_id': ObjectId(video_id)})
        if not video_info:
            raise Exception(f"Video with id {video_id} not found")

        media_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': {'status': 'RUNNING'}}
        )

        minio_filename = video_info['minio_filename']
        file_extension = os.path.splitext(minio_filename)[1]
        unique_filename = f"{self.request.id}{file_extension}"
        local_filename = f"/tmp/{unique_filename}"

        # Download file from MinIO
        minio_client.fget_object("yolo-files", minio_filename, local_filename)

        # Get video metadata
        def get_video_metadata(file_path):
            result = subprocess.run([
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', file_path
            ], capture_output=True, text=True)
            metadata = json.loads(result.stdout)

            video_stream = next((s for s in metadata['streams'] if s['codec_type'] == 'video'), None)

            return {
                'width': int(video_stream['width']),
                'height': int(video_stream['height']),
                'duration': float(metadata['format']['duration']),
                'vcodec': video_stream['codec_name'],
                'file_extension': os.path.splitext(file_path)[1],
            }

        # Extract metadata and update database
        metadata = get_video_metadata(local_filename)
        media_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': {
                'width': metadata['width'],
                'height': metadata['height'],
                'duration': metadata['duration'],
                'vcodec': metadata['vcodec'],
                'file_extension': metadata['file_extension'],
                'progress': 0
            }}
        )

        # Always convert to MP4
        print("Converting video to MP4...")
        converted_filename = f"/tmp/converted_{self.request.id}.mp4"
        ffmpeg_command = [
            '/usr/bin/ffmpeg', '-i', local_filename, 
            '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '128k',  # Add audio conversion
            '-movflags', '+faststart',  # Optimize for web streaming
            '-progress', 'pipe:1',
            '-y', converted_filename
        ]
        process = subprocess.Popen(ffmpeg_command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True)

        duration = metadata['duration']
        for line in process.stdout:
            if 'time=' in line:
                time_str = line.split('time=')[1].split()[0]
                hours, minutes, seconds = map(float, time_str.split(':'))
                current_time = hours * 3600 + minutes * 60 + seconds
                progress = int((current_time / duration) * 100)
                # Update progress in Video table
                media_collection.update_one(
                    {'_id': ObjectId(video_id)},
                    {'$set': {'progress': progress}}
                )

        process.wait()
        if process.returncode != 0:
            raise Exception("Video conversion failed")

        os.remove(local_filename)
        local_filename = converted_filename

        # Update metadata for converted video
        metadata = get_video_metadata(local_filename)

        # Upload converted file to MinIO
        converted_minio_filename = f"converted/converted_{video_id}.mp4"
        minio_client.fput_object("yolo-files", converted_minio_filename, local_filename)

        # Update Video table with file info and metadata
        media_collection.update_one(
            {'_id': ObjectId(video_id)},
            {
                '$set': {
                    'minio_filename': converted_minio_filename,
                    'progress': 100,
                    'width': metadata['width'],
                    'height': metadata['height'],
                    'duration': metadata['duration'],
                    'vcodec': metadata['vcodec'],
                    'file_extension': '.mp4',
                }
            }
        )

        # Clean up temporary file
        os.remove(local_filename)

        return {'status': 'success', 'converted_filename': converted_minio_filename}
    except Exception as e:
        # Update Video table with error status
        media_collection.update_one(
            {'_id': ObjectId(video_id)},
            {'$set': {'status': 'error', 'error_message': str(e)}}
        )
        raise e

# 下载文件
def download_file_from_minio(minio_client, bucket_name, minio_filename, local_filename):
    try:
        minio_client.fget_object(bucket_name, minio_filename, local_filename)
        logger.debug(f'File downloaded to: {local_filename}')
        return local_filename
    except Exception as e:
        raise Exception(f"Failed to download file from MinIO: {e}")


# 上传文件
def upload_file_to_minio(minio_client, bucket_name, local_filepath, remote_filepath):
    try:
        minio_client.fput_object(bucket_name, remote_filepath, local_filepath)
        logger.debug(f'File uploaded to: {remote_filepath}')
    except Exception as e:
        raise Exception(f"Failed to upload file to MinIO: {e}")


# 删除本地文件
def remove_local_file(filepath):
    try:
        os.remove(filepath)
        logger.debug(f'Local file {filepath} deleted')
    except FileNotFoundError:
        logger.warning(f'Local file {filepath} not found for deletion')
    except Exception as e:
        raise Exception(f"Failed to delete local file {filepath}: {e}")


# 更新任务状态
def update_task_status(task_collection, task_id, update_fields):
    try:
        task_collection.update_one(
            {'_id': ObjectId(task_id)},
            {'$set': update_fields}
        )
        logger.debug(f"Task {task_id} updated with {update_fields}")
    except Exception as e:
        raise Exception(f"Failed to update task {task_id}: {e}")


# 处理 YOLO 预测
def perform_yolo_prediction(model, local_filename, params: YOLOTaskModel):
    try:
        # YOLO 模型进行预测
        results = model.predict(
            local_filename, 
            conf=params.conf, 
            imgsz=(params.height,params.width), 
            augment=params.augment, 
            classes=params.detect_class_indices, 
            device='cuda:0'
        )

        # 处理预测结果
        im_array = results[0].plot(font_size=8, line_width=1)
        im = Image.fromarray(im_array[..., ::-1])  # RGB PIL image

        # 保存结果图像       
        result_filename = f"result_{os.path.basename(local_filename)}"
        # 从环境变量获取 RESULT_DIR，默认为 '/tmp/results' 如果未设置
        RESULT_DIR = os.getenv('RESULT_DIR', '/tmp/results')
        result_filepath = os.path.join(RESULT_DIR, result_filename)
        os.makedirs(os.path.dirname(result_filepath), exist_ok=True)
        im.save(result_filepath)

        logger.debug(f"Result saved at: {result_filepath}")
        return result_filepath
    except Exception as e:
        raise Exception(f"YOLO prediction failed: {e}")


# Celery 任务
@app.task(base=Task, bind=True, name='run_yolo_image')
def run_yolo_image(self, task_params: dict):
    try:
        # 验证参数
        try:
            params = YOLOTaskModel(**task_params)
            logger.warning(f"Start processing image : {params}")
        except ValidationError as e:
            raise Exception(f"Invalid task parameters: {e}")
        
        logger.debug(f"Start processing image {params.media_id}")

        # 获取媒体信息
        media_info = media_collection.find_one({'_id': ObjectId(params.media_id)})
        if not media_info:
            raise Exception(f"File with id {params.media_id} not found")
        
        # 更新任务状态为 RUNNING
        update_task_status(task_collection, params.inserted_id, {'celery_task_id': self.request.id, 'status': 'RUNNING'})

        # 下载文件
        minio_filename = media_info['minio_filename']
        file_extension = os.path.splitext(minio_filename)[1]
        unique_filename = f"{self.request.id}{file_extension}"
        local_filename = download_file_from_minio(minio_client, "yolo-files", minio_filename, f"/tmp/{unique_filename}")

        # 加载 YOLO 模型
        model_info = model_collection.find_one({'_id': ObjectId(params.model_id)})
        if not model_info:
            raise Exception(f"Model with id {params.model_id} not found")
        
        model = YOLO(model_info['model_path'])

        # 执行 YOLO 预测
        result_filepath = perform_yolo_prediction(model, local_filename, params)

        # 上传结果文件到 MinIO
        upload_file_to_minio(minio_client, "yolo-files", result_filepath, f"results/{os.path.basename(result_filepath)}")

        # 更新任务状态为完成
        update_task_status(task_collection, params.inserted_id, {'progress': 100, 'result_file': f"results/{os.path.basename(result_filepath)}"})

        # 清理本地文件
        remove_local_file(local_filename)
        remove_local_file(result_filepath)

        logger.debug(f"Image {params.media_id} processing completed successfully")
        return f"Image {params.media_id} processing completed, result file: results/{os.path.basename(result_filepath)}"
    
    except Exception as e:
        logger.error(f"Error processing image {params.media_id}: {str(e)}", exc_info=True)
        raise

@app.task(base=AbortableTask, bind=True, name='run_yolo_video')
def run_yolo_video(self, task_params: dict):
    try:
        # 验证参数
        try:
            params = YOLOTaskModel(**task_params)
            logger.debug(f"Start processing video: {params}")
        except ValidationError as e:
            raise Exception(f"Invalid task parameters: {e}")

        logger.debug(f"Start processing video {params.media_id}")

        # 获取媒体信息
        media_info = media_collection.find_one({'_id': ObjectId(params.media_id)})
        if not media_info:
            raise Exception(f"File with id {params.media_id} not found")
        
        # 更新任务状态为 RUNNING
        update_task_status(task_collection, params.inserted_id, {'celery_task_id': self.request.id, 'status': 'RUNNING'})

        # 下载文件
        minio_filename = media_info['minio_filename']
        file_extension = os.path.splitext(minio_filename)[1]
        unique_filename = f"{self.request.id}{file_extension}"
        local_filename = download_file_from_minio(minio_client, "yolo-files", minio_filename, f"/tmp/{unique_filename}")

        # 加载 YOLO 模型
        model_info = model_collection.find_one({'_id': ObjectId(params.model_id)})
        if not model_info:
            raise Exception(f"Model with id {params.model_id} not found")
        
        model = YOLO(model_info['model_path'])

        # 设置视频写入器
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        output_filename = f"result_{unique_filename.split('.')[0]}.mp4"
        output_filename_relative_path = f"results/{output_filename}"
        os.makedirs(os.path.dirname(output_filename_relative_path), exist_ok=True)
        fps = cv2.VideoCapture(local_filename).get(cv2.CAP_PROP_FPS)
        out = cv2.VideoWriter(output_filename_relative_path, fourcc, fps, (params.width, params.height))

        # 进行预测
        results = model(local_filename, stream=True, conf=params.conf, imgsz=(params.height, params.width), augment=params.augment, classes=params.detect_class_indices, device='cuda:0')

        frame_count = 0
        total_frames = int(cv2.VideoCapture(local_filename).get(cv2.CAP_PROP_FRAME_COUNT))

        for result in results:
            frame_count += 1
            progress = int((frame_count / total_frames) * 100)

            # 处理每一帧
            im_array = result.plot()
            frame = cv2.resize(im_array, (params.width, params.height))
            out.write(frame)

            # 更新进度
            update_task_status(task_collection, params.inserted_id, {'progress': progress})

            if self.is_aborted():
                logger.debug(f"Video {params.media_id} processing aborted")
                out.release()
                return "Task aborted"

        out.release()

        # FFmpeg转码
        transcoded_output = f"results/transcoded_{output_filename}"
        ffmpeg_command = [
            '/usr/bin/ffmpeg', '-i', output_filename_relative_path, 
            '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
            '-y', transcoded_output
        ]
        subprocess.run(ffmpeg_command, check=True)

        # 上传结果文件到 MinIO
        upload_file_to_minio(minio_client, "yolo-files", transcoded_output, f"results/{output_filename}")

        # 更新任务状态
        update_task_status(task_collection, params.inserted_id, {'progress': 100, 'result_file': f"results/{output_filename}"})

        # 清理临时文件
        remove_local_file(local_filename)
        remove_local_file(output_filename_relative_path)
        remove_local_file(transcoded_output)

        logger.debug(f"Video {params.media_id} processing completed successfully")
        return f"Video {params.media_id} processing completed, result file: results/{output_filename}"
    
    except Exception as e:
        logger.error(f"Error processing video {params.media_id}: {str(e)}", exc_info=True)
        raise