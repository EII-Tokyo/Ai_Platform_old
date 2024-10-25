import React, { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Input, LinearProgress, Typography } from '@mui/material';
import { Media } from '../interface';
import axios from 'axios';

interface UploadMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (uploadedFiles: Media[]) => void;
    currentPath: string;
    currentFolderId: string;
}

const UploadMediaModal: React.FC<UploadMediaModalProps> = ({ isOpen, onClose, onUpload , currentPath, currentFolderId}) => {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number>(0); // 进度状态
  const [isUploading, setIsUploading] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setProgress(0); // 重置进度
  };

  // 检查图片是否损坏
  const checkIfImageBroken = (file: File) => {
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(false); // 图片加载成功，不损坏
        img.onerror = () => resolve(true); // 图片加载失败，损坏
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(true); // 读取失败，视为损坏
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const validFiles = Array.from(files).filter((file) => {
      const validTypes = ["image/", "video/", ".avi"];
      const fileType = file.type;
      const fileName = file.name;

      // 检查文件类型是否合法
      if (
        validTypes.some(
          (type) => fileType.startsWith(type) || fileName.endsWith(".avi")
        )
      ) {
        return true; // 合法文件
      } else {
        console.error(`${fileName} 是不合法的文件类型`);
        return false; // 不合法文件
      }
    });

    if (validFiles.length > 0) {
      setIsUploading(true); // 开始上传状态
      uploadFiles(validFiles); // 开始上传文件
    } else {
      e.target.value = ""; // Reset the file input
    }
  };

  // 获取预签名 URL
  const getPresignedUrls = async (
    fileNames: string[]
  ): Promise<{ [key: string]: string }> => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/generate_presigned_urls/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: fileNames }),
        }
      );


      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      return data.presigned_urls;
    } catch (error) {
      console.error("Error fetching presigned URLs:", error);
      throw error;
    }
  };

  const uploadFiles = async (files: File[]) => {
    const totalFiles = files.length; // 使用到 totalFiles

    // 获取所有文件名
    const fileNames = files.map((file) => (currentPath + '/' + file.name).replace(/^\/+/, ''));

    // 获取预签名 URL
    const presignedUrls = await getPresignedUrls(fileNames);

    // 逐個上传文件
    let uploadedCount = 0;
    const promises = files.map(async (file) => {
      const minio_filename = (currentPath + '/' + file.name).replace(/^\/+/, '')
      const presignedUrl = presignedUrls[minio_filename];

      if (presignedUrl) {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl, true);

        xhr.onload = async () => {
          // 成功返回
          if (xhr.status === 200) {
            uploadedCount++;
            const progressValue = Math.min((uploadedCount / totalFiles) * 100, 100);
            setProgress(progressValue);
            if (uploadedCount === files.length) {
                setIsUploading(false); // 设置上传完成状态
            }
            
            // 如果上传完成，调用远程异步 API
            try {
                console.log(file)
                const metadata = {
                    name: file.name,         // 文件名
                    parent_id: currentFolderId, // parent文件的ID
                    full_path: currentPath,
                    type: file.type,         // 文件类型
                    size: file.size,         // 文件大小
                    lastModified: file.lastModified,  // 上次修改时间
                    minio_filename: minio_filename, // minio文件地址
                  };

                // 调用异步 API 并等待响应
                const upload_response = await axios.post(`${process.env.REACT_APP_API_URL}/api/upload_file`, metadata, {
                    headers: {
                        'Accept': 'application/json'
                    },
                });

                if (upload_response.status !== 200) {
                    throw new Error(`HTTP error! status: ${upload_response.status}`);
                }

              } catch (error) {
                console.error("远程API调用出错:", error);
              }
          }
        };

        xhr.onerror = () => {
          console.error("上传出错");
        };

        xhr.send(file);
      } else {
        console.error("找不到预签名 URL");
      }
    });

    // 等待所有文件上传完成
    await Promise.all(promises);

    // 1 秒后关闭对话框
    setTimeout(() => {
        onUpload([]);
        handleClose();  // 延迟关闭对话框
    }, 1000);
  };

  return (
    <div>
      <Button variant="outlined" onClick={handleClickOpen}>
        Upload Files
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Upload Files</DialogTitle>
        <DialogContent>
          <Input
            type="file"
            inputProps={{
              accept: "image/*,video/*,.avi",
              multiple: true,
            }}
            onChange={handleFileChange}
          />
          {isUploading && (
            <div style={{ marginTop: "20px" }}>
              <Typography variant="body2" color="textSecondary">
                Uploading...
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleClose} color="primary" disabled={isUploading}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default UploadMediaModal;