import * as React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Button, Checkbox, Divider, FormControl, FormControlLabel, FormGroup, FormLabel, OutlinedInput, Switch, TextField, styled } from '@mui/material';
import { Config } from '../interface';
import axios from 'axios';
import { SketchPicker } from 'react-color';

interface SideBarProps {
    config: Config
    setConfig: React.Dispatch<React.SetStateAction<Config>>
}

const ConfigContainer = styled(Box)({
    backgroundColor: 'white',
    boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.02), 0px 6px 12px rgba(0, 0, 0, 0.02)',
    padding: "16px",
});


function ColorPicker({ label, color, change_color }: { label: string, color: string, change_color: (label: string, color: string) => void }) {
    const [displayColorPicker, setDisplayColorPicker] = React.useState(false);
    const handleClick = () => {
        setDisplayColorPicker(!displayColorPicker);
    }
    const handleClose = () => {
        setDisplayColorPicker(false);
    }
    const handleChange = (color: any) => {
        change_color(label, color.hex);
    }
    return (
        <div style={{position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: "center", marginTop: '8px'}}>
            <Typography variant="body1">
                {label}
            </Typography>
            <div style={{
                padding: '5px',
                background: '#fff',
                borderRadius: '1px',
                boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
                display: 'inline-block',
                cursor: 'pointer',
            }} onClick={handleClick}>
                <div style={{
                    width: '36px',
                    height: '14px',
                    borderRadius: '2px',
                    background: color,
                }} />
            </div>
            {displayColorPicker ? <div style={{
                position: 'absolute',
                zIndex: '2',
            }}>
                <div style={{
                    position: 'fixed',
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px',
                }} onClick={handleClose} />
                <SketchPicker color={color} onChangeComplete={handleChange} />
            </div> : null}

        </div>
    )
}

export default function SideBar({ config, setConfig }: SideBarProps) {
    const [threshold, setThreshold] = React.useState<any>(0.65);
    React.useEffect(() => {
        setThreshold(config.score_threshold)
    }, [config])

    const change_detect = (label: string, value: boolean) => {
        let current_config = config
        current_config.label_config.forEach((label_config) => {
            if (label_config.label == label) {
                label_config.detect = value
            }
        })
        update_config(current_config)
    }

    const check_threshold = (value: number) => {
        if (isNaN(value) || !Number.isFinite(value) || value < 0 || value > 1) {
            return false
        } else {
            return true
        }
    }

    const update_config = (current_config: Config) => {
        axios.post(process.env.REACT_APP_API_URL + '/api/update_config', {
            name: "all",
            config: JSON.stringify(current_config)
        }).then((res) => {
            setConfig(JSON.parse(res.data.config));
        }).catch((err) => {
            console.log(err);
        })
    }

    const change_color = (label: string, color: string) => {
        let current_config = config
        current_config.label_config.forEach((label_config) => {
            if (label_config.label == label) {
                label_config.color = color
            }
        })
        update_config(current_config)
    }

    return (
        <>
            {JSON.stringify(config) != "{}" &&
                <Box
                    sx={{ width: "350px", padding: "16px", display: "flex", flexDirection: "column", gap: "16px", height: "100%", overflowY: "auto" }}
                >
                    <ConfigContainer>
                        <Typography variant="subtitle2" gutterBottom>
                            Select the items to be recycled
                        </Typography>
                        <FormGroup>
                            {config.label_config.map((label) => {
                                return <FormControlLabel control={<Checkbox checked={label.detect} onChange={(event) => { change_detect(label.label, event.target.checked) }} />} label={label.label} />
                            }
                            )}
                        </FormGroup>
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" gutterBottom>
                            Select the colors of the bounding boxes
                        </Typography>
                        {config.label_config.map((label) => {
                            return <ColorPicker label={label.label} color={label.color} change_color={change_color} />
                        }
                        )}
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            Threshold ( must between 0-1 )
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            value={threshold}
                            error={!check_threshold(threshold)}
                            onChange={(event) => {
                                setThreshold(event.target.value)
                                const floatVal = parseFloat(event.target.value);
                                if (check_threshold(floatVal)) {
                                    if (floatVal !== config.score_threshold) {
                                        update_config({ ...config, score_threshold: floatVal })
                                    }
                                }
                            }}
                            id="outlined-number"
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            AI Image Width
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.ai_img_size}
                            onChange={(event) => {
                                update_config({ ...config, ai_img_size: parseInt(event.target.value) })
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            x_offset
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.x_offset}
                            onChange={(event) => {
                                update_config({ ...config, x_offset: parseInt(event.target.value) })
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            y_offset
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.y_offset}
                            onChange={(event) => {
                                update_config({ ...config, y_offset: parseInt(event.target.value) })
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            cx_min
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.cx_min}
                            onChange={(event) => {
                                update_config({ ...config, cx_min: parseInt(event.target.value) })
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            cx_max
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.cx_max}
                            onChange={(event) => {
                                update_config({ ...config, cx_max: parseInt(event.target.value)})
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            cy_min
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.cy_min}
                            onChange={(event) => {
                                update_config({ ...config, cy_min: parseInt(event.target.value)})
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            cy_max
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.cy_max}
                            onChange={(event) => {
                                update_config({ ...config, cy_max: parseInt(event.target.value) })
                            }}
                        />
                    </ConfigContainer>

                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            Font Size
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.font_size}
                            onChange={(event) => {
                                update_config({ ...config, font_size: parseInt(event.target.value)})
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer>
                        <Typography variant="subtitle2" sx={{ margin: "0px 0 8px 0" }}>
                            Font Weight
                        </Typography>
                        <OutlinedInput
                            fullWidth
                            type='number'
                            value={config.font_weight}
                            onChange={(event) => {
                                update_config({ ...config, font_weight: parseInt(event.target.value) })
                            }}
                        />
                    </ConfigContainer>
                    <ConfigContainer sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="subtitle2" sx={{ margin: "8px 0 0px 0" }}>
                            Show Confidence
                        </Typography>
                        <Switch
                            checked={config.show_confidence}
                            onChange={(event) => {
                                update_config({ ...config, show_confidence: event.target.checked})
                            }}
                        />
                    </ConfigContainer>
                </Box>
            }
        </>
    );
}