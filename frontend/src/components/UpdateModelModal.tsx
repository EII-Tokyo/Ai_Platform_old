import React, { useState, useEffect } from 'react';
import {
    Button,
    Modal,
    Box,
    Typography,
    CircularProgress,
    FormGroup,
    FormControlLabel,
    Checkbox,
    TextField,
    Snackbar,
    Alert
} from '@mui/material';

interface UpdateModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onModelUpdated: () => void;
    model: {
        _id: string;
        name: string;
        description: string;
        default_detect_classes: string[];
        classes: string[];
    } | null;
}

const UpdateModelModal: React.FC<UpdateModelModalProps> = ({ isOpen, onClose, onModelUpdated, model }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (model) {
            setName(model.name);
            setDescription(model.description);
            setSelectedClasses(model.default_detect_classes);
        }
    }, [model]);

    const handleClassToggle = (className: string) => {
        setSelectedClasses(prev => {
            let newClasses: string[];
            if (prev.includes(className)) {
                newClasses = prev.filter(c => c !== className);
            } else {
                newClasses = [...prev, className];
            }
            
            // Sort the newClasses array to match the order in the model's class list
            if (model) {
                newClasses.sort((a, b) => {
                    const indexA = model.classes.indexOf(a);
                    const indexB = model.classes.indexOf(b);
                    return indexA - indexB;
                });
            }

            return newClasses; // Return the sorted newClasses array directly
        });
    };

    const handleSelectAll = () => {
        if (model) {
            setSelectedClasses(selectedClasses.length === model.classes.length ? [] : [...model.classes]);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');

        if (!model) {
            setError('No model selected for update');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/models/${model._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    description,
                    default_detect_classes: selectedClasses
                }),
            });

            if (response.ok) {
                onModelUpdated();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to update model');
            }
        } catch (error) {
            setError('An error occurred while updating the model');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="mb-6 text-2xl font-bold">Update Model: {model?.name}</div>
                    <div className='flex flex-col gap-8'>
                        <div className='flex justify-between items-center'>
                            <div className='basis-1/4 text-gray-700 text-sm'>Model Name</div>
                            <TextField
                                className='basis-3/4'
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                            />
                        </div>
                        <div className='flex justify-between items-start'>
                            <div className='basis-1/4 text-gray-700 text-sm'>Description</div>
                            <TextField
                                className='basis-3/4'
                                fullWidth
                                multiline
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className='flex justify-between items-start'>
                            <div className='basis-1/4 text-gray-700 text-sm'>Default Detect Classes</div>
                            <div className='basis-3/4'>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={model ? selectedClasses.length === model.classes.length : false}
                                            indeterminate={model ? selectedClasses.length > 0 && selectedClasses.length < model.classes.length : false}
                                            onChange={handleSelectAll}
                                        />
                                    }
                                    label="Select All"
                                />
                                <Box sx={{ maxHeight: '40vh', overflowY: 'auto', mt: 2 }}>
                                    <FormGroup>
                                        {model?.classes.map((cls) => (
                                            <FormControlLabel
                                                key={cls}
                                                control={
                                                    <Checkbox
                                                        checked={selectedClasses.includes(cls)}
                                                        onChange={() => handleClassToggle(cls)}
                                                    />
                                                }
                                                label={cls}
                                            />
                                        ))}
                                    </FormGroup>
                                </Box>
                            </div>
                        </div>
                    </div>
                    <Box className="mt-8 flex items-center justify-end">
                        <Button onClick={onClose} color="primary" className="mr-4" disableElevation sx={{ textTransform: "none" }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" color="primary" disabled={isLoading} disableElevation sx={{ textTransform: "none" }}>
                            {isLoading ? <CircularProgress size={24} /> : 'Update'}
                        </Button>
                    </Box>
                </form>
                <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
                    <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
                        {error}
                    </Alert>
                </Snackbar>
            </Box>
        </Modal>
    );
};

export default UpdateModelModal;