import React, { useState, useEffect } from 'react';
import {
    Button, Modal, Box, TextField, CircularProgress, Select, MenuItem, Typography,
    FormControl, InputLabel, Checkbox, FormControlLabel, Divider, Snackbar, Alert
} from '@mui/material';
import { ITaskRequest, Media, Model } from '../interface';

interface RunWithModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    media: Media | null;
    models: Model[];
    onRunTask: (params: any) => void;
}

const RunWithModelModal: React.FC<RunWithModelModalProps> = ({ isOpen, onClose, media, models, onRunTask }) => {
    const [params, setParams] = useState<ITaskRequest>({
        media_id: media ? media._id : '',
        media_type: media ? media.media_type : '',       
        model_id: '',
        conf: 0.25,
        detect_classes: [] as string[],
        detect_class_indices: [] as number[],
        width: 1920,
        height: 1088,
        augment: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (media) {
            setParams(prev => ({
                ...prev,
                media_id: media._id,
                media_type: media.media_type
            }));
        }
    }, [media]);

    useEffect(() => {
        if (models.length > 0) {
            setParams(prev => ({
                ...prev,
                model_id: models[0]._id,
                detect_classes: models[0].default_detect_classes
            }));
        }
    }, [models]);

    const handleModelChange = (modelId: string) => {
        const selectedModel = models.find(model => model._id === modelId);
        setParams(prev => ({
            ...prev,
            model_id: modelId,
            detect_classes: selectedModel ? selectedModel.default_detect_classes : []
        }));
    };

    const handleClassToggle = (className: string) => {
        setParams(prev => {
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

    const handleRunTask = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Convert selected class names to their indices
            const selectedModel = models.find(model => model._id === params.model_id);
            const detectClassIndices = params.detect_classes.map(className =>
                selectedModel?.classes.indexOf(className)
            ).filter(index => index !== -1) as number[];

            await onRunTask({
                ...params,
                detect_class_indices: detectClassIndices
            });

            onClose();
        } catch (error) {
            console.error('Error running task:', error);
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const selectedModel = models.find(model => model._id === params.model_id);

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <div className="mb-6 text-2xl font-bold">Run with Model</div>
                <div className='flex flex-col gap-8'>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Model</div>
                        <FormControl className='basis-3/4' size="small">
                            <InputLabel>Model</InputLabel>
                            <Select
                                label="Model"
                                sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                                value={params.model_id}
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
                                                    checked={params.detect_classes.includes(className)}
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
                            label="Confidence"
                            type="number"
                            value={params.conf}
                            onChange={(e) => setParams({ ...params, conf: parseFloat(e.target.value) })}
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
                            value={params.width}
                            onChange={(e) => setParams({ ...params, width: parseInt(e.target.value) })}
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
                            value={params.height}
                            onChange={(e) => setParams({ ...params, height: parseInt(e.target.value) })}
                            disabled={isLoading}
                            sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                        />
                    </div>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Augment</div>
                        <div className='basis-3/4'>
                            <Checkbox
                                checked={params.augment}
                                onChange={(e) => setParams({ ...params, augment: e.target.checked })}
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                </div>
                <Box className="mt-4 flex items-center justify-end mb-6">
                    <Button
                        onClick={handleRunTask}
                        variant="contained"
                        color="primary"
                        disabled={isLoading}
                        disableElevation
                        sx={{ textTransform: "none" }}
                    >
                        {isLoading ? 'Running Task...' : 'Run Task'}
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
    );
};

export default RunWithModelModal;