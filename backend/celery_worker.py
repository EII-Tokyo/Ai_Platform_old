# celery_worker.py

import uuid
from celery import Celery
from celery.contrib.abortable import AbortableTask
from celery.signals import task_prerun, task_postrun, task_success, task_failure, task_revoked
import time
from pymongo import MongoClient
from bson.objectid import ObjectId
import os
from ultralytics import YOLO
from PIL import Image
import cv2
import io
from minio import Minio
import subprocess

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
)

@task_prerun.connect
def task_prerun_handler(task_id, task, *args, **kwargs):
    task_collection.update_one(
        {'celery_task_id': task_id},
        {'$set': {'status': 'RUNNING', 'start_time': time.time(), 'progress': 0}}
    )

@task_postrun.connect
def task_postrun_handler(task_id, task, *args, retval=None, state=None, **kwargs):
    if state:
        task_collection.update_one(
            {'celery_task_id': task_id},
            {'$set': {'status': state, 'end_time': time.time()}}
        )

@task_revoked.connect
def task_revoked_handler(request, terminated, signum, expired, **kwargs):
    task_collection.update_one(
        {'celery_task_id': request.id},
        {'$set': {'status': 'REVOKED', 'end_time': time.time()}}
    )

@task_success.connect
def task_success_handler(result, **kwargs):
    task_collection.update_one(
        {'celery_task_id': kwargs['sender'].request.id},
        {'$set': {'result': result}}
    )

@task_failure.connect
def task_failure_handler(task_id, exception, traceback, einfo, **kwargs):
    task_collection.update_one(
        {'celery_task_id': task_id},
        {'$set': {'status': 'FAILURE', 'error': str(exception)}}
    )

@app.task(base=AbortableTask, bind=True, name='run_yolo_image')
def run_yolo_image(self, file_id, model_id, detect_class_indices, conf=0.25, imgsz=(1088, 1920), augment=False):
    print(f"开始处理照片 {file_id}")
    try:
        print(model_id)
        media_info = media_collection.find_one({'_id': ObjectId(file_id)})
        if not media_info:
            raise Exception(f"File with id {file_id} not found")

        # 从MinIO下载文件
        minio_filename = media_info['minio_filename']
        file_extension = os.path.splitext(minio_filename)[1]
        unique_filename = f"{self.request.id}{file_extension}"
        local_filename = f"/tmp/{unique_filename}"
        minio_client.fget_object("yolo-files", minio_filename, local_filename)

        # 加载YOLO模型
        model_info = model_collection.find_one({'_id': ObjectId(model_id)})
        model = YOLO(model_info['model_path'])

        # 进行预测
        results = model.predict(local_filename, conf=conf, imgsz=imgsz, augment=augment, classes=detect_class_indices)

        # 处理结果
        im_array = results[0].plot(font_size=8, line_width=1)
        im = Image.fromarray(im_array[..., ::-1])  # RGB PIL image

        # 保存结果图像
        
        result_filename = f"result_{unique_filename}"
        im.save(result_filename)

        # 将结果上传到MinIO
        minio_client.fput_object("yolo-files", f"results/{result_filename}", result_filename)

        # 更新任务状态
        task_collection.update_one(
            {'celery_task_id': self.request.id},
            {'$set': {'progress': 100, 'result_file': f"results/{result_filename}"}}
        )

        # 清理临时文件
        os.remove(local_filename)
        os.remove(result_filename)

        print(f"照片 {file_id} 处理完成")
        return f"照片 {file_id} 处理完成，结果文件：results/{result_filename}"
    except Exception as e:
        print(f"照片 {file_id} 处理出错: {str(e)}")
        raise

@app.task(base=AbortableTask, bind=True, name='run_yolo_video')
def run_yolo_video(self, file_id, model_id, detect_class_indices, conf=0.25, imgsz=(1088, 1920), augment=False):
    print(f"开始处理视频 {file_id}")
    try:
        media_info = media_collection.find_one({'_id': ObjectId(file_id)})
        if not media_info:
            raise Exception(f"File with id {file_id} not found")

        # 从MinIO下载文件
        minio_filename = media_info['minio_filename']
        file_extension = os.path.splitext(minio_filename)[1]
        unique_filename = f"{self.request.id}{file_extension}"
        local_filename = f"/tmp/{unique_filename}"
        minio_client.fget_object("yolo-files", minio_filename, local_filename)

        # 加载YOLO模型
        model_info = model_collection.find_one({'_id': ObjectId(model_id)})
        model = YOLO(model_info['model_path'])

        # 设置视频写入器
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        output_filename = f"result_{unique_filename.split('.')[0]}.mp4"
        fps = cv2.VideoCapture(local_filename).get(cv2.CAP_PROP_FPS)
        out = cv2.VideoWriter(output_filename, fourcc, fps, (imgsz[1], imgsz[0]))

        # 进行预测
        results = model(local_filename, stream=True, conf=conf, imgsz=imgsz, augment=augment, classes=detect_class_indices)

        frame_count = 0
        total_frames = int(cv2.VideoCapture(local_filename).get(cv2.CAP_PROP_FRAME_COUNT))

        for result in results:
            frame_count += 1
            progress = int((frame_count / total_frames) * 100)

            # 处理每一帧
            im_array = result.plot()
            frame = cv2.resize(im_array, (imgsz[1], imgsz[0]))
            out.write(frame)

            # 更新进度
            task_collection.update_one(
                {'celery_task_id': self.request.id},
                {'$set': {'progress': progress}}
            )

            if self.is_aborted():
                print(f"视频 {file_id} 处理被中止")
                out.release()
                return "Task aborted"

        out.release()

        # FFmpeg转码
        transcoded_output = f"transcoded_{output_filename}"
        ffmpeg_command = [
            '/usr/bin/ffmpeg', '-i', output_filename, 
            '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
            '-y', transcoded_output
        ]
        subprocess.run(ffmpeg_command, check=True)

        # 将结果上传到MinIO
        minio_client.fput_object("yolo-files", f"results/{output_filename}", transcoded_output)

        # 更新任务状态
        task_collection.update_one(
            {'celery_task_id': self.request.id},
            {'$set': {'progress': 100, 'result_file': f"results/{output_filename}"}}
        )

        # 清理临时文件
        os.remove(local_filename)
        os.remove(output_filename)
        os.remove(transcoded_output)

        print(f"视频 {file_id} 处理完成")
        return f"视频 {file_id} 处理完成，结果文件：results/{output_filename}"
    except Exception as e:
        print(f"视频 {file_id} 处理出错: {str(e)}")
        raise

if __name__ == '__main__':
    app.worker_main(["worker", "--loglevel=info"])