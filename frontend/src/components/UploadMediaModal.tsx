import React, { useState } from 'react';
import {
    Modal,
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

interface UploadMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: () => void;
}

const UploadMediaModal: React.FC<UploadMediaModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [mediaData, setMediaData] = useState({
        file: null as File | null,
        name: '',
        description: '',
        mediaType: 'image'
    });
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            const fileType = file.type.split('/')[0];
            if (fileType === 'image' || fileType === 'video' || file.name.endsWith('.avi')) {
                setMediaData({
                    ...mediaData,
                    file: file,
                    mediaType: fileType === 'image' ? 'image' : 'video'
                });
                setError(null);
            } else {
                setError('Invalid file type. Please select an image or video file.');
                e.target.value = ''; // Reset the file input
            }
        }
    };

    const handleUpload = async () => {
        if (!mediaData.file) {
            setError('Please provide a file.');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', mediaData.file);
        formData.append('name', mediaData.name);
        formData.append('description', mediaData.description);

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/upload_file`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Upload successful:', result);

            // Reset form and close modal
            setMediaData({
                file: null,
                name: '',
                description: '',
                mediaType: 'image'
            });
            onUpload(); // Trigger refetch of media items
            onClose(); // Close the modal
        } catch (error) {
            console.error('Upload failed:', error);
            setError('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <Typography variant="h6" component="h2" className="mb-6 text-2xl font-bold">
                    Upload Media
                </Typography>
                <div className='flex flex-col gap-8'>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>File</div>
                        <input
                            className='basis-3/4'
                            type="file"
                            accept="image/*,video/*,.avi"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </div>
                    {/* <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Name</div>
                        <TextField
                            className='basis-3/4'
                            value={mediaData.name}
                            onChange={(e) => setMediaData({ ...mediaData, name: e.target.value })}
                            fullWidth
                            disabled={isUploading}
                            sx={{ "& .MuiOutlinedInput-input": { padding: "8.5px 16px" } }}
                        />
                    </div>
                    <div className='flex justify-between items-center'>
                        <div className='basis-1/4 text-gray-700 text-sm'>Description</div>
                        <TextField
                            className='basis-3/4'
                            value={mediaData.description}
                            onChange={(e) => setMediaData({ ...mediaData, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                            disabled={isUploading}
                        />
                    </div> */}
                </div>
                <Box className="mt-4 flex items-center justify-end mb-6">
                    <Button
                        onClick={handleUpload}
                        variant="contained"
                        color="primary"
                        disabled={isUploading || !mediaData.file }
                        disableElevation
                        sx={{ textTransform: "none" }}
                    >
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                    {isUploading && <CircularProgress size={24} className="ml-2" />}
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

export default UploadMediaModal;