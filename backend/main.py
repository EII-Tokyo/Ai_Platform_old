# main.py

import time
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from models.models import task_collection, media_collection
from bson.objectid import ObjectId
from pydantic import BaseModel
from apis.models import router as model_router
from apis.tasks import router as task_router
from apis.medias import router as media_router
from apis.logger import get_logger
from celery_worker import run_yolo_image, run_yolo_video
from celery_task_meta import YOLOTaskModel,TaskParams

# 获取全局配置的 logger
logger = get_logger()

# 创建FastAPI应用
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(model_router, prefix="/api")
app.include_router(task_router, prefix="/api")
app.include_router(media_router, prefix="/api")

@app.post("/api/run_yolo")
async def api_run_yolo(taskParams: TaskParams):
    media_info = media_collection.find_one({'_id': ObjectId(taskParams.media_id)})

    logger.debug(taskParams)
    task_doc = {
        'media_id': taskParams.media_id,
        'media_type': taskParams.media_type,
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

    if taskParams.media_type == "image":
        logger.debug('yolo image begin .....')
        
        # 调用 Celery 任务，将 task_params 转换为字典并作为参数传递
        task = run_yolo_image.apply_async(args=[yolo_task_params.model_dump()])
    elif taskParams.media_type == "video":
        logger.debug('yolo video begin .....')
        task = run_yolo_video.apply_async(args=[yolo_task_params.model_dump()])
    
    return {"task_id": task.id, "task_doc_id": str(result.inserted_id)}
