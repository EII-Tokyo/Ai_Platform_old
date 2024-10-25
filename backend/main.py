# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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