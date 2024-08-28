from typing import List
from models.models import task_collection
from celery.result import AsyncResult
from bson.objectid import ObjectId
from fastapi import APIRouter, HTTPException, Query, UploadFile, File

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
async def get_tasks(limit: int = Query(10, ge=1, le=100), page_num: int = Query(1, ge=1)):
    skip = (page_num - 1) * limit
    # 修改查询以按插入时间降序排序
    tasks = list(task_collection.find().sort('_id', -1).skip(skip).limit(limit))
    
    # Convert ObjectId to string for JSON serialization
    for task in tasks:
        task['_id'] = str(task['_id'])
    
    total_tasks = task_collection.count_documents({})
    total_pages = (total_tasks + limit - 1) // limit

    return {
        "tasks": tasks,
        "page": page_num,
        "total_pages": total_pages,
        "total_tasks": total_tasks
    }

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