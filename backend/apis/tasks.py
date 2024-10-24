import os
import time
from typing import List,Optional
from models.models import task_collection
from celery.result import AsyncResult
from bson.objectid import ObjectId
from fastapi import APIRouter, HTTPException, Query 
from pydantic import BaseModel
from .logger import get_logger
from .utils import get_folder_info

# 获取全局配置的 logger
logger = get_logger()

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
async def delete_tasks(task_ids: List[str]):
    results = []
    for task_id in task_ids:
        task_info = task_collection.find_one({'_id': ObjectId(task_id)})
        if not task_info:
            results.append({"task_id": task_id, "status": "not found"})
            continue

        if task_info['status'] in ['PENDING', 'RUNNING']:
            # Terminate the task
            task = AsyncResult(task_info['celery_task_id'])
            task.revoke(terminate=True)
            task_collection.update_one(
                {'_id': ObjectId(task_id)},
                {'$set': {'status': 'ABORTED'}}
            )
            results.append({"task_id": task_id, "status": "terminated and deleted"})
        else:
            # Delete the task
            task_collection.delete_one({'_id': ObjectId(task_id)})
            results.append({"task_id": task_id, "status": "deleted"})

    return {"results": results}


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
        logger.error('create new task folder', folder)
        # 插入新文件夹到数据库
        result = task_collection.insert_one(folder.model_dump())
        
        return {"message": "Folder created successfully", "folder_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FolderWrap(BaseModel):
    folderId: str

@router.post("/get_task_parent_info_by_folder_id")
async def get_task_parent_info_by_folder_id(folder_wrap: FolderWrap):
    try:
        return get_folder_info(task_collection, folder_wrap.folderId)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))