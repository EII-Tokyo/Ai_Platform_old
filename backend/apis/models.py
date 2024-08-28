from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from bson.objectid import ObjectId
import time
import os
import yaml
from models.models import model_collection

router = APIRouter()

class ModelCreate(BaseModel):
    name: str
    description: str

class ModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_detect_classes: Optional[List[str]] = None

class ModelResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    description: str
    created_at: float
    classes: List[str]
    default_detect_classes: List[str]

    class Config:
        allow_population_by_field_name = True

def save_upload_file(upload_file: UploadFile, destination: str):
    try:
        with open(destination, "wb") as buffer:
            buffer.write(upload_file.file.read())
    finally:
        upload_file.file.close()

def parse_yaml_classes(yaml_content: str) -> Dict[str, List[str]]:
    try:
        data = yaml.safe_load(yaml_content)
        
        # Check if it's the first type of YAML (simple names dictionary)
        if 'names' in data and isinstance(data['names'], dict):
            classes = list(data['names'].values())
        # Check if it's the second type of YAML (YOLO dataset config)
        elif 'names' in data and isinstance(data['names'], list):
            classes = data['names']
        else:
            raise ValueError("Unsupported YAML structure")

        return {
            "classes": classes,
            "default_detect_classes": classes  # Initially, all classes are default
        }
    except yaml.YAMLError:
        raise HTTPException(status_code=400, detail="Invalid YAML file")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/models", response_model=ModelResponse)
async def create_model(
    name: str = Form(...),
    description: str = Form(...),
    model_file: UploadFile = File(...),
    yaml_file: UploadFile = File(...)
):
    print(name, description)
    # Save model file
    model_filename = f"{name}_{int(time.time())}.pt"
    model_path = os.path.join("weights", model_filename)
    save_upload_file(model_file, model_path)

    # Parse YAML file
    yaml_content = await yaml_file.read()
    parsed_data = parse_yaml_classes(yaml_content.decode())

    model_data = {
        "name": name,
        "description": description,
        "created_at": time.time(),
        "model_path": model_path,
        "classes": parsed_data["classes"],
        "default_detect_classes": parsed_data["default_detect_classes"]
    }

    result = model_collection.insert_one(model_data)
    created_model = model_collection.find_one({"_id": result.inserted_id})

    return ModelResponse(
        _id=str(created_model["_id"]),
        name=created_model["name"],
        description=created_model["description"],
        created_at=created_model["created_at"],
        classes=created_model["classes"],
        default_detect_classes=created_model["default_detect_classes"]
    )

@router.get("/models/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str):
    model = model_collection.find_one({"_id": ObjectId(model_id)})
    if model is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return ModelResponse(
        _id=str(model["_id"]),
        name=model["name"],
        description=model["description"],
        created_at=model["created_at"],
        classes=model["classes"],
        default_detect_classes=model["default_detect_classes"]
    )

@router.put("/models/{model_id}", response_model=ModelResponse)
async def update_model(model_id: str, model_update: ModelUpdate):
    update_data = {k: v for k, v in model_update.dict().items() if v is not None}
    result = model_collection.update_one(
        {"_id": ObjectId(model_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Model not found")
    updated_model = model_collection.find_one({"_id": ObjectId(model_id)})
    return ModelResponse(
        _id=str(updated_model["_id"]),
        name=updated_model["name"],
        description=updated_model["description"],
        created_at=updated_model["created_at"],
        classes=updated_model["classes"],
        default_detect_classes=updated_model["default_detect_classes"]
    )

class BulkDeleteModel(BaseModel):
    model_ids: List[str]

@router.delete("/models/bulk-delete")
async def bulk_delete_models(delete_data: BulkDeleteModel):
    deleted_count = 0
    errors = []

    for model_id in delete_data.model_ids:
        try:
            model = model_collection.find_one({"_id": ObjectId(model_id)})
            if model is None:
                errors.append(f"Model with ID {model_id} not found")
                continue
            
            # Delete the model file
            if os.path.exists(model["model_path"]):
                os.remove(model["model_path"])
            
            result = model_collection.delete_one({"_id": ObjectId(model_id)})
            if result.deleted_count > 0:
                deleted_count += 1
            else:
                errors.append(f"Failed to delete model with ID {model_id}")
        except Exception as e:
            errors.append(f"Error deleting model with ID {model_id}: {str(e)}")

    return {
        "message": f"Bulk delete operation completed. {deleted_count} models deleted successfully.",
        "deleted_count": deleted_count,
        "errors": errors
    }

@router.get("/models", response_model=List[ModelResponse])
async def list_models():
    models = list(model_collection.find())
    
    model_responses = [
        ModelResponse(
            _id=str(model["_id"]),
            name=model["name"],
            description=model["description"],
            created_at=model["created_at"],
            classes=model["classes"],
            default_detect_classes=model["default_detect_classes"]
        ) for model in models
    ]

    return model_responses