import React, { useState, useEffect, useRef } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, Modal, Box, TextField, CircularProgress, Pagination, Select, MenuItem, Typography,
    FormControl, InputLabel, Checkbox, FormControlLabel, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
    Chip
} from '@mui/material';
import { Task, CreateTaskInput, Model } from '../interface';
import CreateTaskModal from '../components/CreateTaskModal';
import RerunTaskModal from '../components/RerunTaskModal';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const Test = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [isRerunModalOpen, setIsRerunModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
    const [taskToTerminate, setTaskToTerminate] = useState<Task | null>(null);
    const [models, setModels] = useState<Model[]>([]);
    const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
    const [fullscreenImageSrc, setFullscreenImageSrc] = useState('');
    const [isFullscreenMediaOpen, setIsFullscreenMediaOpen] = useState(false);
    const [fullscreenMediaSrc, setFullscreenMediaSrc] = useState('');
    const [fullscreenMediaType, setFullscreenMediaType] = useState<'image' | 'video'>('image');
    const videoRef = useRef(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleOpenDeleteModal = () => {
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
    };

    const handleConfirmDelete = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/delete_tasks`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedTasks),
            });
            if (response.ok) {
                setSelectedTasks([]);
                await fetchTasks();
            } else {
                console.error('Failed to delete tasks');
            }
        } catch (error) {
            console.error('Error deleting tasks:', error);
        }
        handleCloseDeleteModal();
    };

    const getModelName = (modelId: string) => {
        const model = models.find(m => m._id === modelId);
        return model ? model.name : 'Model Deleted!!!';
    };

    const handleOpenFullscreenImage = (imageSrc: string) => {
        setFullscreenImageSrc(imageSrc);
        setIsFullscreenImageOpen(true);
    };

    const handleCloseFullscreenImage = () => {
        setIsFullscreenImageOpen(false);
        setFullscreenImageSrc('');
    };

    const handleOpenFullscreenMedia = (mediaSrc: string, mediaType: 'image' | 'video') => {
        setFullscreenMediaSrc(mediaSrc);
        setFullscreenMediaType(mediaType);
        setIsFullscreenMediaOpen(true);
    };

    const handleCloseFullscreenMedia = () => {
        setIsFullscreenMediaOpen(false);
        setFullscreenMediaSrc('');
        setFullscreenMediaType('image');
    };

    useEffect(() => {
        let player: any;
        if (isFullscreenMediaOpen && fullscreenMediaType === 'video' && videoRef.current) {
            player = videojs(videoRef.current, {
                controls: true,
                autoplay: false,
                preload: 'auto',
            });
        }
        return () => {
            if (player) {
                player.dispose();
            }
        };
    }, [isFullscreenMediaOpen, fullscreenMediaType]);

    useEffect(() => {
        fetchTasks();
        fetchModels();
    }, [page, limit]);

    const handleDownload = (fileUrl: string, fileName: string) => {
        fetch(fileUrl)
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(() => console.error('Error downloading the file'));
    };

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

    const formatTimestamp = (timestamp: number | null): string => {
        if (!timestamp) return '-';
        return new Date(timestamp * 1000).toLocaleString();
    };

    useEffect(() => {
        const intervalId = setInterval(fetchTasks, 1000); // Fetch tasks every second
        return () => clearInterval(intervalId);
    }, [page, limit]);

    const fetchTasks = async () => {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tasks?limit=${limit}&page_num=${page}`);
        const data = await response.json();
        setTasks(data.tasks);
        setTotalPages(data.total_pages);
    };

    const handleRerun = (task: Task) => {
        setSelectedTask(task);
        setIsRerunModalOpen(true);
    };

    const handleOpenTerminateModal = (task: Task) => {
        setTaskToTerminate(task);
        setIsTerminateModalOpen(true);
    };

    const handleCloseTerminateModal = () => {
        setIsTerminateModalOpen(false);
        setTaskToTerminate(null);
    };

    const handleConfirmTerminate = async () => {
        if (taskToTerminate) {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/terminate_task/${taskToTerminate.celery_task_id}`, {
                    method: 'POST',
                });
                if (response.ok) {
                    await fetchTasks();
                } else {
                    console.error('Failed to terminate task');
                }
            } catch (error) {
                console.error('Error terminating task:', error);
            }
        }
        handleCloseTerminateModal();
    };

    const handleSelectTask = (taskId: string) => {
        setSelectedTasks(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const handleSelectAllTasks = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedTasks(tasks.map(task => task._id));
        } else {
            setSelectedTasks([]);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SUCCESS':
                return 'green';
            case 'FAILURE':
                return 'red';
            case 'PENDING':
                return 'orange';
            case 'RUNNING':
                return 'blue';
            case 'REVOKED':
                return 'grey';
            default:
                return 'grey';
        }
    };

    const getProgressColor = (status: string) => {
        switch (status) {
            case 'SUCCESS':
                return 'success';
            case 'FAILURE':
                return 'error';
            case 'PENDING':
                return 'warning';
            case 'RUNNING':
                return 'info';
            case 'REVOKED':
                return 'inherit';
            default:
                return 'inherit';
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-semibold">
                    TEST
                </div>
                <div>
                    {selectedTasks.length > 0 && (
                        <Button
                            variant='contained'
                            sx={{ textTransform: "none" }}
                            disableElevation
                            onClick={handleOpenDeleteModal}
                            color="error"
                        >
                            Delete Selected ({selectedTasks.length})
                        </Button>
                    )}
                    <Button variant='contained' sx={{ textTransform: "none", marginLeft: "8px" }} disableElevation onClick={() => setIsAddModalOpen(true)}>Add Task</Button>
                </div>
            </div>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selectedTasks.length > 0 && selectedTasks.length < tasks.length}
                                    checked={tasks.length > 0 && selectedTasks.length === tasks.length}
                                    onChange={handleSelectAllTasks}
                                />
                            </TableCell>
                            <TableCell>Media Name</TableCell>
                            <TableCell>Media</TableCell>
                            <TableCell>Model Name</TableCell>
                            <TableCell>Detect Classes</TableCell>
                            <TableCell>Conf</TableCell>
                            <TableCell>Image Size</TableCell>
                            <TableCell>Augment</TableCell>
                            <TableCell>Insert Time</TableCell>
                            <TableCell>Start Time</TableCell>
                            <TableCell>End Time</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Progress</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tasks.map((task: Task) => (
                            <TableRow key={task._id}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectedTasks.includes(task._id)}
                                        onChange={() => handleSelectTask(task._id)}
                                    />
                                </TableCell>
                                <TableCell>{task.original_filename}</TableCell>
                                <TableCell>
                                    {task.media_type === 'image' ? (
                                        <img
                                            src={`${process.env.REACT_APP_API_URL}/yolo-files/${task.minio_filename}`}
                                            alt="Task input"
                                            style={{ width: '180px', height: '120px', objectFit: 'cover', cursor: 'pointer' }}
                                            onClick={() => handleOpenFullscreenMedia(`${process.env.REACT_APP_API_URL}/yolo-files/${task.minio_filename}`, 'image')}
                                        />
                                    ) : (
                                        <video
                                            src={`${process.env.REACT_APP_API_URL}/yolo-files/${task.minio_filename}`}
                                            style={{ width: '180px', height: '120px', objectFit: 'cover', cursor: 'pointer' }}
                                            onClick={() => handleOpenFullscreenMedia(`${process.env.REACT_APP_API_URL}/yolo-files/${task.minio_filename}`, 'video')}
                                            controls
                                        />
                                    )}
                                </TableCell>
                                <TableCell sx={{ color: getModelName(task.model_id) === "Model Deleted!!!" ? "red" : "black" }} >{getModelName(task.model_id)}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {task.detect_classes && task.detect_classes.map((className, index) => (
                                            <Chip
                                                key={index}
                                                label={className}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </TableCell>
                                <TableCell>{task.conf}</TableCell>
                                <TableCell>{`${task.width}x${task.height}`}</TableCell>
                                <TableCell>{task.augment ? 'Yes' : 'No'}</TableCell>
                                <TableCell>{formatTimestamp(task.inserted_time)}</TableCell>
                                <TableCell>{task.start_time ? formatTimestamp(task.start_time) : '-'}</TableCell>
                                <TableCell>{task.end_time ? formatTimestamp(task.end_time) : '-'}</TableCell>
                                <TableCell>
                                    <Typography style={{ color: getStatusColor(task.status) }}>
                                        {task.status}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box position="relative" display="inline-flex">
                                        <CircularProgress
                                            variant="determinate"
                                            value={task.progress || 0}
                                            color={getProgressColor(task.status) as "success" | "error" | "warning" | "info" | "inherit"}
                                        // sx={{
                                        //     color: (theme) =>
                                        //         theme.palette.grey[theme.palette.mode === 'light' ? 200 : 800],
                                        // }}
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
                                                {`${Math.round(task.progress || 0)}%`}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Button sx={{ textTransform: "none", marginRight: "8px", marginBottom: "4px" }} variant="contained" disableElevation size="small" onClick={() => { setSelectedTask(task); setIsResultModalOpen(true); }}>
                                        View Result
                                    </Button>
                                    <Button sx={{ textTransform: "none", marginRight: "8px", marginBottom: "4px" }} variant="contained" disableElevation size="small" onClick={() => handleRerun(task)}>Rerun</Button>
                                    {task.status !== 'SUCCESS' && task.status !== 'FAILURE' && task.status !== 'REVOKED' && (
                                        <Button sx={{ textTransform: "none", marginRight: "8px" }} variant="contained" disableElevation size="small" onClick={() => handleOpenTerminateModal(task)} color="error">
                                            Terminate
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <div className="flex justify-end mt-4 items-center">
                <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} />
                <Select sx={{ "& .MuiOutlinedInput-input": { padding: "8px 12px" } }} value={limit} onChange={(e: any) => setLimit(e.target.value as number)}>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                </Select>
            </div>

            <Modal open={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} keepMounted>
                <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg w-3/4 max-h-3/4 overflow-y-auto">
                    {selectedTask && (
                        <div className="space-y-4">
                            <div className="text-2xl mb-4 font-bold">Params</div>
                            <div className="grid grid-cols-3 gap-24 mt-2">
                                <div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Task Id</div>
                                        <div className='text-base'>{selectedTask.celery_task_id}</div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Media Name</div>
                                        <div className='text-base'>{selectedTask.original_filename}</div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Model Name</div>
                                        <div className='text-base'>{getModelName(selectedTask.model_id)}</div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Detect Classes</div>
                                        <div className='text-base' style={{ flex: "0 0 50%" }}>{selectedTask.detect_classes && selectedTask.detect_classes.map((className, index) => (
                                            <Chip
                                                key={index}
                                                label={className}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ marginRight: '4px' }}
                                            />
                                        ))}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Conf</div>
                                        <div className='text-base'>{selectedTask.conf}</div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Image Size</div>
                                        <div className='text-base'>{selectedTask.width}x{selectedTask.height}</div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Augment</div>
                                        <div className='text-base'>{selectedTask.augment ? 'Yes' : 'No'}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Insert Time</div>
                                        <div className='text-base'>{formatTimestamp(selectedTask.inserted_time)}</div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>Start Time</div>
                                        <div className='text-base'>{selectedTask.start_time ? formatTimestamp(selectedTask.start_time) : '-'}</div>
                                    </div>
                                    <div className='flex justify-between mb-2'>
                                        <div className='text-sm text-gray-600'>End Time</div>
                                        <div className='text-base'>{selectedTask.end_time ? formatTimestamp(selectedTask.end_time) : '-'}</div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-2xl font-bold">Result</div>
                                    {selectedTask.result_file &&
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            sx={{ mt: 2, textTransform: "none" }}
                                            onClick={() => handleDownload(`${process.env.REACT_APP_API_URL}/yolo-files/${selectedTask.result_file}`, selectedTask.result_file)}
                                            disableElevation
                                        >
                                            Download Result
                                        </Button>
                                    }
                                </div>
                                {selectedTask.result_file ? (
                                    <div className="mt-2 flex items-center justify-center">
                                        {selectedTask.media_type === 'image' ? (
                                            <img
                                                src={`${process.env.REACT_APP_API_URL}/yolo-files/${selectedTask.result_file}`}
                                                alt="Task result"
                                                style={{ maxWidth: '100%', maxHeight: '400px', cursor: 'pointer', borderRadius: '8px', objectFit: 'contain' }}
                                                onClick={() => handleOpenFullscreenImage(`${process.env.REACT_APP_API_URL}/yolo-files/${selectedTask.result_file}`)}
                                            />
                                        ) : (
                                            <video
                                                src={`${process.env.REACT_APP_API_URL}/yolo-files/${selectedTask.result_file}`}
                                                controls
                                                style={{ maxWidth: '100%', maxHeight: '400px', cursor: 'pointer', borderRadius: '8px', objectFit: 'contain' }}
                                                onClick={() => handleOpenFullscreenMedia(`${process.env.REACT_APP_API_URL}/yolo-files/${selectedTask.result_file}`, 'video')}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className='flex items-center justify-center text-gray-600 text-2xl'>No result available</div>
                                )}
                            </div>
                        </div>
                    )}
                </Box>
            </Modal>

            <Modal
                open={isFullscreenImageOpen}
                onClose={handleCloseFullscreenImage}
                className="flex items-center justify-center"
            >
                <Box className="relative bg-black w-full h-full flex items-center justify-center">
                    <img
                        src={fullscreenImageSrc}
                        alt="Fullscreen result"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                    <Button
                        onClick={handleCloseFullscreenImage}
                        sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.7)',
                            },
                            textTransform: "none"
                        }}
                        disableElevation
                    >
                        Close
                    </Button>
                </Box>
            </Modal>

            <Modal
                open={isFullscreenMediaOpen}
                onClose={handleCloseFullscreenMedia}
                className="flex items-center justify-center"
            >
                <Box className="relative bg-black w-full h-full flex items-center justify-center">
                    {fullscreenMediaType === 'image' ? (
                        <img
                            src={fullscreenMediaSrc}
                            alt="Fullscreen result"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <div data-vjs-player style={{ width: '100%', height: '100%' }}>
                            <video
                                ref={videoRef}
                                className="video-js vjs-big-play-centered"
                                style={{ width: '100%', height: '100%' }}
                                controls
                            >
                                <source src={fullscreenMediaSrc} type="video/mp4" />
                            </video>
                        </div>
                    )}
                    <Button
                        onClick={handleCloseFullscreenMedia}
                        sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            color: 'white',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.7)',
                            },
                            textTransform: "none"
                        }}
                        disableElevation
                    >
                        Close
                    </Button>
                </Box>
            </Modal>

            <Dialog
                open={isTerminateModalOpen}
                onClose={handleCloseTerminateModal}
                aria-labelledby="terminate-dialog-title"
            >
                <DialogTitle id="terminate-dialog-title">
                    Terminate Task
                    <Button
                        aria-label="close"
                        onClick={handleCloseTerminateModal}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                            textTransform: "none"
                        }}
                        disableElevation
                    >
                        ×
                    </Button>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to terminate this task?
                    </Typography>
                    {taskToTerminate && (
                        <Box mt={2}>
                            <Typography variant="subtitle2">Task Details:</Typography>
                            <Typography>ID: {taskToTerminate.celery_task_id}</Typography>
                            <Typography>Status: {taskToTerminate.status}</Typography>
                            <Typography>Progress: {Math.round(taskToTerminate.progress || 0)}%</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseTerminateModal} color="primary" disableElevation sx={{ textTransform: "none" }}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmTerminate} color="error" variant="contained" disableElevation sx={{ textTransform: "none" }}>
                        Terminate
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={isDeleteModalOpen}
                onClose={handleCloseDeleteModal}
                aria-labelledby="delete-dialog-title"
            >
                <DialogTitle id="delete-dialog-title">
                    Delete Tasks
                    <Button
                        aria-label="close"
                        onClick={handleCloseDeleteModal}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                            textTransform: "none"
                        }}
                        disableElevation
                    >
                        ×
                    </Button>
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete {selectedTasks.length} selected task{selectedTasks.length > 1 ? 's' : ''}?
                    </Typography>
                    <Typography variant="caption" color="error">
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteModal} color="primary" disableElevation sx={{ textTransform: "none" }}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" disableElevation sx={{ textTransform: "none" }}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <CreateTaskModal
                isAddModalOpen={isAddModalOpen}
                setIsAddModalOpen={setIsAddModalOpen}
                fetchTasks={fetchTasks}
                models={models}
            />

            <RerunTaskModal
                isOpen={isRerunModalOpen}
                onClose={() => setIsRerunModalOpen(false)}
                selectedTask={selectedTask}
                fetchTasks={fetchTasks}
                models={models}
            />
        </div>
    );
};

export default Test;