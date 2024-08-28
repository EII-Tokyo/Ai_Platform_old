import os
import uuid
import io
import time
import subprocess
import tempfile
from fastapi import UploadFile, File, HTTPException, APIRouter
from models.models import task_collection, media_collection
from minio import Minio
from minio import Minio
from minio.error import S3Error

# 从环境变量中获取MinIO的access key和secret key
minio_access_key = os.environ.get('MINIO_ACCESS_KEY')
minio_secret_key = os.environ.get('MINIO_SECRET_KEY')
minio_bucket = "yolo-files"

if not minio_access_key or not minio_secret_key:
    raise ValueError("MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set in environment variables")

# 创建MinIO客户端
minio_client = Minio(
    "minio:9000",
    access_key=minio_access_key,
    secret_key=minio_secret_key,
    secure=False
)

# 确保存在一个名为"yolo-files"的桶
try:
    if not minio_client.bucket_exists(minio_bucket):
        minio_client.make_bucket(minio_bucket)
except S3Error as e:
    print("Error occurred while creating MinIO bucket:", e)

def check_video_format(file_path):
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,profile', '-of', 'default=noprint_wrappers=1:nokey=1',
            file_path
        ], capture_output=True, text=True)
        codec, profile = result.stdout.strip().split('\n')
        return codec.lower() == 'h264' and profile.lower() == 'high'
    except Exception as e:
        print(f"Error checking video format: {str(e)}")
        return False

def convert_video(input_path, output_path):
    # try:
        subprocess.run([
            '/usr/bin/ffmpeg', '-i', input_path, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
            '-y', output_path
        ], check=True)
        return True
    # except subprocess.CalledProcessError as e:
    #     print(f"Error converting video: {str(e)}")
    #     return False

router = APIRouter()

@router.post("/upload_file")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        minio_filename = f"origins/{unique_filename}"

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Check if it's a video file
        if file.content_type.startswith('video/'):
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name

            if not check_video_format(temp_file_path):
                print("Video is not in the required format. Converting...")
                converted_file_path = f"{temp_file_path}_converted.mp4"
                if convert_video(temp_file_path, converted_file_path):
                    with open(converted_file_path, 'rb') as converted_file:
                        file_content = converted_file.read()
                    file_size = len(file_content)
                    minio_filename = f"origins/{uuid.uuid4()}.mp4"
                    os.remove(converted_file_path)
                else:
                    raise HTTPException(status_code=500, detail="Failed to convert video")

            os.remove(temp_file_path)

        # Upload file to MinIO
        minio_client.put_object(
            minio_bucket, minio_filename, io.BytesIO(file_content), length=file_size, part_size=10 * 1024 * 1024
        )

        # Record file info in MongoDB
        file_info = {
            "original_filename": file.filename,
            "minio_filename": minio_filename,
            "file_size": file_size,
            "content_type": file.content_type,
            "upload_time": time.time()
        }
        result = media_collection.insert_one(file_info)

        return {"file_id": str(result.inserted_id), "message": "File uploaded successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))