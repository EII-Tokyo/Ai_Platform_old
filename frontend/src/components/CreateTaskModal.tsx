import React, { useState, useEffect } from 'react';
import {
    Button, Modal, Box, TextField, CircularProgress, Select, MenuItem,
    FormControl, InputLabel, Checkbox, FormControlLabel, Snackbar, Alert
} from '@mui/material';
import { CreateTaskInput, Model, Media, ITaskRequest } from '../interface';

const CreateTaskModal = ({
    fetchTasks,
    isAddModalOpen,
    setIsAddModalOpen,
    models
}: {
    fetchTasks: () => void,
    isAddModalOpen: boolean,
    setIsAddModalOpen: (isOpen: boolean) => void,
    models: Model[]
}) => {
    const [newTask, setNewTask] = useState<ITaskRequest>({
        media_id: '',
        media_type: 'image',
        model_id: '',
        conf: 0.25,
        width: 1920,
        height: 1088,
        augment: false,
        detect_classes: [] as string[],
        detect_class_indices: [] as number[]
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [medias, setMedias] = useState<Media[]>([]);

    useEffect(() => {
        if (models.length > 0 && !newTask.model_id) {
            setNewTask(prev => ({
                ...prev,
                model_id: models[0]._id,
                detect_classes: models[0].default_detect_classes
            }));
        }
    }, [models]);

    useEffect(() => {
        fetchMedias();
    }, []);

    const fetchMedias = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/all-medias`);
            if (!response.ok) {
                throw new Error('Failed to fetch medias');
            }
            const data = await response.json();
            setMedias(data);
        } catch (error) {
            console.error('Error fetching medias:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    };

    const handleAddTask = async (taskData: ITaskRequest & { detect_classes: string[] }) => {
        try {
            setIsLoading(true);
            setError(null);

            if (!taskData.media_id) {
                throw new Error('No media selected for new task');
            }

            // Convert selected class names to their indices
            const selectedModel = models.find(model => model._id === taskData.model_id);
            const detectClassIndices = taskData.detect_classes.map(className =>
                selectedModel?.classes.indexOf(className)
            ).filter(index => index !== -1) as number[];

            const runResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/run_yolo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    media_id: taskData.media_id,
                    media_type: taskData.media_type,
                    model_id: taskData.model_id,
                    conf: taskData.conf,
                    width: taskData.width,
                    height: taskData.height,
                    augment: taskData.augment,
                    detect_classes: taskData.detect_classes,
                    detect_class_indices: detectClassIndices
                }),
            });

            if (!runResponse.ok) {
                throw new Error('Failed to run YOLO task');
            }

            setIsAddModalOpen(false);
            await fetchTasks();
        } catch (error) {
            console.error('Error adding task:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleModelChange = (modelId: string) => {
        const selectedModel = models.find(model => model._id === modelId);
        setNewTask(prev => ({
            ...prev,
            model_id: modelId,
            detect_classes: selectedModel ? selectedModel.default_detect_classes : []
        }));
    };

    const handleClassToggle = (className: string) => {
        setNewTask(prev => {
            const selectedModel = models.find(model => model._id === prev.model_id);
            if (!selectedModel) return prev;

            let newClasses: string[];
            if (prev.detect_classes.includes(className)) {
                newClasses = prev.detect_classes.filter(c => c !== className);
            } else {
                newClasses = [...prev.detect_classes, className];
            }
            
            // Sort the newClasses array to match the order in the model's class list
            newClasses.sort((a, b) => {
                const indexA = selectedModel.classes.indexOf(a);
                const indexB = selectedModel.classes.indexOf(b);
                return indexA - indexB;
            });

            return {
                ...prev,
                detect_classes: newClasses
            };
        });
    };

    const selectedModel = models.find(model => model._id === newTask.model_id);

    const handleMediaChange = (mediaId: string, mediaType: 'image' | 'video') => {
        setNewTask(prev => ({
            ...prev,
            media_id: mediaId,
            media_type: mediaType
        }));
    };

    return (
        <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <div className="mb-6 text-2xl font-bold">Add New Task</div>
                <div className='flex flex-col gap-8'>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Select Media</div>
                        <FormControl className='basis-3/4' size="small">
                            <InputLabel>Media</InputLabel>
                            <Select
                                label="Media"
                                value={newTask.media_id}
                                onChange={(e) => handleMediaChange(e.target.value as string, medias.find(m => m._id === e.target.value)?.media_type as 'image' | 'video')}
                                disabled={isLoading}
                                // sx={{ "& .MuiOutlinedInput-input": { padding: "12px 14px 12px 32px" } }}
                            >
                                {medias.map(media => (
                                    <MenuItem key={media._id} value={media._id}>{media.original_filename}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Model</div>
                        <FormControl className='basis-3/4' size="small">
                            <InputLabel>Model</InputLabel>
                            <Select
                                label="Model"
                                // sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                                value={newTask.model_id}
                                onChange={(e) => handleModelChange(e.target.value)}
                                disabled={isLoading}
                            >
                                {models.map(model => (
                                    <MenuItem key={model._id} value={model._id}>{model.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                    {selectedModel && (
                        <>
                            <div className='flex justify-between items-center'>
                                <div className='basis-1/4 text-gray-700 text-sm'>Model Description</div>
                                <div className='basis-3/4 '>{selectedModel.description}</div>
                            </div>
                            <div className='flex justify-between'>
                                <div className='basis-1/4 text-gray-700 text-sm'>Detect Classes</div>
                                <div className='basis-3/4 flex gap-1 flex-wrap'>
                                    {selectedModel.classes.map(className => (
                                        <FormControlLabel
                                            key={className}
                                            control={
                                                <Checkbox
                                                    checked={newTask.detect_classes.includes(className)}
                                                    onChange={() => handleClassToggle(className)}
                                                    disabled={isLoading}
                                                />
                                            }
                                            label={className}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Confidence</div>
                        <TextField
                            className='basis-3/4'
                            fullWidth
                            margin="normal"
                            label="Conf"
                            type="number"
                            value={newTask.conf}
                            onChange={(e) => setNewTask({ ...newTask, conf: parseFloat(e.target.value) })}
                            disabled={isLoading}
                            sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                        />
                    </div>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Width</div>
                        <TextField
                            className='basis-3/4'
                            fullWidth
                            margin="normal"
                            label="Width"
                            type="number"
                            value={newTask.width}
                            onChange={(e) => setNewTask({ ...newTask, width: parseInt(e.target.value) })}
                            disabled={isLoading}
                            sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                        />
                    </div>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Height</div>
                        <TextField
                            className='basis-3/4'
                            fullWidth
                            margin="normal"
                            label="Height"
                            type="number"
                            value={newTask.height}
                            onChange={(e) => setNewTask({ ...newTask, height: parseInt(e.target.value) })}
                            disabled={isLoading}
                            sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                        />
                    </div>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Augment</div>
                        <div className='basis-3/4'>
                            <Checkbox
                                checked={newTask.augment}
                                onChange={(e) => setNewTask({ ...newTask, augment: e.target.checked })}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
                <Box className="mt-4 flex items-center justify-end mb-6">
                    <Button
                        onClick={() => handleAddTask(newTask)}
                        variant="contained"
                        color="primary"
                        disabled={isLoading}
                        disableElevation
                        sx={{ textTransform: "none" }}
                    >
                        {isLoading ? 'Adding Task...' : 'Add Task'}
                    </Button>
                    {isLoading && <CircularProgress size={24} />}
                </Box>
                <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                    <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                </Snackbar>
            </Box>
        </Modal>
    )
}

export default CreateTaskModal;