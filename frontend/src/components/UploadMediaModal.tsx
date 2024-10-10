import React, { useState } from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    LinearProgress
} from '@mui/material';
import { Media } from '../interface';
import axios from 'axios';

interface UploadMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (uploadedFiles: Media[]) => void;
}

const UploadMediaModal: React.FC<UploadMediaModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [mediaData, setMediaData] = useState<{ files: File[]; mediaType: 'image' | 'video' }>({
        files: [],
        mediaType: 'image'
    });
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        const validFiles = files.filter(file => /^(image|video)\//.test(file.type) || file.name.endsWith('.avi'));

        if (validFiles.length > 0) {
            setMediaData({
                files: validFiles,
                mediaType: validFiles[0].type.startsWith('image') ? 'image' : 'video'
            });
            setError(null);
        } else {
            setError('Invalid file type. Please select an image or video file.');
            e.target.value = ''; // Reset the file input
        }
    };

    const handleUpload = async () => {
        if (mediaData.files.length === 0) {
            setError('Please provide at least one file.');
            return;
        }

        setIsUploading(true);
        setError(null);
        setCurrentFileIndex(0);

        for (let i = 0; i < mediaData.files.length; i++) {
            const file = mediaData.files[i];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/upload_file`, formData, {
                    headers: {
                        'Accept': 'application/json'
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            setUploadProgress(progress);
                        }
                    }
                });

                if (response.status !== 200) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const uploadedFile: Media = response.data;
                onUpload([uploadedFile]);
                setCurrentFileIndex(i + 1);
            } catch (error) {
                console.error('Upload failed:', error);
                setError('Upload failed. Please try again.');
                break;
            }
        }

        setIsUploading(false);
        setUploadProgress(0);
        handleClose();
    };

    const handleClose = () => {
        setMediaData({ files: [], mediaType: 'image' });
        setError(null);
        setCurrentFileIndex(0);
        setUploadProgress(0);
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={handleClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'background.paper',
                p: 4,
                borderRadius: 2,
                width: '80vw',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <Typography variant="h6" component="h2" gutterBottom>
                    Upload Media
                </Typography>
                <div className='flex flex-col gap-4'>
                    <div className='flex justify-between items-center'>
                        <Typography variant="body2" sx={{ flexBasis: '25%' }}>Files</Typography>
                        <input
                            type="file"
                            accept="image/*,video/*,.avi"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            style={{ flexBasis: '75%' }}
                            multiple
                        />
                    </div>
                </div>
                {isUploading && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress variant="determinate" value={uploadProgress} />
                        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                            Uploading file {currentFileIndex + 1} of {mediaData.files.length} ({uploadProgress}%)
                        </Typography>
                    </Box>
                )}
                <Box className="mt-4 flex items-center justify-end">
                    <Button
                        onClick={handleUpload}
                        variant="contained"
                        color="primary"
                        disabled={isUploading || mediaData.files.length === 0}
                        sx={{ textTransform: "none", mr: 2 }}
                    >
                        {isUploading ? <CircularProgress size={24} /> : 'Upload'}
                    </Button>
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