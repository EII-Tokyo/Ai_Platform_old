import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, CircularProgress, Pagination, Typography, Box, Chip, Checkbox,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Modal, TextField
} from '@mui/material';
import { ITaskRequest, Media, Model } from '../interface';
import UploadMediaModal from '../components/UploadMediaModal';
import RunWithModelModal from '../components/RunWithModelModal';
import UploadFolderModal from '../components/UploadFolderModal';
import FilePathDisplay from '../components/FilePathDisplay';
import axios from 'axios';

const MediaManagement = () => {
    const [mediaItems, setMediaItems] = useState<Media[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploadFolderModalOpen, setIsUploadFolderModalOpen] = useState(false);
    const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedMedias, setSelectedMedias] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
    const [isRunWithModelModalOpen, setIsRunWithModelModalOpen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [models, setModels] = useState<Model[]>([]);
    const [currentPath, setCurrentPath] = useState("/"); // 当前文件夹名
    const [currentFolderId, setCurrentFolderId] = useState<string>('root'); // 当前文件夹的ID
    const [flashingRow, setFlashingRow] = useState<string | null>(null); // 用于闪烁背景的行 ID

    const handleAddFolder = async (folderName: string, uploadTime: number) => {
        const newFolder: Media = {
            _id: `folder-${Date.now()}`, // 使用时间戳作为临时ID
            name: folderName,
            description: '', // 文件夹可以暂时没有描述
            original_filename: folderName,
            minio_filename: '', // 文件夹没有预览文件
            file_size: 0, // 文件夹没有文件大小
            content_type: '',
            vcodec: '',
            upload_time: uploadTime,
            parent_id: currentFolderId,
            media_type: 'folder', // 文件夹类型
            width: 0, // 文件夹没有分辨率
            height: 0,
            duration: 0, // 文件夹没有时长
            status: 'SUCCESS', // 文件夹上传成功
            progress: 100, // 文件夹上传完成
            celery_task_id: '', // 文件夹没有任务ID
            start_time: uploadTime, // 使用上传时间作为开始时间
            error_message: '', // 没有错误信息
            end_time: uploadTime, // 使用上传时间作为结束时间
        };
    
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/create_new_folder`, {
                name: folderName,
                description: '',
                upload_time: uploadTime,
                parent_id: currentFolderId, // 确保包含 parent_id
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 200) {
                setMediaItems((prevMediaItems) => [
                    { ...newFolder, _id: response.data.folder_id },
                    ...prevMediaItems
                ]);
            } else {
                console.error('Failed to create folder');
            }
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    };

    const fetchMediaItems = useCallback(async (folderId: string = 'root') => {
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/medias?limit=${limit}&page_num=${page}${folderId ? `&folder_id=${folderId}` : ''}`);
            if (response.ok) {
                const data = await response.json();
                setMediaItems(data.medias);
                setTotalPages(data.total_pages);
                setCurrentFolderId(folderId);
            } else {
                console.error('Failed to fetch media items');
            }
        } catch (error) {
            console.error('Error fetching media items:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, limit]);

    const fetchModels = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/models`);
            if (!response.ok) {
                const errorData = await response.json(); // Try to get error details from the response
                const errorMessage = errorData?.message || `Failed to fetch models: ${response.status}`;
                console.error(errorMessage);
                // You might want to display an error message to the user here
                return; // Or throw an error to be handled by a global error boundary
            }
            const data = await response.json();
            setModels(data);
        } catch (error) {
            console.error('Error fetching models:', error);
            // Handle the error (e.g., display a user-friendly message)
        }
    }, []);

    useEffect(() => {
        fetchMediaItems(currentFolderId);
        console.log('currentFolderId updated: ', currentFolderId);
        fetchModels();
    }, [fetchMediaItems, fetchModels, currentFolderId]);

    const handleRunWithModel = (media: Media) => {
        setSelectedMedia(media);
        setIsRunWithModelModalOpen(true);
    };

    const handleRunTask = async (params: ITaskRequest) => {
        if (!selectedMedia) return;

         if (params.media_type == 'folder') {
            console.log(params)
            console.log(currentFolderId)
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/get_medias_by_parent_id`, {
                folderId: params.media_id,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            console.log(response.data)
            
            for (let i=0; i<response.data.length; i++) {
                const item = response.data[i];
                console.log(item['name']);

                console.log(item);
                params.media_id = item._id;
                params.media_type = 'image';

                console.log(params)

                try {
                    setIsLoading(true);
                    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/run_yolo`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(params),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to run YOLO task');
                    }

                    setIsRunWithModelModalOpen(false);
                    window.location.href = '/';
                } catch (error) {
                    console.error('Error running task:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        }else {

            try {
                setIsLoading(true);
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/run_yolo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                });
    
                if (!response.ok) {
                    throw new Error('Failed to run YOLO task');
                }
    
                setIsRunWithModelModalOpen(false);
                window.location.href = '/';
            } catch (error) {
                console.error('Error running task:', error);
            } finally {
                setIsLoading(false);
            }try {
                setIsLoading(true);
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/run_yolo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                });
    
                if (!response.ok) {
                    throw new Error('Failed to run YOLO task');
                }
    
                setIsRunWithModelModalOpen(false);
                window.location.href = '/';
            } catch (error) {
                console.error('Error running task:', error);
            } finally {
                setIsLoading(false);
            }
        }

        
    };

    const handleNewFolder = () => {
        setIsNewFolderModalOpen(true);
    };

    const handleCreateFolder = async () => {
        if (newFolderName.trim()) {
            await handleAddFolder(newFolderName, Date.now());
            fetchMediaItems(currentFolderId); // Refresh the media items after adding the folder
            setNewFolderName('');
            setIsNewFolderModalOpen(false);
        }
    };

    const handleDeleteMedias = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/delete_medias`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ media_ids: selectedMedias }),
            });
            if (response.ok) {
                fetchMediaItems(currentFolderId);
                setSelectedMedias([]);
            } else {
                console.error('Failed to delete media items');
            }
        } catch (error) {
            console.error('Error deleting media items:', error);
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const handlePreviewMedia = (media: Media) => {
        setPreviewMedia(media);
        setIsPreviewModalOpen(true);
    };

    const formatFileSize = (size: number) => {
        if (size === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(size) / Math.log(k));
        return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 处理双击文件夹的逻辑
    const handleDoubleClickFolder = async (folder: Media) => {
        if (folder.media_type !== "folder") return;

        // 触发背景闪烁效果
        setFlashingRow(folder._id);
        setTimeout(() => setFlashingRow(null), 300); // 背景闪烁效果持续300毫秒

        // 更改当前文件夹名称和 ID
        setCurrentPath(folder.full_path ?? '');
        setCurrentFolderId(folder._id);
    };

    const handleNavigateToParent = async () => {

        if (currentFolderId !== '') {
            try {
                // 构建正确的 API 请求地址
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/get_parent_info_by_folder_id`, {
                    folderId: currentFolderId,
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (response.status === 200) {
                    // 确保 parent_id 存在，并且更新当前文件夹 ID
                    const parent_path = (response.data.parent_path || 'root') === 'root' ? '/' : response.data.parent_path;
                    setCurrentPath(parent_path);
                    fetchMediaItems(response.data.parent_id);
                } else {
                    // 处理后端返回的错误
                    console.error(`Failed to fetch parent folder. Status: ${response.status}`);
                }
            } catch (error) {
                console.error('Error fetching parent folder:', error);
            }
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h5" component="div">Media Management</Typography>
                    <FilePathDisplay filePath={currentPath}/>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleNavigateToParent}
                        disableElevation
                        sx={{ textTransform: "none", mr: 2 }}
                        disabled={currentFolderId === 'root'}
                    >
                        Parent
                    </Button>
                    {selectedMedias.length > 0 && (
                        <Button 
                            variant="outlined" 
                            color="error" 
                            onClick={() => setIsDeleteModalOpen(true)}
                            disableElevation
                            sx={{ mr: 2, textTransform: "none" }}
                        >
                            Delete Medias ({selectedMedias.length})
                        </Button>
                    )}
                    <UploadMediaModal
                        isOpen={isUploadModalOpen}
                        onClose={() => setIsUploadModalOpen(false)}
                        onUpload={() => fetchMediaItems(currentFolderId)}
                        currentPath={currentPath}
                        currentFolderId={currentFolderId}
                    />
                    <Button 
                        variant="outlined" 
                        color="secondary" 
                        onClick={() => setIsUploadFolderModalOpen(true)}
                        disableElevation
                        sx={{ ml: 2, textTransform: "none" }}
                    >
                        Upload Folder
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={handleNewFolder}
                        disableElevation
                        sx={{ ml: 2, textTransform: "none" }}
                    >
                        New Folder
                    </Button>
                </div>
            </div>
            {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="64">
                    <CircularProgress />
                </Box>
            ) : mediaItems.length === 0 ? (
                <Paper className="p-4 text-center">
                    <Typography variant="h6">No media items found</Typography>
                    <Typography variant="body1">Upload some media to get started</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={selectedMedias.length > 0 && selectedMedias.length < mediaItems.length}
                                        checked={mediaItems.length > 0 && selectedMedias.length === mediaItems.length}
                                        onChange={(event) => setSelectedMedias(event.target.checked ? mediaItems.map(item => item._id) : [])}
                                    />
                                </TableCell>
                                <TableCell>Preview</TableCell>
                                <TableCell>Filename</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Size</TableCell>
                                <TableCell>Upload Time</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {mediaItems.map((media: Media) => (
                                <TableRow
                                    key={media._id}
                                    hover
                                    sx={{
                                    "&:hover": { backgroundColor: "#e0f7fa" },
                                    backgroundColor:
                                        flashingRow === media._id ? "#ffeb3b" : "inherit",
                                    }}
                                    onDoubleClick={() => handleDoubleClickFolder(media)} // 双击事件
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedMedias.includes(media._id)}
                                            onChange={() => setSelectedMedias(prev => prev.includes(media._id) ? prev.filter(item => item !== media._id) : [...prev, media._id])}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {media.media_type === 'folder' ? (
                                            <img
                                                src={`${process.env.REACT_APP_API_URL}/yolo-files/folder_blue.png`} alt={media.original_filename} style={{ width: '100px', height: '100px', objectFit: 'contain', cursor: 'pointer', backgroundColor: '#ffffff' }} />
                                        ) : media.media_type === 'image' ? (
                                            <img
                                                src={`${process.env.REACT_APP_API_URL}/yolo-files/${media.minio_filename}`}
                                                alt={media.name}
                                                style={{ width: '100px', height: '100px', objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => media.media_type !== 'folder' && handlePreviewMedia(media)}
                                            />
                                        ) : media.media_type === 'video' ? (
                                            <video
                                                src={`${process.env.REACT_APP_API_URL}/yolo-files/${media.minio_filename}`}
                                                style={{ width: '100px', height: '100px', objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => media.media_type !== 'folder' && handlePreviewMedia(media)}
                                            />
                                        ) : null}
                                    </TableCell>
                                    <TableCell>{media.original_filename}</TableCell>                                  
                                    <TableCell>
                                        <Chip
                                            label={media.media_type}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>{media.file_size ? `${(media.file_size / 1024 / 1024).toFixed(2)} MB` : ''}</TableCell>
                                    <TableCell>{media.upload_time ? new Date(media.upload_time).toLocaleString() : ''}</TableCell>
                                    <TableCell>
                                        <Button 
                                            variant="contained" 
                                            color="primary" 
                                            size="small"
                                            onClick={() => handleRunWithModel(media)}
                                            disableElevation
                                            sx={{ textTransform: "none" }}
                                        >
                                            Run with Model
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Box display="flex" justifyContent="end" mt={4}>
                <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={(_, value) => setPage(value)} 
                />
            </Box>


            <UploadFolderModal
                isOpen={isUploadFolderModalOpen}
                onClose={() => setIsUploadFolderModalOpen(false)}
                onUpload={fetchMediaItems}
                allowFoldersOnly={true}
            />

            <Dialog
                open={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
            >
                <DialogTitle>{"Confirm Deletion"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete {selectedMedias.length} selected media items? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDeleteModalOpen(false)} color="primary" disableElevation sx={{ textTransform: "none" }}>
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteMedias} color="error" autoFocus disableElevation sx={{ textTransform: "none" }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={isNewFolderModalOpen}
                onClose={() => setIsNewFolderModalOpen(false)}
            >
                <DialogTitle>Create Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Folder Name"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsNewFolderModalOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleCreateFolder} color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

            <Modal
                open={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                aria-labelledby="preview-modal-title"
                aria-describedby="preview-modal-description"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    maxHeight: '80%',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    overflow: 'auto'
                }}>
                    <Typography id="preview-modal-title" variant="h6" component="h2">
                        Media Preview
                    </Typography>
                    {previewMedia && (
                        <Box sx={{ mt: 2 }}>
                            {previewMedia.media_type === 'image' ? (
                                <img
                                    src={`${process.env.REACT_APP_API_URL}/yolo-files/${previewMedia.minio_filename}`}
                                    alt={previewMedia.name}
                                    style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                                />
                            ) : (
                                <video
                                    src={`${process.env.REACT_APP_API_URL}/yolo-files/${previewMedia.minio_filename}`}
                                    controls
                                    style={{ maxWidth: '100%', maxHeight: '500px' }}
                                />
                            )}
                            <Typography variant="body1" sx={{ mt: 2 }}>
                                Name: {previewMedia.name}
                            </Typography>
                            <Typography variant="body1">
                                Description: {previewMedia.description || 'No description'}
                            </Typography>
                            <Typography variant="body1">
                                Type: {previewMedia.media_type}
                            </Typography>
                            <Typography variant="body1">
                                Size: {formatFileSize(previewMedia.file_size)}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Modal>
            <RunWithModelModal
                isOpen={isRunWithModelModalOpen}
                onClose={() => setIsRunWithModelModalOpen(false)}
                media={selectedMedia}
                models={models}
                onRunTask={handleRunTask}
            />
        </div>
    );
};

export default MediaManagement;