import os
import uuid
import io
import time
from fastapi import Body, UploadFile, File, HTTPException, APIRouter, BackgroundTasks, Form, Query
from typing import List, Optional
from models.models import media_collection
from minio import Minio
from pydantic import Field,BaseModel
from minio.error import S3Error
from bson.objectid import ObjectId
from celery_worker import convert_video
from PIL import Image
from datetime import timedelta
import logging
import logging_loki


# Loki 配置
loki_handler = logging_loki.LokiHandler(
    url="http://loki:3100/loki/api/v1/push",  # 替换为你的 Loki 实例地址
    tags={"app": "yolotester_dev-backend-1"},
    version="1",
)

# 清空日志处理器的旧消息
loki_handler.flush()

formatter = logging.Formatter('%(asctime)s - %(filename)s : %(funcName)s : [%(lineno)d] \n%(message)s')
loki_handler.setFormatter(formatter)
logger = logging.getLogger('my_log')
logger.addHandler(loki_handler)
logger.setLevel(logging.DEBUG)


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

# Pydantic 模型，用于请求文件列表
class FileName(BaseModel):
    files: List[str]

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

# 定义文件元数据的 Pydantic 模型
class FileMetadata(BaseModel):
    name: str
    parent_id: str
    full_path:str
    type: str
    size: int
    lastModified: int
    minio_filename: str
    description: Optional[str] = None

def process_file_upload(meta:FileMetadata, media_id: str):
    try:
        # 创建媒体记录，包含新的 name 和 description 字段
        media_info = {
            "progress": 100,
            "celery_task_id": None
        }

        # 如果是图片，获取并存储宽度和高度
        # if meta.type.startswith('image/'):
        #     dimensions = get_image_dimensions(file_content)
        #     if dimensions:
        #         media_info["width"], media_info["height"] = dimensions

        logger.debug(media_info)

        media_collection.update_one(
            {'_id': ObjectId(media_id)},
            {'$set': media_info}
        )

        # 如果是视频文件，启动转码任务
        if meta.type.startswith('video/'):
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

# API 端点，返回预签名 URL 列表
@router.post("/generate_presigned_urls/")
async def generate_presigned_urls(data: FileName):
    presigned_urls = {}

    # 遍历请求中的文件名并生成对应的预签名 URL
    for file_name in data.files:
        try:
            # 使用 timedelta 来指定过期时间
            presigned_url = minio_client.presigned_put_object(minio_bucket, file_name, expires=timedelta(seconds=3600))
            presigned_urls[file_name] = presigned_url
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return {"presigned_urls": presigned_urls}



@router.post("/upload_file")
async def upload_file(
    background_tasks: BackgroundTasks,
    meta: FileMetadata
):
    try:
        result = media_collection.insert_one({
            "name": meta.name,
            "description": meta.description if meta.description else "",
            "parent_id": meta.parent_id,
            "full_path": meta.full_path,
            "progress": 0,
            "status": "SUCCESS",
            "upload_time": int(time.time() * 1000), # 转换为Javascript的Date.now()格式存储
            "file_size": meta.size,
            "content_type": meta.type,
            "media_type": "video" if meta.type.startswith('video/') else "image",
            "original_filename": meta.name,
            "minio_filename": meta.minio_filename,
        })

        background_tasks.add_task(
            process_file_upload,
            meta,
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
async def get_medias(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    folder_id: Optional[str] = None
):
    try:

        if folder_id != "root":
            # Check if folder_id is 'root' or a valid ObjectId
            if  not ObjectId.is_valid(folder_id):
                raise HTTPException(status_code=400, detail="400: Invalid folder ID")

            # If folder_id is provided, fetch the folder and its contents
            folder = media_collection.find_one({"_id": ObjectId(folder_id), "media_type": "folder"})
            if not folder:
                raise HTTPException(status_code=404, detail="404: Parent Folder not found")

            # Find all media items in the file list and subfolders
            cursor = media_collection.find({"parent_id": folder_id})

        else:
            # If folder_id is not provided, fetch the root folder contents
            cursor = media_collection.find({"parent_id": "root"})

        # Calculate skip value for pagination
        skip = (page - 1) * page_size
        cursor = cursor.sort('_id', -1).skip(skip).limit(page_size)

        # Convert cursor to list and prepare the response
        medias = []
        for media in cursor:
            media['_id'] = str(media['_id'])  # Convert ObjectId to string
            medias.append(media)

        # Get total count of documents
        total_count = media_collection.count_documents({"parent_id": "root"}) if not folder_id or folder_id == "root" else len(medias)

        return {
            "medias": medias,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
            "total_count": total_count
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"500: {str(e)}")

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

# 定义用于创建新文件夹的模型
class FolderCreateRequest(BaseModel):
    name: str
    description: str = ""
    upload_time: float
    parent_id: Optional[str] = 'root'  # 添加 parent_id 字段

@router.post("/create_new_folder")
async def create_new_folder(folder: FolderCreateRequest):
    try:
        parent_id = folder.parent_id
        path_list = []
        while parent_id != 'root':
            parent = media_collection.find_one({"_id": ObjectId(parent_id), "media_type": "folder"})
            # 如果文件夹不存在，返回 404
            if not parent:
                raise HTTPException(status_code=404, detail="Parent Folder not found")
            
            path_list.append(parent.get('original_filename'))
            parent_id = parent['parent_id']


        # 添加根节点 /A/B/C/D/filename
        full_path = os.sep.join([''] + path_list[::-1] + [folder.name])

        result = media_collection.insert_one({
            "name": folder.name,
            "description": folder.description,
            "parent_id": folder.parent_id,  # 添加了 parent_id 字段
            "full_path": full_path,
            "progress": 100,
            "status": "SUCCESS",
            "upload_time": folder.upload_time,
            "file_size": 0,
            "content_type": "",
            "media_type": "folder",
            "original_filename": folder.name,
            "minio_filename": "",
            "vcodec": "",
            "width": 0,
            "height": 0,
            "duration": 0,
            "celery_task_id": "",
            "start_time": folder.upload_time,
            "end_time": folder.upload_time,
            "error_message": ""
        })

        return {"message": "Folder created successfully", "folder_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 定义用于创建新文件夹的模型
class FolderWrap(BaseModel):
    folderId: str

@router.post("/get_parent_info_by_folder_id")
async def get_parent_info_by_folder_id(folder_wrap: FolderWrap):
    try:
        # 验证 folder_id 是否为有效的 ObjectId
        if folder_wrap.folderId == 'root':
            return {'folder_id': 'root', 'folder_name':'root','parent_id': '', 'parent_name': '', 'parent_path':''}
 
        if not ObjectId.is_valid(folder_wrap.folderId):
            raise HTTPException(status_code=400, detail="Invalid folder ID")
        
        # 从数据库中查找指定 folder_id 的文件夹
        folder = media_collection.find_one({"_id": ObjectId(folder_wrap.folderId), "media_type": "folder"})
        
        # 如果文件夹不存在，返回 404
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found")
        
        # 如果文件夹存在，检查是否有 parent_id 字段
        parent_id = folder.get("parent_id", "root")  # 如果没有 parent_id，则默认返回 "root"
        folder_name = folder.get("original_filename")

        # 从数据库中查找指定 parent_id 的文件夹
        if parent_id != 'root':
            parent = media_collection.find_one({"_id": ObjectId(parent_id), "media_type": "folder"})

            # 如果文件夹不存在，返回 404
            if not parent:
                raise HTTPException(status_code=404, detail="Parent Folder not found")
            
            parent_name = parent.get('original_filename')
            parent_path = parent.get('full_path')
        else:
            parent_name = 'root'
            parent_path = 'root'

        # 返回 
        return {"folder_id": folder_wrap.folderId, 
                "folder_name": folder_name,
                "parent_id": parent_id,
                "parent_name" : parent_name,
                "parent_path" : parent_path,
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Pydantic 模型
class MediaItem(BaseModel):
    id: str = Field(alias="_id")
    name: str
    description: str = ""
    parent_id: str
    full_path: str
    progress: int
    status: str
    upload_time: int
    file_size: int
    content_type: str
    media_type: str
    original_filename:str
    minio_filename:str
    # 可以根据实际情况添加更多字段

# 获取所有 parent_id 等于 folder_id 的媒体项目
@router.post("/get_medias_by_parent_id", response_model=List[MediaItem])
async def get_medias_by_parent_id(folder: FolderWrap):
    try:
        folder_id = folder.folderId
        logger.debug(f'folder_id is : {folder_id}')
        medias = list(media_collection.find({"parent_id": folder_id}))
        logger.debug(f'medias : {medias}')
        if not medias:
            raise HTTPException(status_code=404, detail="No media items found")
        for media in medias:
            if "_id" in media:
                media["_id"] = str(media["_id"])
        return [MediaItem(**media) for media in medias]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    return {"status": "ok"}