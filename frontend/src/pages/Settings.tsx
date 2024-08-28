import React, { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Alert, Box, Button, FormControl, InputAdornment, MenuItem, OutlinedInput, Select, Snackbar, Typography } from '@mui/material';
import axios from 'axios';
import { Config } from '../interface';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import dayjs from 'dayjs';
import theme from '../theme/theme';

const ConfigContainer = styled(Box)({
    backgroundColor: 'white',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.02), 0px 6px 12px rgba(0, 0, 0, 0.02)',
    padding: "16px",
    width: '600px',
    margin: '16px',
});

export default function Settings() {
    const [config, setConfig] = React.useState<Config>({} as Config);
    const [now, setNow] = React.useState(dayjs().format('YYYY-MM-DD'));
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(dayjs().format('YYYY-MM-DD'));
        }, 10000);
        return () => clearInterval(timer);
    }, []);
    const [error, setError] = React.useState(false);
    const handleErrorClose = () => {
        setError(false);
    };

    const [success, setSuccess] = React.useState(false);
    const handleSuccessClose = () => {
        setSuccess(false);
    };

    const [activationCode, setActivationCode] = React.useState(''); // config['camera_ActivationCode'
    const [showActivationCode, setShowActivationCode] = React.useState(false);

    useEffect(() => {
        // set the canvas
        // get the current config
        axios.get(process.env.REACT_APP_API_URL + '/api/get_config?name=all')
            .then((res) => {
                setConfig(JSON.parse(res.data.config));
            })
    }, []);

    const handleActivate = () => {
        axios.post(process.env.REACT_APP_API_URL + '/api/validate_activation_code', activationCode).then((res) => {
            setSuccess(true);
            axios.get(process.env.REACT_APP_API_URL + '/api/get_config?name=all')
                .then((res) => {
                    setConfig(JSON.parse(res.data.config));
                })
        }).catch((err) => {
            setError(true);
            console.log(err);
        })
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {JSON.stringify(config) != "{}" &&
                <>
                <ConfigContainer>
                        <Typography variant="subtitle2" className='flex justify-between'>
                            <Box>S/N:</Box>
                            <span style={{ fontSize: "14px" }}>
                                {config["S/N"]}
                            </span>
                        </Typography>
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" className='flex justify-between'>
                            <Box>State:</Box>
                            {
                                dayjs(now).isBefore(dayjs(config.validity_start_date)) || dayjs(now).isAfter(dayjs(config.validity_end_date)) ?
                                    <span style={{ color: theme.palette.error.main, fontSize: "14px" }}>
                                        Invalid
                                    </span> :
                                    <span style={{ color: theme.palette.success.main, fontSize: "14px" }}>
                                        Valid
                                    </span>
                            }
                        </Typography>
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" className='flex justify-between'>
                            <Box>Start date:</Box>
                            <span style={{ fontSize: "14px" }}>
                                {config.validity_start_date}
                            </span>
                        </Typography>
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" className='flex justify-between'>
                            <Box>End date:</Box>
                            <span style={{ fontSize: "14px" }}>
                                {config.validity_end_date}
                            </span>
                        </Typography>
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            Activation code
                        </Typography>
                        <OutlinedInput
                            endAdornment={
                                <InputAdornment position="end">
                                    {
                                        showActivationCode ?
                                            <VisibilityOffRoundedIcon sx={{ cursor: "pointer" }} onClick={() => { setShowActivationCode(!showActivationCode) }} /> :
                                            <VisibilityIcon sx={{ cursor: "pointer" }} onClick={() => { setShowActivationCode(!showActivationCode) }} />
                                    }
                                </InputAdornment>
                            }
                            type={showActivationCode ? 'text' : 'password'}
                            fullWidth
                            value={activationCode}
                            onChange={(event) => {
                                setActivationCode(event.target.value)
                            }}
                        />
                    </ConfigContainer>
                    <Button
                        variant="contained"
                        sx={{ margin: "16px", width: "600px" }}
                        onClick={handleActivate}
                    >
                        Activate
                    </Button>
                </>
            }
            <Snackbar open={error} autoHideDuration={3000} anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }} onClose={handleErrorClose}>
                <Alert variant="filled" severity="error" sx={{ width: '100%' }} onClose={handleErrorClose}>
                    Incorrect activation code!
                </Alert>
            </Snackbar>
            <Snackbar open={success} autoHideDuration={3000} anchorOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }} onClose={handleSuccessClose}>
                <Alert variant="filled" severity="success" sx={{ width: '100%' }} onClose={handleSuccessClose}>
                    Activate success!
                </Alert>
            </Snackbar>
        </Box>
    )
}