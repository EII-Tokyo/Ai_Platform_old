import React, { useEffect, useRef } from 'react';
import SideBar from './SideBar';
import { styled } from '@mui/material/styles';
import { Alert, Box, Button, Snackbar } from '@mui/material';
import theme from '../theme/theme';
import axios from 'axios';
import NotStartedTwoToneIcon from '@mui/icons-material/NotStartedTwoTone';
import { Config, ImageData } from '../interface';

const StyledRoot = styled('div')({
    display: 'flex',
    height: "calc(100vh - 64px)",
    width: "100%",
});

const ButtonContainer = styled('div')({
    display: 'flex',
    padding: theme.spacing(2),
    gap: theme.spacing(2),
});

export default function RobotSnackbar({ errorOpen, setErrorOpen, successOpen, setSuccessOpen, alertMsg, setAlertMsg }: any) {
    return (
        <>
            <Snackbar open={errorOpen} resumeHideDuration={5000} anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }}
                onClose={() => setErrorOpen(false)}>
                <Alert variant="filled" severity="error" sx={{ width: '100%' }} onClose={() => setErrorOpen(false)}>
                    {alertMsg}
                </Alert>
            </Snackbar>
            <Snackbar open={successOpen} resumeHideDuration={5000} anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }}
                onClose={() => setSuccessOpen(false)}>
                <Alert variant="filled" severity="success" sx={{ width: '100%' }} onClose={() => setSuccessOpen(false)}>
                    {alertMsg}
                </Alert>
            </Snackbar>
        </>
    );
}