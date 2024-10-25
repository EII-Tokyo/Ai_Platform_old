from pydantic import BaseModel
from typing import List, Optional

# 公共的基类
class BaseTaskModel(BaseModel):
    media_id: str
    model_id: str
    conf: float = 0.25
    augment: bool = False
    width: int = 1920
    height: int = 1088
    detect_class_indices: List[int] = []

# 扩展的 YOLOTaskModel 类
class YOLOTaskModel(BaseTaskModel):
    inserted_id: str  # YOLOTaskModel 特有的字段

# 扩展的 TaskParams 类
class TaskParams(BaseTaskModel):
    media_type: str  # TaskParams 特有的字段
    detect_classes: List[str] = []  # TaskParams 特有的字段
    parent_id: str