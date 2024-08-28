# main.py

import io
import os
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from celery.result import AsyncResult
from models.models import task_collection, media_collection
from bson.objectid import ObjectId
import uuid
import time
from celery_worker import run_yolo_image, run_yolo_video
from pydantic import BaseModel
from apis.models import router as model_router
from apis.tasks import router as task_router
from apis.medias import router as media_router

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

class TaskParams(BaseModel):
    media_id: str
    media_type: str
    model_id: str
    conf: float = 0.25
    width: int = 1920
    height: int = 1088
    augment: bool = False
    detect_classes: List[str] = []
    detect_class_indices: List[int] = []

@app.post("/api/run_yolo")
async def api_run_yolo(taskParams: TaskParams):
    media_info = media_collection.find_one({'_id': ObjectId(taskParams.media_id)})
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
        'inserted_time': time.time()
    }
    result = task_collection.insert_one(task_doc)

    if taskParams.media_type == "image":
        task = run_yolo_image.delay(str(result.inserted_id), taskParams.media_id, taskParams.model_id, taskParams.detect_class_indices, conf=taskParams.conf, imgsz=(taskParams.height, taskParams.width), augment=taskParams.augment)
    elif taskParams.media_type == "video":
        task = run_yolo_video.delay(str(result.inserted_id), taskParams.media_id, taskParams.model_id, taskParams.detect_class_indices, conf=taskParams.conf, imgsz=(taskParams.height, taskParams.width), augment=taskParams.augment)
    
    return {"task_id": task.id, "task_doc_id": str(result.inserted_id)}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)