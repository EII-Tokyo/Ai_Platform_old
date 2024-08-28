import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, CircularProgress, Pagination, Typography, Box, Chip, Checkbox,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Modal
} from '@mui/material';
import { ITaskRequest, Media, Model } from '../interface';
import UploadMediaModal from '../components/UploadMediaModal';
import RunWithModelModal from '../components/RunWithModelModal';

const MediaManagement = () => {
    const [mediaItems, setMediaItems] = useState<Media[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedMedias, setSelectedMedias] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
    const [isRunWithModelModalOpen, setIsRunWithModelModalOpen] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [models, setModels] = useState<Model[]>([]);

    const handleRunWithModel = (media: Media) => {
        setSelectedMedia(media);
        setIsRunWithModelModalOpen(true);
    };

    const handleRunTask = async (params: ITaskRequest) => {
        if (!selectedMedia) return;

        try {
            setIsLoading(true);
            console.log(params);
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
            setIsLoading(false);
            window.location.href = '/';
        } catch (error) {
            console.error('Error running task:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            fetchMediaItems();
        }, 2000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        fetchMediaItems();
        fetchModels();
        setIsLoading(false);
    }, [page, limit]);

    const fetchModels = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/models`);
            if (response.ok) {
                const data = await response.json();
                setModels(data);
            } else {
                console.error('Failed to fetch models');
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    };

    const fetchMediaItems = async () => {       
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/medias?limit=${limit}&page_num=${page}`);
            const data = await response.json();
            setMediaItems(data.medias);
            setTotalPages(data.total_pages);
        } catch (error) {
            console.error('Error fetching media items:', error);
        }
    };

    const formatTimestamp = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const formatFileSize = (bytes: number): string => {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const formatDuration = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        const pad = (num: number): string => num.toString().padStart(2, '0');
        
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'warning';
            case 'SUCCESS':
                return 'success';
            case 'RUNNING':
                return 'info';
            case 'FAILURE':
            case 'REVOKED':
                return 'error';
            default:
                return 'default';
        }
    };

    const handleSelectMedia = (id: string) => {
        setSelectedMedias(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedMedias(mediaItems.map(item => item._id));
        } else {
            setSelectedMedias([]);
        }
    };

    const handleDeleteMedias = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/delete_medias`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedMedias),
            });
            if (response.ok) {
                const result = await response.json();
                fetchMediaItems();
                setSelectedMedias([]);
            } else {
                console.error('Failed to delete media items');
            }
        } catch (error) {
            console.error('Error deleting media items:', error);
        }
        setIsDeleteModalOpen(false);
    };

    const handlePreviewMedia = (media: Media) => {
        setPreviewMedia(media);
        setIsPreviewModalOpen(true);
    };

    const CircularProgressWithLabel = (props: { value: number; status: string }) => {
        return (
            <Box position="relative" display="inline-flex">
                <CircularProgress
                    variant="determinate"
                    value={props.value}
                    color={getStatusColor(props.status) as "success" | "error" | "warning" | "info" | "inherit"}
                />
                <Box
                    top={0}
                    left={0}
                    bottom={0}
                    right={0}
                    position="absolute"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Typography variant="caption" component="div" color="textSecondary">
                        {`${Math.round(props.value)}%`}
                    </Typography>
                </Box>
            </Box>
        );
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-semibold">Media Management</div>
                <div>
                    {selectedMedias.length > 0 && (
                        <Button 
                            variant="contained" 
                            color="error" 
                            onClick={() => setIsDeleteModalOpen(true)}
                            disableElevation
                            sx={{ mr: 2, textTransform: "none" }}
                        >
                            Delete Medias ({selectedMedias.length})
                        </Button>
                    )}
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => setIsUploadModalOpen(true)}
                        disableElevation
                        sx={{ textTransform: "none" }}
                    >
                        Upload File
                    </Button>
                </div>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <CircularProgress />
                </div>
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
                                        onChange={handleSelectAllMedia}
                                    />
                                </TableCell>
                                <TableCell>Preview</TableCell>
                                <TableCell>Filename</TableCell>                               
                                <TableCell>Media Type</TableCell>
                                <TableCell>Resolution</TableCell>
                                <TableCell>Duration</TableCell>
                                <TableCell>Origin File Size</TableCell>
                                <TableCell>Origin Content Type</TableCell>
                                <TableCell>Upload Time</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {mediaItems.map((media: Media) => (
                                <TableRow key={media._id}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedMedias.includes(media._id)}
                                            onChange={() => handleSelectMedia(media._id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {media.media_type === 'image' ? (
                                            <img
                                                src={`${process.env.REACT_APP_API_URL}/yolo-files/${media.minio_filename}`}
                                                alt={media.name}
                                                style={{ width: '100px', height: '100px', objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => handlePreviewMedia(media)}
                                            />
                                        ) : (
                                            <video
                                                src={`${process.env.REACT_APP_API_URL}/yolo-files/${media.minio_filename}`}
                                                style={{ width: '100px', height: '100px', objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => handlePreviewMedia(media)}
                                            />
                                        )}
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
                                    <TableCell>{media.width} x {media.height}</TableCell>
                                    <TableCell>{media.media_type === "video" ? formatDuration(media.duration) : ''}</TableCell>
                                    <TableCell>{formatFileSize(media.file_size)}</TableCell>
                                    <TableCell>{media.content_type}</TableCell>
                                    <TableCell>{formatTimestamp(media.upload_time)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={media.status}
                                            size="small"
                                            color={getStatusColor(media.status)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <CircularProgressWithLabel value={media.progress || 0} status={media.status} />
                                    </TableCell>
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

            <div className="flex justify-end mt-4">
                <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={(_, value) => setPage(value)} 
                />
            </div>

            <UploadMediaModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={fetchMediaItems}
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