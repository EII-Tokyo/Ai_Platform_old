import os
from minio import Minio
from minio.error import S3Error
from datetime import timedelta
from .logger import get_logger


# 获取全局配置的 logger
logger = get_logger()

# minio_client_setup.py

class MinioClientWrapper:
    def __init__(self, client, bucket):
        self.client = client
        self.bucket = bucket

    # 新增 delete_files 方法
    def delete_files(self, filenames):
        deleted_count = 0

        for filename in filenames:
            try:
                # folder 的 filename 为空
                if filename and filename != '':
                    logger.debug(f'filename : {filename}')
                    self.client.remove_object(self.bucket, filename)
                    logger.debug(f"File {filename} deleted successfully.")
                    deleted_count += 1
            except S3Error as e:
                logger.debug(f"Error deleting file {filename} from MinIO: {str(e)}")

        return {
            "deleted_count": deleted_count,
            "message": f"Successfully deleted {deleted_count} file(s)"
        }
    
    # 新增 generate_presigned_put_url 方法
    def generate_presigned_put_url(self, file_name, expires_in_seconds=3600):
        try:
            presigned_url = self.client.presigned_put_object(
                self.bucket, 
                file_name, 
                expires=timedelta(seconds=expires_in_seconds)
            )
            return presigned_url
        except S3Error as e:
            logger.debug(f"Error generating presigned URL for file {file_name}: {str(e)}")
            return None

def setup_minio_client():
    # 输出所有环境变量及其值

    # 从环境变量中获取MinIO的access key、secret key和server URL
    minio_access_key = os.environ.get('MINIO_ACCESS_KEY')
    minio_secret_key = os.environ.get('MINIO_SECRET_KEY')
    MINIO_SERVER_ENDPOINT = os.environ.get('MINIO_SERVER_ENDPOINT')
    minio_bucket = os.environ.get('DEFAULT_BUCKET')

    # 检查所有必要的环境变量
    if not minio_access_key:
        raise ValueError("MINIO_ACCESS_KEY must be set in environment variables")

    if not minio_secret_key:
        raise ValueError("MINIO_SECRET_KEY must be set in environment variables")

    if not MINIO_SERVER_ENDPOINT:
        raise ValueError("MINIO_SERVER_ENDPOINT must be set in environment variables")

    if not minio_bucket:
        raise ValueError("DEFAULT_BUCKET must be set in environment variables")

    # 创建MinIO客户端
    minio_client = Minio(
        MINIO_SERVER_ENDPOINT,
        access_key=minio_access_key,
        secret_key=minio_secret_key,
        secure=False  # 在生产环境中，建议将 secure 设置为 True
    )

    # 确保存在一个指定的桶
    try:
        if not minio_client.bucket_exists(minio_bucket):
            minio_client.make_bucket(minio_bucket)
            logger.debug(f"Bucket '{minio_bucket}' created successfully.")
        else:
            print(f"Bucket '{minio_bucket}' already exists.")
    except S3Error as e:
        logger.debug(f"Error occurred while creating MinIO bucket '{minio_bucket}':", e)

    # 返回封装好的 Minio 客户端和 bucket
    return MinioClientWrapper(minio_client, minio_bucket)

