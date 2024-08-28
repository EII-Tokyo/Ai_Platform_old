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
from apis.upload import router as upload_router

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
app.include_router(upload_router, prefix="/api")

class TaskParams(BaseModel):
    file_id: str
    file_type: str
    model_id: str
    conf: float = 0.25
    width: int = 1920
    height: int = 1088
    augment: bool = False
    detect_classes: List[str] = []
    detect_class_indices: List[int] = []

@app.post("/api/run_yolo")
async def api_run_yolo(taskParams: TaskParams):
    if taskParams.file_type == "image":
        task = run_yolo_image.delay(taskParams.file_id, taskParams.model_id, taskParams.detect_class_indices, conf=taskParams.conf, imgsz=(taskParams.height, taskParams.width), augment=taskParams.augment)
    elif taskParams.file_type == "video":
        task = run_yolo_video.delay(taskParams.file_id, taskParams.model_id, taskParams.detect_class_indices, conf=taskParams.conf, imgsz=(taskParams.height, taskParams.width), augment=taskParams.augment)
    media_info = media_collection.find_one({'_id': ObjectId(taskParams.file_id)})
    task_doc = {
        'celery_task_id': task.id,
        'file_id': taskParams.file_id,
        'file_type': taskParams.file_type,
        'original_file': media_info['minio_filename'],
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
    return {"task_id": task.id, "task_doc_id": str(result.inserted_id)}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)