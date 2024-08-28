from pymongo import MongoClient

# 创建MongoDB客户端
mongo_client = MongoClient('mongodb://mongo:27017/')
db = mongo_client['yolo_tasks']
task_collection = db['tasks']
media_collection = db['medias']
model_collection = db['models']