import React from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    Divider
} from '@mui/material';

interface ModelDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedModel: {
        name: string;
        description: string;
        classes: string[];
        default_detect_classes: string[];
    } | null;
}

const ModelDetailsModal: React.FC<ModelDetailsModalProps> = ({ isOpen, onClose, selectedModel }) => {
    return (
        <Modal open={isOpen} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-lg w-[80vw] max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <Typography variant="h5" component="h2" className="font-bold">
                        Model Details
                    </Typography>
                    <Button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </Button>
                </div>
                {selectedModel && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="basis-1/4 text-gray-700 text-sm">Name</div>
                            <div className="basis-3/4">{selectedModel.name}</div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="basis-1/4 text-gray-700 text-sm">Description</div>
                            <div className="basis-3/4">{selectedModel.description}</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="basis-1/4 text-gray-700 text-sm">Number of Classes</div>
                            <div className="basis-3/4">{selectedModel.classes.length}</div>
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="basis-1/4 text-gray-700 text-sm">Default Detect Classes</div>
                            <div className="basis-3/4">
                                <ul className="list-disc pl-5">
                                    {selectedModel.default_detect_classes.map((cls, index) => (
                                        <li key={index}>{cls}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
                <Box className="mt-8 flex items-center justify-end">
                    <Button onClick={onClose} variant="contained" color="primary" disableElevation sx={{ textTransform: "none" }}>
                        Close
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default ModelDetailsModal;