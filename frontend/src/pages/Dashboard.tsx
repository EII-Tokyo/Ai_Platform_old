import * as React from 'react';
import { Config, DashboardData } from '../interface';
import axios from 'axios';
import { Box, Paper, Typography, styled } from '@mui/material';
import * as echarts from 'echarts';

const Container = styled(Box)({
    backgroundColor: 'white',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.02), 0px 6px 12px rgba(0, 0, 0, 0.02)',
    padding: "16px",
    flex: "1 1 50%",
    height: '360px',
});

const get_24h_before = () => {
    const date = new Date();
    const dateList = []
    for (let i = 0; i < 24; i++) {
        dateList.push({
            hour: format_date_yyyy_mm_dd(new Date(date.getTime() - i * 60 * 60 * 1000)),
            count: 0
        });
    }
    return dateList
}

const format_date_yyyy_mm_dd = (date: Date) => {
    const month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
    const hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
    return `${date.getFullYear()}-${month}-${day} ${hours}:00:00`
}

export default function Dashboard() {
    const [config, setConfig] = React.useState<Config>({} as Config);
    const [data, setData] = React.useState<DashboardData>({} as any);
    React.useEffect(() => {
        axios.get(process.env.REACT_APP_API_URL + '/api/get_config?name=all')
            .then((res) => {
                setConfig(JSON.parse(res.data.config));
            })
        axios.get(process.env.REACT_APP_API_URL + '/api/dashboard').then((res) => {
            setData(res.data);
        });
        window.addEventListener('resize', () => {
            draw_dashboard();
        })
    }, []);

    const labelHourChart = React.useRef<any>();
    const imageHourChart = React.useRef<any>();
    const labelByKindChart = React.useRef<any>();

    React.useEffect(() => {
        draw_dashboard();
    }, [data, config]);

    const draw_dashboard = () => {
        if (JSON.stringify(data) != "{}") {
            let labelHourData = get_24h_before();
            let imageHourData = get_24h_before();
            data.group_labels_by_hour.forEach((item: any) => {
                const index = labelHourData.findIndex((i: any) => i.hour == item.hour);
                if (index != -1) {
                    labelHourData[index].count = item.count;
                }
            });
            data.group_images_by_hour.forEach((item: any) => {
                const index = imageHourData.findIndex((i: any) => i.hour == item.hour);
                if (index != -1) {
                    imageHourData[index].count = item.count;
                }
            });
            labelHourData.reverse()
            imageHourData.reverse()
            create_label_hour_chart(labelHourData.map((item: any) => item.hour), labelHourData.map((item: any) => item.count));
            create_image_hour_chart(imageHourData.map((item: any) => item.hour), imageHourData.map((item: any) => item.count));
            let labelByKindData = [];
            for (let c in config.label_config) {
                let kind = config.label_config[c].label;
                let count = 0;
                for (let d in data.group_labels_by_kind) {
                    if (data.group_labels_by_kind[d].label == c) {
                        count = data.group_labels_by_kind[d].count;
                        break;
                    }
                }
                labelByKindData.push({
                    kind: kind,
                    count: count
                });
            }
            console.log(labelByKindData, data);
            create_label_by_kind_chart(labelByKindData.map((item: any) => item.kind), labelByKindData.map((item: any) => item.count));
        }
    }

    const create_label_hour_chart = (xData: string[], yData: number[]) => {
        const option = {
            tooltip: {
                trigger: 'axis'
            },
            grid: {
                top: 20,
                left: Math.max(...yData) < 10 ? 30 : (Math.max(...yData) + "").length * 10 + 10,
                right: 0,
                bottom: 30,
            },
            xAxis: {
                type: 'category',
                data: xData,
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                splitLine: {
                    show: false
                }
            },
            series: [
                {
                    showSymbol: false,
                    type: 'line',
                    data: yData
                }
            ]
        };
        const chart = echarts.init(labelHourChart.current);
        chart.setOption(option);
    }

    const create_image_hour_chart = (xData: string[], yData: number[]) => {
        const option = {
            tooltip: {
                trigger: 'axis'
            },
            grid: {
                top: 20,
                left: Math.max(...yData) < 10 ? 30 : (Math.max(...yData) + "").length * 10 + 10,
                right: 0,
                bottom: 30,
            },
            xAxis: {
                type: 'category',
                data: xData,
                splitLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                splitLine: {
                    show: false
                }
            },
            series: [
                {
                    showSymbol: false,
                    type: 'line',
                    data: yData
                }
            ]
        };
        const chart = echarts.init(imageHourChart.current);
        chart.setOption(option);
    }

    const create_label_by_kind_chart = (xData: string[], yData: number[]) => {
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                top: 20,
                left: Math.max(...yData) < 10 ? 30 : (Math.max(...yData) + "").length * 10 + 10,
                right: 0,
                bottom: 30,
            },
            xAxis: [
                {
                    type: 'category',
                    data: xData,
                    axisTick: {
                        alignWithLabel: true
                    }
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    axisLine: { show: false },
                    splitLine: {
                        show: false
                    }
                }
            ],
            series: [
                {
                    name: 'Number',
                    type: 'bar',
                    barWidth: '60%',
                    data: yData
                }
            ]
        };
        const chart = echarts.init(labelByKindChart.current);
        chart.setOption(option);
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '24px', gap: '16px', minHeight: "70vh" }}>
            {
                JSON.stringify(data) != "{}" && JSON.stringify(config) != "{}"
                    ?
                    <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: '16px', width: "100%", padding: "0 24px" }}>
                            <Box sx={{ display: 'flex', flex: "1 1 50%", gap: '16px' }}>
                                <Container sx={{ flex: "1 1 50%", display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Typography variant="subtitle2">
                                        Total Bottles
                                    </Typography>
                                    <Typography variant="h1" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "4rem", wordBreak: "break-word" }}>
                                        {data.total_labels}
                                    </Typography>
                                </Container>
                                <Container sx={{ flex: "1 1 50%", display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Typography variant="subtitle2" >
                                        Total Frames
                                    </Typography>
                                    <Typography variant="h1" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: "4rem", wordBreak: "break-word" }}>
                                        {data.total_images}
                                    </Typography>
                                </Container>
                            </Box>
                            <Container>
                                <Typography variant="subtitle2" sx={{ margin: "0" }}>
                                    Bottle Count by Kind
                                </Typography>
                                <Box ref={labelByKindChart} sx={{ width: '100%', height: '300px' }} />
                            </Container>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: '16px', width: "100%", padding: "0 24px" }}>
                            <Container>
                                <Typography variant="subtitle2" sx={{ margin: "0" }}>
                                    Bottle Count in 24h
                                </Typography>
                                <Box ref={labelHourChart} sx={{ width: '100%', height: '300px' }} />
                            </Container>
                            <Container>
                                <Typography variant="subtitle2" sx={{ margin: "0" }}>
                                    Frame Count in 24h
                                </Typography>
                                <Box ref={imageHourChart} sx={{ width: '100%', height: '300px' }} />
                            </Container>
                        </Box>
                    </>
                    :
                    <div className="basis-full flex mt-16 justify-center bg-opacity-80">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black opacity-60"></div>
                    </div>
            }
        </Box>
    );
}