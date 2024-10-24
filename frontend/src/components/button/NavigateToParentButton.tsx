import React from 'react';
import { Button } from '@mui/material';

interface NavigateToParentButtonProps {
    handleNavigateToParent: () => void;
    currentFolderId: string;
}

const NavigateToParentButton: React.FC<NavigateToParentButtonProps> = ({
    handleNavigateToParent,
    currentFolderId,
}) => {
    return (
        <Button
            variant="outlined"
            color="secondary"
            onClick={handleNavigateToParent}
            disableElevation
            sx={{ textTransform: "none", mr: 2 }}
            disabled={currentFolderId === 'root'}
        >
            Parent
        </Button>
    );
};

export default NavigateToParentButton;