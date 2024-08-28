import os
import uuid
import io
import time
from fastapi import Body, UploadFile, File, HTTPException, APIRouter, BackgroundTasks, Form, Query
from typing import List, Optional
from models.models import media_collection
from minio import Minio
from minio.error import S3Error
from bson.objectid import ObjectId
from celery_worker import convert_video
from PIL import Image

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

router = APIRouter()

def get_image_dimensions(file_content: bytes):
    try:
        with Image.open(io.BytesIO(file_content)) as img:
            return img.size  # Returns (width, height)
    except Exception as e:
        print(f"Error getting image dimensions: {str(e)}")
        return None

def process_file_upload(file_content: bytes, filename: str, content_type: str, media_id: str):
    try:
        # 生成唯一文件名
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        minio_filename = f"origins/{unique_filename}"

        file_size = len(file_content)

        # 上传文件到 MinIO
        minio_client.put_object(
            "yolo-files", minio_filename, io.BytesIO(file_content), length=file_size, part_size=10 * 1024 * 1024
        )

        # 创建媒体记录，包含新的 name 和 description 字段
        media_info = {
            "minio_filename": minio_filename,            
            "status": "PENDING" if content_type.startswith('video/') else "SUCCESS",
            "progress": 0 if content_type.startswith('video/') else 100,
            "celery_task_id": None
        }

        # 如果是图片，获取并存储宽度和高度
        if content_type.startswith('image/'):
            dimensions = get_image_dimensions(file_content)
            if dimensions:
                media_info["width"], media_info["height"] = dimensions

        media_collection.update_one(
            {'_id': ObjectId(media_id)},
            {'$set': media_info}
        )

        # 如果是视频文件，启动转码任务
        if content_type.startswith('video/'):
            # 启动转码任务
            task = convert_video.delay(media_id)
            media_collection.update_one(
                {'_id': ObjectId(media_id)},
                {'$set': {'celery_task_id': task.id}}
            )
            return {"media_id": media_id, "message": "Video uploaded successfully, conversion started"}
        else:
            return {"media_id": media_id, "message": "Image uploaded successfully"}

    except Exception as e:
        print(f"Error in process_file_upload: {str(e)}")
        return {"error": str(e)}

@router.post("/upload_file")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: Optional[str] = Form(""),
    description: Optional[str] = Form(""),   
):
    try:
        file_content = await file.read()
        content_type = file.content_type

        result = media_collection.insert_one({
            "name": name,
            "description": description,
            "progress": 0,
            "status": "PENDING",
            "upload_time": time.time(),
            "file_size": len(file_content),
            "content_type": content_type,
            "media_type": "video" if content_type.startswith('video/') else "image",
            "original_filename": file.filename,
        })
        
        background_tasks.add_task(
            process_file_upload,
            file_content,
            file.filename,
            file.content_type,
            str(result.inserted_id)
        )
        
        return {"message": "File upload process started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all-medias", response_model=List[dict])
async def get_all_medias():
    try:
        # 获取所有media文档
        cursor = media_collection.find().sort('_id', -1)

        # 将cursor转换为列表并准备响应
        medias = []
        for media in cursor:
            media['_id'] = str(media['_id'])  # 将ObjectId转换为字符串
            medias.append(media)

        return medias
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/medias")
async def get_medias(page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100)):
    try:
        # Calculate skip value for pagination
        skip = (page - 1) * page_size

        # Query the database with pagination
        cursor = media_collection.find().sort('_id', -1).skip(skip).limit(page_size)

        # Convert cursor to list and prepare the response
        medias = []
        for media in cursor:
            media['_id'] = str(media['_id'])  # Convert ObjectId to string
            medias.append(media)

        # Get total count of documents
        total_count = media_collection.count_documents({})

        return {
            "medias": medias,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
            "total_count": total_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete_medias")
async def delete_medias(ids: List[str] = Body(...)):
    # try:
        # Convert string ids to ObjectId
        object_ids = [ObjectId(id) for id in ids]

        # Find the documents to get MinIO filenames before deletion
        medias_to_delete = media_collection.find({"_id": {"$in": object_ids}})

        minio_filenames = []
        for media in medias_to_delete:
            if 'minio_filename' in media:
                minio_filenames.append(media['minio_filename'])

        # Delete the documents from MongoDB
        result = media_collection.delete_many({"_id": {"$in": object_ids}})

        # Delete the files from MinIO
        for filename in minio_filenames:
            try:
                minio_client.remove_object(minio_bucket, filename)
            except S3Error as e:
                print(f"Error deleting file {filename} from MinIO: {str(e)}")

        return {
            "deleted_count": result.deleted_count,
            "message": f"Successfully deleted {result.deleted_count} media(s)"
        }
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=str(e))