import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';

interface UploadFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: FileList) => void;
    allowFoldersOnly?: boolean; // 新增属性
}

const UploadFolderModal: React.FC<UploadFolderModalProps> = ({ isOpen, onClose, onUpload, allowFoldersOnly }) => {
    const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onUpload(event.target.files);
            onClose();
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            aria-labelledby="upload-folder-modal-title"
            aria-describedby="upload-folder-modal-description"
        >
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4
            }}>
                <Typography id="upload-folder-modal-title" variant="h6" component="h2">
                    Upload Folder
                </Typography>
                <Typography id="upload-folder-modal-description" sx={{ mt: 2 }}>
                    Select a folder to upload. All files inside the folder will be uploaded.
                </Typography>
                <input
                    type="file"
                    onChange={handleFolderChange}
                    style={{ marginTop: '16px' }}
                    {...(allowFoldersOnly ? { directory: '', webkitdirectory: '' } : {})}
                />
                <Button onClick={onClose} variant="contained" sx={{ mt: 3 }}>
                    Cancel
                </Button>
            </Box>
        </Modal>
    );
};

export default UploadFolderModal;