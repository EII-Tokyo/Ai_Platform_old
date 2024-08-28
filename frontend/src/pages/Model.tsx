import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, Typography, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
    Checkbox,
    Chip,
    Box
} from '@mui/material';
import { Task, CreateTaskInput, Model } from '../interface';
import CreateModelModal from '../components/CreateModelModal';
import UpdateModelModal from '../components/UpdateModelModal';
import ModelDetailsModal from '../components/ModelDetailsModal';

const ModelManagement = () => {
    const [models, setModels] = useState<Model[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedModels, setSelectedModels] = useState<string[]>([]);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/models`);
            if (response.ok) {
                const data = await response.json();
                setModels(data);
            } else {
                console.error('Failed to fetch models');
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    };

    const handleOpenDetailModal = (model: Model) => {
        setSelectedModel(model);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedModel(null);
    };

    const handleOpenCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    const handleOpenUpdateModal = (model: Model) => {
        setSelectedModel(model);
        setIsUpdateModalOpen(true);
    };

    const handleModelCreated = () => {
        fetchModels();
    };

    const handleModelUpdated = () => {
        fetchModels();
    };

    const handleCheckboxChange = (modelId: string) => {
        setSelectedModels(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        );
    };

    const handleDeleteSelected = async () => {
        if (window.confirm('Are you sure you want to delete the selected models?')) {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/models/bulk-delete`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ model_ids: selectedModels }),
                });

                if (response.ok) {
                    fetchModels();
                    setSelectedModels([]);
                } else {
                    console.error('Failed to delete models');
                }
            } catch (error) {
                console.error('Error deleting models:', error);
            }
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="text-xl font-semibold">
                    Model Management
                </div>
                <div>
                    {selectedModels.length > 0 && (
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleDeleteSelected}
                            sx={{ mr: 2 }}
                        >
                            Delete Selected ({selectedModels.length})
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenCreateModal}
                    >
                        Create New Model
                    </Button>
                </div>
            </div>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox"></TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Number of Classes</TableCell>
                            <TableCell>Default Detect Classes</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {models.map((model: Model) => (
                            <TableRow key={model._id}>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectedModels.includes(model._id)}
                                        onChange={() => handleCheckboxChange(model._id)}
                                    />
                                </TableCell>
                                <TableCell>{model.name}</TableCell>
                                <TableCell>{model.description}</TableCell>
                                <TableCell>{model.classes.length}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {model.default_detect_classes.map((cls, index) => (
                                            <Chip
                                                key={index}
                                                label={cls}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        sx={{ textTransform: "none", mr: 1 }}
                                        variant="contained"
                                        disableElevation
                                        size="small"
                                        onClick={() => handleOpenDetailModal(model)}
                                    >
                                        View Details
                                    </Button>
                                    <Button
                                        sx={{ textTransform: "none" }}
                                        variant="outlined"
                                        disableElevation
                                        size="small"
                                        onClick={() => handleOpenUpdateModal(model)}
                                    >
                                        Update
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <ModelDetailsModal
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetailModal}
                selectedModel={selectedModel}
            />

            <CreateModelModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onModelCreated={handleModelCreated}
            />

            <UpdateModelModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                onModelUpdated={handleModelUpdated}
                model={selectedModel}
            />
        </div>
    );
};

export default ModelManagement;