import React, { useEffect, useRef } from 'react';
import SideBar from '../components/SideBar';
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

export default function View() {
  const ws = useRef<WebSocket>();
  const canvasParentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = React.useState<Config>({} as Config);
  const [open, setOpen] = React.useState(false);
  const [alertMsg, setAlertMsg] = React.useState("");
  const handleClose = () => {
    setOpen(false);
  };
  // wait for ws connection
  const [connected, setConnected] = React.useState(false);
  // wait start or stop
  const [waiting, setWaiting] = React.useState(false);

  const start_stop = (value: string) => {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    let current_config = config
    current_config.status = value
    setWaiting(true);
    axios.post(process.env.REACT_APP_API_URL + '/api/update_config', {
      name: "all",
      config: JSON.stringify(current_config)
    }).then((res) => {
      setConfig(JSON.parse(res.data.config));
    }).catch((err) => {
      console.log(err);
      setWaiting(false);
    })
  }

  window.addEventListener('resize', () => {
    setCanvas();
  });

  const setCanvas = () => {
    const canvas = canvasRef.current;
    const canvasParent = canvasParentRef.current;
    if (canvas && canvasParent) {
      if (canvasParent.clientWidth / canvasParent.clientHeight > 16 / 9) {
        canvas.width = canvasParent.clientHeight * 16 / 9;
        canvas.height = canvasParent.clientHeight;
      } else {
        canvas.width = canvasParent.clientWidth;
        canvas.height = canvasParent.clientWidth * 9 / 16;
      }
    }
  }

  const processMsg = (msg: string) => {
    let msg_json = JSON.parse(msg);
    switch (msg_json.type) {
      case 'image':
        setWaiting(false);
        draw(msg_json.message);
        break;
      case 'signal':
        setWaiting(false);
        break;
      case 'warning':
        setOpen(true);
        setAlertMsg(msg_json.message);
        break;  
    }
  }

  const draw = (data: ImageData) => {
    if (config.status === "stop") {
      return;
    }
    var image = new Image();

    // 指定图像URL
    image.src = data.url;

    // 等待图像加载完成
    image.onload = () => {
      // 在画布上绘制图像
      var canvas = canvasRef.current;
      if (canvas) {
        var context = canvas.getContext('2d');
        if (context) {
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          for (let label of data.labels) {
            if (config.label_config[parseInt(label.label)].detect === true) {
              context.beginPath();
              context.lineWidth = 2;
              context.strokeStyle = config.label_config[parseInt(label.label)].color;
              context.strokeRect(label.x1 / data.width * canvas.width, label.y1 / data.height * canvas.height, (label.x2 - label.x1) / data.width * canvas.width, (label.y2 - label.y1) / data.height * canvas.height);
              context.beginPath();
              context.fillStyle = config.pickup_color;
              context.arc(label.x_pickup / data.width * canvas.width, label.y_pickup / data.height * canvas.height, 5, 0, 2 * Math.PI)
              context.fill();
              context.font = config.font_weight + " " + config.font_size + "px Arial";
              context.fillStyle = config.label_config[parseInt(label.label)].color;
              let txt = ""
              if(config.show_confidence === true){
                txt = config.label_config[parseInt(label.label)].label + " " + label.confidence.toFixed(2)
              } else {
                txt = config.label_config[parseInt(label.label)].label
              }
              const textMetrics = context.measureText(txt);
              // console.log(textMetrics)
              context.fillRect(label.x1 / data.width * canvas.width - 1, label.y1 / data.height * canvas.height - textMetrics.actualBoundingBoxAscent - 2, context.measureText(txt).width + 4, textMetrics.actualBoundingBoxAscent + 4);
              context.fillStyle = "#ffffff";
              context.fillText(txt, label.x1 / data.width * canvas.width, label.y1 / data.height * canvas.height - 1);
            }
          }
          // draw time
          context.beginPath();
          context.fillStyle = "#D32F2F";
          context.font = "50px serif";
          context.fillText(data.time, 30, 50);
          // draw xmin xmax ymin ymax
          context.beginPath();
          context.lineWidth = 10;
          context.strokeStyle = "#D32F2F";
          context.moveTo(config.cx_min / data.width * canvas.width, config.cy_min / data.height * canvas.height);
          context.lineTo(config.cx_max / data.width * canvas.width, config.cy_min / data.height * canvas.height);
          context.stroke();
          context.beginPath();
          context.moveTo(config.cx_min / data.width * canvas.width, config.cy_max / data.height * canvas.height);
          context.lineTo(config.cx_max / data.width * canvas.width, config.cy_max / data.height * canvas.height);
          context.stroke();
        }
      }
    };
  }

  useEffect(() => {
    // set the canvas
    setCanvas();
    // get the current config
    axios.get(process.env.REACT_APP_API_URL + '/api/get_config?name=all')
      .then((res) => {
        setConfig(JSON.parse(res.data.config));
      })
  }, []);

  // useEffect(() => {
    // connect to the websocket
    // console.log(window.location);
    // const proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    // ws.current = new WebSocket(proto + window.location.host + process.env.REACT_APP_API_URL + '/api/ws');
  //   ws.current.onopen = () => {
  //     console.log('connected');
  //     setConnected(false);
  //     setOpen(false);
  //   };
  //   ws.current.onmessage = (e) => {
  //     processMsg(e.data);
  //   };
  //   ws.current.onclose = () => {
  //     console.log('disconnected');
  //     setConnected(true);
  //     setOpen(true);
  //     setAlertMsg("Disconnect from the robot. Please refresh the page.");
  //   };
  //   return () => {
  //     ws.current?.close();
  //   }
  // }, [config]);

  return (
    <StyledRoot>
      <SideBar config={config} setConfig={setConfig} />
      <Box style={{ flexGrow: 1, height: "100%", display: 'flex', flexDirection: 'column' }}>
        <ButtonContainer>
          <Box style={{ flexGrow: 1 }}></Box>
          <Button sx={{ textTransform: "none" }} onClick={() => { start_stop("start") }} disabled={connected || waiting || config.status == 'start'} variant="contained" color="success" size='large'>
            Start
          </Button>
          <Button sx={{ textTransform: "none" }} onClick={() => { start_stop("stop") }} disabled={connected || waiting || config.status == 'stop'} variant="contained" color="error" size='large'>
            Stop
          </Button>
        </ButtonContainer>
        <Box sx={{ flexGrow: 1, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: "relative" }} ref={canvasParentRef}>
          <canvas ref={canvasRef} style={{ backgroundColor: 'white', boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.02), 0px 6px 12px rgba(0, 0, 0, 0.02)' }} />
          {!connected && !waiting && config.status == 'stop' && <NotStartedTwoToneIcon onClick={() => { start_stop("start") }} sx={{ position: 'absolute', fontSize: '128px', color: 'rgba(0, 0, 0, 0.2)', cursor: 'pointer' }} />}
          {!connected && waiting && <Box sx={{ position: 'absolute', fontSize: '128px', color: 'rgba(0, 0, 0, 0.2)' }}>Waiting...</Box>}
          {/* {connected && <Box sx={{position: 'absolute', fontSize: '128px', color: 'rgba(0, 0, 0, 0.2)'}}>Connecting...</Box>}           */}
        </Box>
        {/* <img src={imgSrc} style={{width: '1280px', height: '720px'}}/> */}
        <Box sx={{ height: '24px' }}></Box>
      </Box>
      <Snackbar open={open} resumeHideDuration={5000} anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
        onClose={handleClose}>
        <Alert variant="filled" severity="error" sx={{ width: '100%' }} onClose={handleClose}>
          {alertMsg}
        </Alert>
      </Snackbar>
    </StyledRoot>
  );
}