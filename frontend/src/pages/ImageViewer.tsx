import React, { useEffect } from "react";
import axios from "axios";
import { Avatar, Box, Button, Card, CardHeader, CardMedia, Checkbox, FormControlLabel, Grid, Modal, Pagination } from "@mui/material";
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from "dayjs";
import { DateTimeRangePicker } from '@mui/x-date-pickers-pro/DateTimeRangePicker';
import { DotLottiePlayer, Controls } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';
import RobotSnackbar from "../components/RobotSnackbar";

export default function ImageViewer() {
    const [config, setConfig] = React.useState<any>({});
    const [images, setImages] = React.useState<any>([]);
    const [page, setPage] = React.useState<number>(1);
    const [totalPages, setTotalPages] = React.useState<number>(0);
    const [total, setTotal] = React.useState<number>(0);
    const [limit, setLimit] = React.useState<number>(18);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [dataRange, setDataRange] = React.useState<Dayjs[]>([dayjs().subtract(1, 'month'), dayjs()]);

    const [imgIndex, setImgIndex] = React.useState<number>(0);
    const [open, setOpen] = React.useState(false);
    const [labelOnly, setLabelOnly] = React.useState<boolean>(true);
    const [alertMsg, setAlertMsg] = React.useState("");
    const [errorOpen, setErrorOpen] = React.useState(false);
    const [successOpen, setSuccessOpen] = React.useState(false);
    const handleOpen = (index: number) => {
        setImgIndex(index);
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };

    const init = () => {
        axios.get(process.env.REACT_APP_API_URL + '/api/get_config', {
            params: {
                name: 'all'
            }
        }).then((res) => {
            const config = JSON.parse(res.data.config);
            setConfig(config);
        });
    };

    const handleSearch = () => {
        if (dataRange[0] === null || dataRange[1] === null) return;
        setLoading(true)
        console.log(dataRange[0].format("YYYY-MM-DD HH:mm:ss"), dataRange[1].format("YYYY-MM-DD HH:mm:ss"));
        axios.get(process.env.REACT_APP_API_URL + '/api/get_images_between_starttime_endtime', {
            params: {
                starttime: dataRange[0].format("YYYY-MM-DD HH:mm:ss"),
                endtime: dataRange[1].format("YYYY-MM-DD HH:mm:ss"),
                skip: (page - 1) * limit,
                limit: limit,
                label_only: labelOnly
            }
        }).then((res) => {
            setLoading(false);
            console.log(res.data);
            setImages(res.data.images);
            setTotalPages(Math.ceil(res.data.total / limit));
            setTotal(res.data.total);
        })
    }

    const handlePageChange = (value: number) => {
        setPage(value);
    };

    const drawImages = () => {
        images.forEach((image: any, index: any) => {
            var canvas = document.getElementById("canvas" + index) as HTMLCanvasElement;
            var parent = canvas.parentElement as HTMLDivElement;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientWidth / image.width * image.height;
            var ctx = canvas.getContext("2d");
            if (image.labels === undefined) return;
            for (let i = 0; i < image.labels.length; i++) {
                let label = image.labels[i];
                ctx?.beginPath();
                let x1 = label.x1 / image.width * canvas.width;
                let y1 = label.y1 / image.height * canvas.height;
                let x2 = label.x2 / image.width * canvas.width;
                let y2 = label.y2 / image.height * canvas.height;
                ctx?.rect(x1, y1, x2 - x1, y2 - y1);
                ctx!.strokeStyle = config.label_config[parseInt(label.label)].color;
                ctx!.lineWidth = 4;
                ctx?.stroke();
            }
        });
    };

    const drawImage = (index: number) => {
        var canvas = document.getElementById("canvasModal") as HTMLCanvasElement;
        var parent = canvas.parentElement as HTMLDivElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        console.log(canvas.width, canvas.height);
        // canvas.height = parent.clientWidth / images[index].width * images[index].height;
        var ctx = canvas.getContext("2d");
        for (let i = 0; i < images[index].labels.length; i++) {
            let label = images[index].labels[i];
            ctx?.beginPath();
            let x1 = label.x1 / images[index].width * canvas.width;
            let y1 = label.y1 / images[index].height * canvas.height;
            let x2 = label.x2 / images[index].width * canvas.width;
            let y2 = label.y2 / images[index].height * canvas.height;
            ctx?.rect(x1, y1, x2 - x1, y2 - y1);
            ctx!.strokeStyle = config.label_config[parseInt(label.label)].color;
            ctx!.lineWidth = 4;
            ctx?.stroke();
        }
    };

    const handleDelete = () => {
        setLoading(true)
        axios.delete(process.env.REACT_APP_API_URL + '/api/delete_images_between_starttime_endtime', {
            params: {
                starttime: dataRange[0].format("YYYY-MM-DD HH:mm:ss"),
                endtime: dataRange[1].format("YYYY-MM-DD HH:mm:ss"),
                label_only: labelOnly
            }
        }).then((res) => {
            console.log(res.data);
            setSuccessOpen(true);
            setAlertMsg(res.data.total + " image(s) deleted!");
            setPage(1);
            handleSearch();
        }).catch((err) => {
            console.log(err);
            setAlertMsg(err.response.data.detail);
            setErrorOpen(true);
        }).finally(() => {
            setLoading(false);
        })
    };

    useEffect(() => {
        init();
        window.addEventListener('resize', drawImages);
    }, []);

    useEffect(() => {
        setTimeout(() => {
            drawImages();
        }, 500);
    }, [images]);

    useEffect(() => {
        if (open) {
            drawImage(imgIndex);
        }
    }, [open]);

    useEffect(() => {
        handleSearch();
    }, [page, config]);

    return (
        <>
            <Box className="flex justify-between items-center px-6 pt-4">
                <Box className="font-semibold text-base text-gray-800">
                    Total: {total}
                </Box>
                <Box className="flex items-center gap-2">
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DateTimeRangePicker
                            slotProps={{ textField: { size: 'small' } }}
                            value={dataRange as any}
                            onChange={(newValue) => { setDataRange(newValue as Dayjs[]) }}
                        />
                    </LocalizationProvider>
                    <FormControlLabel control={<Checkbox checked={labelOnly} onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setLabelOnly(event.target.checked);
                    }} />} label="Label Only" />
                    <Button variant="contained" onClick={handleSearch}>Search</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
                </Box>
            </Box>
            <Grid container className="px-6 pb-4" spacing={2} sx={{ marginTop: "0px" }}>
                {
                    loading ?
                        <div className="basis-full flex mt-16 h-48 justify-center bg-opacity-80">
                            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black opacity-60"></div>
                        </div>
                        :
                        images.length === 0 ?
                            <Box className="flex items-center justify-center py-4 w-full">
                                <DotLottiePlayer
                                    src="/nofile.json"
                                    autoplay
                                    loop
                                    style={{ width: "400px", height: "400px" }}
                                >
                                </DotLottiePlayer>
                            </Box>
                            :
                            images.map((image: any, index: any) => {
                                return (
                                    <Grid item xs={2} sm={2} md={2} key={index}>
                                        <Card className="cursor-pointer" onClick={() => { handleOpen(index) }}>
                                            <CardHeader
                                                // subheader={image.created_at.split("T").join(" ")}
                                                subheader={image.origin_filename}
                                            />
                                            <CardMedia className="relative">
                                                <img id={"img" + index} src={process.env.REACT_APP_API_URL + image.url} />
                                                <canvas id={"canvas" + index} className="absolute top-0 left-0"></canvas>
                                            </CardMedia>
                                        </Card>
                                    </Grid>
                                );
                            })
                }
            </Grid>
            <Pagination className="float-right pr-3 pb-4" count={totalPages} color="primary" onChange={(e, v) => { handlePageChange(v) }} />
            <Modal
                keepMounted
                open={open}
                onClose={handleClose}
                aria-labelledby="parent-modal-title"
                aria-describedby="parent-modal-description"
                className="flex justify-center items-center"
            >
                <Box className="relative" sx={{
                    position: 'absolute' as 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '80%',
                    height: '80%',
                }}>
                    {open && <img style={{ width: "100%", height: "100%" }} id={"imgModal"} src={process.env.REACT_APP_API_URL + images[imgIndex].url} />}
                    <canvas id={"canvasModal"} className="absolute top-0 left-0"></canvas>
                </Box>
            </Modal>
            <RobotSnackbar errorOpen={errorOpen} setErrorOpen={setErrorOpen} successOpen={successOpen} setSuccessOpen={setSuccessOpen} alertMsg={alertMsg} setAlertMsg={setAlertMsg} />
        </>
    );
}