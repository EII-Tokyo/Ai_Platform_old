from bson import ObjectId
from fastapi import HTTPException
from .logger import get_logger

# 获取全局配置的 logger
logger = get_logger()

def get_folder_info(collection, folder_id):
    if folder_id == 'root':
        return {'folder_id': 'root', 'folder_name':'root', 'parent_id': '', 'parent_name': '', 'parent_path': ''}

    if not ObjectId.is_valid(folder_id):
        raise HTTPException(status_code=400, detail="Invalid folder ID")

    folder = collection.find_one({"_id": ObjectId(folder_id), "media_type": "folder"})

    if not folder:
        logger.error('Folder not found')
        raise HTTPException(status_code=404, detail="Folder not found")

    parent_id = folder.get("parent_id", "root")
    folder_name = folder.get("original_filename")

    if parent_id != 'root':
        parent = collection.find_one({"_id": ObjectId(parent_id), "media_type": "folder"})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent Folder not found")
        parent_name = parent.get('original_filename')
        parent_path = parent.get('full_path')
    else:
        parent_name = 'root'
        parent_path = 'root'

    return {
        "folder_id": folder_id,
        "folder_name": folder_name,
        "parent_id": parent_id,
        "parent_name": parent_name,
        "parent_path": parent_path,
    }