import os
import time
from typing import List,Optional
from models.models import task_collection,media_collection
from celery.result import AsyncResult
from bson.objectid import ObjectId
from fastapi import APIRouter, HTTPException, Query 
from pydantic import BaseModel
from .minio_client_setup import setup_minio_client
from .logger import get_logger
from .utils import get_folder_info
from .celery_task_meta import YOLOTaskModel,TaskParams
from .celery_worker import run_yolo_image, run_yolo_video

# 获取全局配置的 logger
logger = get_logger()

# 启动时初始化 MinIO 客户端
minio_wrap = setup_minio_client()

router = APIRouter()

@router.get("/task_status/{task_id}")
async def get_task_status(task_id: str):
    task_result = AsyncResult(task_id)
    task_info = task_collection.find_one({'_id': ObjectId(task_id)})
    if task_info:
        result = {
            "task_id": task_id,
            "task_status": task_info.get('status'),
            "task_result": task_info.get('result'),
            "progress": task_info.get('progress'),
            "start_time": task_info.get('start_time'),
            "end_time": task_info.get('end_time'),
            "error": task_info.get('error')
        }
    else:
        result = {
            "task_id": task_id,
            "task_status": task_result.status,
            "task_result": task_result.result
        }
    return result

@router.post("/terminate_task/{task_id}")
async def terminate_task(task_id: str):
    task = AsyncResult(task_id)
    if task.state in ['PENDING', 'RUNNING', 'RETRY']:
        task.revoke(terminate=True)
        return {"message": f"Task {task_id} has been aborted."}
    else:
        raise HTTPException(status_code=400, detail=f"Task {task_id} is not running or doesn't exist.")

@router.get("/tasks")
async def get_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    folder_id: Optional[str] = None
):
    try:
        logger.debug(f"folder_id : {folder_id}")
        if folder_id != "root":
            # Check if folder_id is 'root' or a valid ObjectId
            if not ObjectId.is_valid(folder_id):
                raise HTTPException(status_code=400, detail="400: Invalid folder ID")

            # Fetch tasks associated with the provided folder_id
            folder = task_collection.find_one({"_id": ObjectId(folder_id), "media_type": "folder"})
            if not folder:
                raise HTTPException(status_code=404, detail="404: Parent Folder not found")

            cursor = task_collection.find({"parent_id": folder_id})
        else:
            # If folder_id is not provided, fetch the root folder contents
            cursor = task_collection.find({"parent_id": "root"})

        # Calculate skip value for pagination
        skip = (page - 1) * page_size
        cursor = cursor.sort('_id', -1).skip(skip).limit(page_size)

        # Convert cursor to list and prepare the response
        tasks = []
        for task in cursor:
            task['_id'] = str(task['_id'])  # Convert ObjectId to string
            tasks.append(task)

        # Get total count of documents
        total_count = task_collection.count_documents({"parent_id": folder_id}) if folder_id != "root" else task_collection.count_documents({"parent_id": "root"})

        return {
            "tasks": tasks,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
            "total_count": total_count
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"500: {str(e)}")


@router.delete("/delete_tasks")
async def delete_tasks(ids: List[str]):
    try:
        # Convert string ids to ObjectId
        logger.debug(f'ids = {ids}')
        object_ids = [ObjectId(id) for id in ids]

        # Find the documents to get MinIO filenames before deletion
        task_to_delete = task_collection.find({"_id": {"$in": object_ids}})
 
        minio_filenames = []
        for task in task_to_delete:
            logger.debug(f'current task : {task}') 
            if 'minio_filename' in task:
                minio_filenames.append(task['minio_filename'])

        # Delete the documents from MongoDB
        result = task_collection.delete_many({"_id": {"$in": object_ids}})
        logger.debug(f'filenames : {minio_filenames}')

        # Delete the files from MinIO
        minio_wrap.delete_files(minio_filenames)

        return {
            "deleted_count": result.deleted_count,
            "message": f"Successfully deleted {result.deleted_count} task(s)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 定义用于创建新文件夹的模型
class TaskFolderCreateRequest(BaseModel):
    media_id: str
    media_type: str = "folder"
    original_filename: str = 'new folder'
    minio_filename: str = ""
    model_id: str = ""
    detect_classes: List[str] = []
    status: str = "SUCCESS"
    conf: float = 0.5
    width: int = 0
    height: int = 0
    augment: bool=False
    inserted_time: float = time.time()
    celery_task_id: str = ''
    progress: int = 100
    result_file: str = ''
    result: str = 'create folder'
    end_time: float = time.time()
    full_path: str
    parent_id: str
    error:str = '' 

# 获取完整路径的函数
def get_full_path(parent_id: str, task_collection) -> str:
    path_list = []
    while parent_id != 'root':
        parent = task_collection.find_one({"_id": ObjectId(parent_id), "media_type": "folder"})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent Folder not found")
        path_list.append(parent.get('original_filename'))
        parent_id = parent['parent_id']
    return os.sep.join([''] + path_list[::-1])

# 创建新文件夹的API
@router.post("/task_create_new_folder")
async def task_create_new_folder(folder: TaskFolderCreateRequest):
    try:
        # 检查是否已经存在相同名称的文件夹
        existing_folder = task_collection.find_one({"full_path": folder.full_path, "media_type": "folder"})
        if existing_folder:
            return {
                "message": "Folder with the same name already exists, creation failed.",
                "folder_id": str(existing_folder["_id"]),
                "flag": False  # 文件夹已存在，设置 flag 为 False
            }

        logger.warning('create new task folder', folder.model_dump())
        # 插入新文件夹到数据库
        result = task_collection.insert_one(folder.model_dump())
        
        return {
            "message": "Folder created successfully",
            "folder_id": str(result.inserted_id),
            "flag": True  # 创建成功，设置 flag 为 True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 定义FolderWrap类
class FolderWrap(BaseModel):
    folderId: str


class FolderWrap(BaseModel):
    folderId: str

@router.post("/get_task_parent_info_by_folder_id")
async def get_task_parent_info_by_folder_id(folder_wrap: FolderWrap):
    try:
        return get_folder_info(task_collection, folder_wrap.folderId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run_yolo")
async def api_run_yolo(taskParams: TaskParams):
    media_info = media_collection.find_one({'_id': ObjectId(taskParams.media_id)})

    logger.debug(taskParams)
    task_doc = {
        'media_id': taskParams.media_id,
        'media_type': media_info['media_type'],
        'original_filename': media_info['original_filename'],
        'minio_filename': media_info['minio_filename'],
        'model_id': taskParams.model_id,
        'detect_classes': taskParams.detect_classes,
        'status': 'PENDING',
        'conf': taskParams.conf,
        'width': taskParams.width,
        'height': taskParams.height,
        'augment': taskParams.augment,
        'inserted_time': time.time(),
        'parent_id': taskParams.parent_id,
        'full_path': media_info['full_path']
    }
    try:
        result = task_collection.insert_one(task_doc)
        logger.info(f"Document inserted with task_item: {task_doc}")
    except Exception as e:
        logger.error(f"Error inserting document {task_doc} into task_collection: {e}", exc_info=True)
        raise

    logger.debug(taskParams)

    yolo_task_params = YOLOTaskModel(
        inserted_id=str(result.inserted_id),
        media_id=taskParams.media_id,
        model_id=taskParams.model_id,
        detect_class_indices=taskParams.detect_class_indices,
        conf=taskParams.conf,
        width=taskParams.width,
        height=taskParams.height,
        augment=taskParams.augment
    )

    logger.debug(yolo_task_params)
    logger.debug(media_info)

    if media_info['media_type'] == "image":
        logger.debug('yolo image begin .....')
        
        # 调用 Celery 任务，将 task_params 转换为字典并作为参数传递
        task = run_yolo_image.apply_async(args=[yolo_task_params.model_dump()])
        logger.warning(task)
    elif media_info['media_type'] == "video":
        logger.debug('yolo video begin .....')
        task = run_yolo_video.apply_async(args=[yolo_task_params.model_dump()])
    
    return {"task_id": task.id, "task_doc_id": str(result.inserted_id)}