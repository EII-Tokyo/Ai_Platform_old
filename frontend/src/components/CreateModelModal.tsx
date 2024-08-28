import React, { useState } from 'react';
import {
    Button,
    Modal,
    Box,
    TextField,
    Typography,
    CircularProgress,
    Snackbar,
    Alert
} from '@mui/material';

interface CreateModelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onModelCreated: () => void;
}

const CreateModelModal: React.FC<CreateModelModalProps> = ({ isOpen, onClose, onModelCreated }) => {
    const [modelName, setModelName] = useState('');
    const [modelFile, setModelFile] = useState<File | null>(null);
    const [yamlFile, setYamlFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleModelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setModelFile(event.target.files[0]);
        }
    };

    const handleYamlFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setYamlFile(event.target.files[0]);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');

        if (!modelName || !modelFile || !yamlFile || !description) {
            setError('All fields are required');
            setIsLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('name', modelName);
        formData.append('model_file', modelFile);
        formData.append('yaml_file', yamlFile);
        formData.append('description', description);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/models`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                onModelCreated();
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to create model');
            }
        } catch (error) {
            setError('An error occurred while creating the model');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="mb-6 text-2xl font-bold">Create New Model</div>
                    <div className='flex flex-col gap-8'>
                        <div className='flex justify-between items-center'>
                            <div className='basis-1/4 text-gray-700 text-sm'>Model Name</div>
                            <TextField
                                className='basis-3/4'
                                fullWidth
                                value={modelName}
                                onChange={(e) => setModelName(e.target.value)}
                                sx={{ "& .MuiOutlinedInput-input": { padding: "12px 16px" } }}
                            />
                        </div>
                        <div className='flex justify-between items-center'>
                            <div className='basis-1/4 text-gray-700 text-sm'>Model File</div>
                            <div className='basis-3/4'>
                                <input
                                    accept=".pt,.pth"
                                    style={{ display: 'none' }}
                                    id="model-file-upload"
                                    type="file"
                                    onChange={handleModelFileChange}
                                />
                                <label htmlFor="model-file-upload">
                                    <Button variant="outlined" component="span">
                                        Upload Model File
                                    </Button>
                                </label>
                                {modelFile && <Typography variant="body2" className="ml-2">{modelFile.name}</Typography>}
                            </div>
                        </div>
                        <div className='flex justify-between items-center'>
                            <div className='basis-1/4 text-gray-700 text-sm'>YAML File</div>
                            <div className='basis-3/4'>
                                <input
                                    accept=".yaml,.yml"
                                    style={{ display: 'none' }}
                                    id="yaml-file-upload"
                                    type="file"
                                    onChange={handleYamlFileChange}
                                />
                                <label htmlFor="yaml-file-upload">
                                    <Button variant="outlined" component="span">
                                        Upload YAML File
                                    </Button>
                                </label>
                                {yamlFile && <Typography variant="body2" className="ml-2">{yamlFile.name}</Typography>}
                            </div>
                        </div>
                        <div className='flex justify-between items-start'>
                            <div className='basis-1/4 text-gray-700 text-sm'>Description</div>
                            <TextField
                                className='basis-3/4'
                                fullWidth
                                multiline
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                    <Box className="mt-8 flex items-center justify-end">
                        <Button onClick={onClose} color="primary" className="mr-4">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" color="primary" disabled={isLoading}>
                            {isLoading ? <CircularProgress size={24} /> : 'Create'}
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

export default CreateModelModal;