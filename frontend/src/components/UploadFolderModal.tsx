import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';

interface UploadFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (folderName: string, uploadTime: number) => void;
  allowFoldersOnly?: boolean;
}

const UploadFolderModal: React.FC<UploadFolderModalProps> = ({ isOpen, onClose, onUpload, allowFoldersOnly }) => {

  const [files, setFiles] = useState<File[] | null>(null);
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [totalFilesUploaded, setTotalFilesUploaded] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadComplete, setIsUploadComplete] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setFiles(null);
    setIsConfirmStep(false);
    setTotalFilesUploaded(null);
    setIsUploading(false);
    setIsUploadComplete(false);
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file =>
        file.type.startsWith('image/')
      );

    // 提取文件夹名称
    if (selectedFiles.length > 0) {
        const firstFile = selectedFiles[0];
        const folderPath = firstFile.webkitRelativePath || firstFile.name;
        const extractedFolderName = folderPath.split('/')[0]; // 提取文件夹名称
        setFolderName(extractedFolderName);  // 保存文件夹名称
    }

      setFiles(selectedFiles);
      setIsConfirmStep(true);
    }
  };

  // 获取预签名 URL
  const getPresignedUrls = async (
    fileNames: string[]
  ): Promise<{ [key: string]: string }> => {
    try {
      console.log("predesigned URL : ", fileNames);
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

  const handleConfirmUpload = async () => {
    if (files) {
      setIsUploading(true); // 设置上传状态
      setTotalFilesUploaded(null); // 重置已上传文件数
      setIsUploadComplete(false); // 重置上传完成状态

      // 获取所有文件名
      const fileNames = files.map((file) => file.webkitRelativePath || file.name);

      // 获取预签名 URL
      const presignedUrls = await getPresignedUrls(fileNames);

      // 逐個上传文件
      let uploadedCount = 0;
      const promises = files.map(async (file) => {
        const presignedUrl = presignedUrls[file.webkitRelativePath || file.name];

        if (presignedUrl) {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignedUrl, true);

          xhr.onload = () => {
            if (xhr.status === 200) {
              uploadedCount++;
              setTotalFilesUploaded(uploadedCount); // 更新上传计数
              if (uploadedCount === files.length) {
                setIsUploadComplete(true); // 设置上传完成状态
              }
            }
          };

          xhr.onerror = () => {
            console.error('上传出错');
          };

          xhr.send(file);
        } else {
          console.error('找不到预签名 URL');
        }
      });

      // 等待所有文件上传完成
      await Promise.all(promises);

      // 使用提取到的 folderName 进行处理
      const uploadTime = Math.floor(Date.now() / 1000);
      onUpload(folderName || 'UnknownFolder', uploadTime);  // 使用 folderName
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="upload-folder-modal-title"
      aria-describedby="upload-folder-modal-description"
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4
      }}>
        {!isConfirmStep && !isUploading ? (
          <>
            <Typography id="upload-folder-modal-title" variant="h6" component="h2">
              Upload Folder
            </Typography>
            <Typography id="upload-folder-modal-description" sx={{ mt: 2 }}>
              Select a folder to upload. Only image and video files will be uploaded.
            </Typography>
            <input
              type="file"
              onChange={handleFolderChange}
              style={{ marginTop: '16px' }}
              {...(allowFoldersOnly ? { directory: '', webkitdirectory: '' } : {})}
            />
            <Button onClick={onClose} variant="contained" sx={{ mt: 3 }}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Typography id="upload-folder-modal-title" variant="h6" component="h2">
              {isUploading ? (isUploadComplete ? 'All files uploaded' : 'Uploading Files') : 'Confirm Upload'}
            </Typography>

            {/* 在上传完成后显示上传文件总数 */}
            {totalFilesUploaded !== null && (
              <Typography sx={{ mt: 2 }}>
                Total files uploaded: {totalFilesUploaded}
              </Typography>
            )}

            <Typography id="upload-folder-modal-description" sx={{ mt: 2 }}>
              {isUploading
                ? isUploadComplete
                  ? 'All files uploaded.'
                  : 'Uploading your files, please wait...'
                : `You have selected ${files?.length} files. Do you want to proceed with the upload?`}
            </Typography>

            {!isUploading && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button onClick={handleConfirmUpload} variant="contained">
                  Confirm
                </Button>
                <Button onClick={() => setIsConfirmStep(false)} variant="outlined">
                  Cancel
                </Button>
              </Box>
            )}

            {/* 上传完成后确认按钮 */}
            {isUploading && totalFilesUploaded === files?.length && (
              <Button onClick={onClose} variant="contained" sx={{ mt: 3 }}>
                Close
              </Button>
            )}
          </>
        )}
      </Box>
    </Modal>
  );
};

export default UploadFolderModal;