import React, { useState } from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Button
} from '@mui/material';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (folderName: string) => void;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [folderName, setFolderName] = useState('');

    const handleCreate = () => {
        if (folderName.trim()) {
            onCreate(folderName);
            setFolderName('');
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Folder Name"
                    type="text"
                    fullWidth
                    variant="standard"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleCreate} color="primary">
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateFolderModal;
