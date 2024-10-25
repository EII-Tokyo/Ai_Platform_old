import React, { useState, useEffect } from 'react';
import {
    Modal, Box, FormControl, InputLabel, Select, MenuItem,
    TextField, FormControlLabel, Checkbox, Button, Typography,
    Snackbar, Alert, CircularProgress
} from '@mui/material';
import { CreateTaskInput, Task, Model, ITaskRequest } from '../interface';

interface RerunTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTask: Task | null;
    fetchTasks: () => void;
    models: Model[];
}

const RerunTaskModal: React.FC<RerunTaskModalProps> = ({ isOpen, onClose, selectedTask, fetchTasks, models }) => {
    const [newTask, setNewTask] = useState<ITaskRequest & { detect_classes: string[] }>({
        media_id: '',
        media_type: 'image',
        model_id: '',
        conf: 0.5,
        width: 640,
        height: 640,
        augment: false,
        detect_classes: [] as string[],
        detect_class_indices: [] as number[],
        parent_id: '',
        parent_path: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedTask && models.length > 0) {
            const selectedModel = models.find(model => model._id === selectedTask.model_id) || models[0];
            setNewTask({
                media_id: selectedTask.media_id,
                model_id: selectedTask.model_id,
                conf: selectedTask.conf,
                width: selectedTask.width,
                height: selectedTask.height,
                augment: selectedTask.augment,
                media_type: selectedTask.media_type,
                detect_classes: selectedTask.detect_classes,
                detect_class_indices: [],
                parent_id: '',
                parent_path: ''
            });
        }
    }, [selectedTask, models]);

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

    const handleRerun = async (taskData: ITaskRequest & { detect_classes: string[] }) => {
        try {
            setIsLoading(true);
            setError(null);

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
                    media_id: selectedTask!.media_id,
                    media_type: selectedTask!.media_type,
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
    
            onClose();
            await fetchTasks();
        } catch (error) {
            console.error('Error rerunning task:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedModel = models.find(model => model._id === newTask.model_id);

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <div className="mb-6 text-2xl font-bold">Rerun Task</div>
                <div className='flex flex-col gap-8'>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Model</div>
                        <FormControl className='basis-3/4' size="small">
                            <InputLabel>Model</InputLabel>
                            <Select
                                label="Model"
                                sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                                value={newTask.model_id}
                                onChange={(e) => handleModelChange(e.target.value as string)}
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
                                <div className='basis-3/4'>{selectedModel.description}</div>
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
                        onClick={() => handleRerun(newTask)}
                        variant="contained"
                        color="primary"
                        disabled={isLoading}
                        disableElevation
                        sx={{ textTransform: "none" }}
                    >
                        {isLoading ? 'Rerunning Task...' : 'Rerun Task'}
                    </Button>
                    {isLoading && <CircularProgress size={24} />}
                </Box>
                <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
                    <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                </Snackbar>
            </Box>
        </Modal>
    );
};

export default RerunTaskModal;