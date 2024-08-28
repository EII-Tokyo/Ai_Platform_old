import React, { useState, useEffect } from 'react';
import {
    Button, Modal, Box, TextField, CircularProgress, Select, MenuItem, Typography,
    FormControl, InputLabel, Checkbox, FormControlLabel, Divider, Snackbar, Alert
} from '@mui/material';
import { Task, CreateTaskInput, Model } from '../interface';

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
    const [newTask, setNewTask] = useState<CreateTaskInput & { selectedClasses: string[] }>({
        file: null,
        file_type: 'image',
        model_id: '',
        conf: 0.25,
        width: 1920,
        height: 1088,
        augment: false,
        selectedClasses: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (models.length > 0 && !newTask.model_id) {
            setNewTask(prev => ({
                ...prev,
                model_id: models[0]._id,
                selectedClasses: models[0].default_detect_classes
            }));
        }
    }, [models]);

    const handleAddTask = async (taskData: CreateTaskInput & { selectedClasses: string[] }) => {
        try {
            setIsLoading(true);
            setError(null);

            if (!taskData.file) {
                throw new Error('No file provided for new task');
            }

            const formData = new FormData();
            formData.append('file', taskData.file);

            const uploadResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/upload_file`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file');
            }

            const uploadResult = await uploadResponse.json();
            const fileId = uploadResult.file_id;

            // Convert selected class names to their indices
            const selectedModel = models.find(model => model._id === taskData.model_id);
            const detectClassIndices = taskData.selectedClasses.map(className =>
                selectedModel?.classes.indexOf(className)
            ).filter(index => index !== -1) as number[];

            const runResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/run_yolo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_id: fileId,
                    file_type: taskData.file_type,
                    model_id: taskData.model_id,
                    conf: taskData.conf,
                    width: taskData.width,
                    height: taskData.height,
                    augment: taskData.augment,
                    detect_classes: taskData.selectedClasses,
                    detect_class_indices: detectClassIndices  // Send class indices instead of class names
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
            selectedClasses: selectedModel ? selectedModel.default_detect_classes : []
        }));
    };

    const handleClassToggle = (className: string) => {
        setNewTask(prev => ({
            ...prev,
            selectedClasses: prev.selectedClasses.includes(className)
                ? prev.selectedClasses.filter(c => c !== className)
                : [...prev.selectedClasses, className]
        }));
    };

    const selectedModel = models.find(model => model._id === newTask.model_id);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            const fileType = file.type.split('/')[0];
            if (fileType === 'image' || fileType === 'video' || file.name.endsWith('.avi')) {
                setNewTask({
                    ...newTask,
                    file: file,
                    file_type: fileType === 'image' ? 'image' : 'video'
                });
                setError(null);
            } else {
                setError('Invalid file type. Please select an image or video file.');
                e.target.value = ''; // Reset the file input
            }
        }
    };

    return (
        <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <div className="mb-6 text-2xl font-bold">Add New Task</div>
                <div className='flex flex-col gap-8'>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Video/Image</div>
                        <input
                            className='basis-3/4'
                            type="file"
                            accept="image/*,video/*,.avi"
                            onChange={handleFileChange}
                            disabled={isLoading}
                        />
                    </div>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Model</div>
                        <FormControl className='basis-3/4'>
                            <InputLabel>Model</InputLabel>
                            <Select
                                label="Model"                               
                                sx={{ "& .MuiOutlinedInput-input": { padding: "12px 16px" } }}
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
                                                    checked={newTask.selectedClasses.includes(className)}
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
                            sx={{ "& .MuiOutlinedInput-input": { padding: "12px 16px" } }}
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
                            sx={{ "& .MuiOutlinedInput-input": { padding: "12px 16px" } }}
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
                            sx={{ "& .MuiOutlinedInput-input": { padding: "12px 16px" } }}
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
                        disabled={isLoading || !newTask.file}
                        disableElevation
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