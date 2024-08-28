import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
// @mui
import { styled } from '@mui/material/styles';
import { Alert, AppBar, Box, Button, TextField, Toolbar, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { BrowserView, MobileView, isBrowser, isMobile } from 'react-device-detect';
import { Config } from '../interface';
import axios from 'axios';
import dayjs from 'dayjs';

const StyledRoot = styled('div')({
    height: '100vh',
    overflow: 'auto',
    position: 'relative',
    backgroundColor: '#f5f5f5'
});

const Main = styled('div')(({ theme }) => ({
    overflow: 'auto',
    marginTop: '64px',
}));

const MobileMain = styled('div')(({ theme }) => ({
    overflow: 'auto',
    marginTop: '56px',
}));

// ----------------------------------------------------------------------

export function BrowserLayout() {
    const navItems = [['Task', ''], ['Model', 'Model']];
    const [username, setUsername] = useState('');
    const [inputUsername, setInputUsername] = useState('');
    const [password, setPassword] = useState('');
    const [inputPassword, setInputPassword] = useState('');
    const [error, setError] = useState(false);
    const [config, setConfig] = React.useState<Config>({} as Config);
    const [now, setNow] = React.useState(dayjs().format('YYYY-MM-DD'));
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(dayjs().format('YYYY-MM-DD'));
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // 在组件挂载时从localStorage中获取值
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
        }
        const storedPassword = localStorage.getItem('password');
        if (storedPassword) {
            setPassword(storedPassword);
        }
    }, []);

    // useEffect(() => {
    //     if (username === "eii" && password === "123456") {
    //         axios.get(process.env.REACT_APP_API_URL + '/api/get_config?name=all')
    //             .then((res) => {
    //                 setConfig(JSON.parse(res.data.config));
    //             })
    //     }
    // }, [username, password]);

    const handleLogin = () => {
        if (inputUsername === "eii" && inputPassword === "123456") {
            setUsername(inputUsername);
            setPassword(inputPassword);
            localStorage.setItem('username', inputUsername);
            localStorage.setItem('password', inputPassword);
            setError(false);
        } else {
            setError(true);
        }
    }

    const handleLogout = () => {
        setUsername('');
        setPassword('');
        setInputUsername('');
        setInputPassword('');
        localStorage.removeItem('username');
        localStorage.removeItem('password');
    }

    return (
        <StyledRoot>
            <AppBar component="nav" color="inherit" sx={{ boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.02), 0px 6px 12px rgba(0, 0, 0, 0.02);' }}>
                <Toolbar>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ display: { xs: 'none', sm: 'block' }, cursor: 'pointer' }}
                        onClick={() => window.location.href = '/'}
                    >
                        EII
                    </Typography>
                    <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}>
                        {navItems.map((item) => (
                            <Button sx={{ textTransform: "none" }} color='inherit' key={item[0]} onClick={() => { window.location.href = '/' + item[1] }}>
                                {item[0]}
                            </Button>
                        ))}
                        {
                            username !== '' && password !== '' &&
                            <Button sx={{ marginLeft: "24px" }} variant="contained" color="primary" onClick={handleLogout}>
                                Log out
                            </Button>
                        }
                    </Box>
                </Toolbar>
            </AppBar>
            {/* {
                (dayjs(now).isBefore(dayjs(config.validity_start_date)) || dayjs(now).isAfter(dayjs(config.validity_end_date))) && <Alert variant="filled" severity="error" sx={{ position: "absolute", top: "76px", right: "16px", zIndex: 999 }} >
                    Please activate your account!
                </Alert>
            } */}
            <Main>
                {
                    username === '' && password === '' ?
                        <div className='w-full flex justify-center items-center' style={{ height: "calc(100vh - 64px)", }}>
                            <div className='rounded bg-white p-8 flex flex-col gap-8'>
                                <TextField
                                    value={inputUsername}
                                    onChange={(e) => setInputUsername(e.target.value)}
                                    label="Username"
                                    defaultValue=""
                                    sx={{ width: '300px' }}
                                    error={error}
                                />
                                <TextField
                                    type='password'
                                    value={inputPassword}
                                    onChange={(e) => setInputPassword(e.target.value)}
                                    label="Password"
                                    defaultValue=""
                                    error={error}
                                />
                                <Button variant="contained" color="primary" onClick={handleLogin}>
                                    Login
                                </Button>
                            </div>
                        </div>
                        :
                        <Outlet />
                }
            </Main>
        </StyledRoot>
    );
}

export function MobileLayout() {
    return (
        <>
            <AppBar component="nav" color="inherit" sx={{ boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.02), 0px 6px 12px rgba(0, 0, 0, 0.02);' }}>
                <Toolbar>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => window.location.href = '/'}
                    >
                        EII-Robot
                    </Typography>
                </Toolbar>
            </AppBar>
            <MobileMain>
                <Outlet />
            </MobileMain>
        </>
    );
}
