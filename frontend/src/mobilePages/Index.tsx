import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Alert, Box, Button, Snackbar } from '@mui/material';
import theme from '../theme/theme';
import axios from 'axios';
import NotStartedTwoToneIcon from '@mui/icons-material/NotStartedTwoTone';
import { Config, ImageData } from '../interface';
import {
  EmailShareButton,
  FacebookShareButton,
  GabShareButton,
  HatenaShareButton,
  InstapaperShareButton,
  LineShareButton,
  LinkedinShareButton,
  LivejournalShareButton,
  MailruShareButton,
  OKShareButton,
  PinterestShareButton,
  PocketShareButton,
  RedditShareButton,
  TelegramShareButton,
  TumblrShareButton,
  TwitterShareButton,
  ViberShareButton,
  VKShareButton,
  WhatsappShareButton,
  WorkplaceShareButton,
} from "react-share";
import {
  EmailIcon,
  FacebookIcon,
  FacebookMessengerIcon,
  GabIcon,
  HatenaIcon,
  InstapaperIcon,
  LineIcon,
  LinkedinIcon,
  LivejournalIcon,
  MailruIcon,
  OKIcon,
  PinterestIcon,
  PocketIcon,
  RedditIcon,
  TelegramIcon,
  TumblrIcon,
  TwitterIcon,
  ViberIcon,
  VKIcon,
  WeiboIcon,
  WhatsappIcon,
  WorkplaceIcon,
  XIcon,
} from "react-share";

export default function View() {
  const [config, setConfig] = React.useState<Config>({} as Config);

  useEffect(() => {
    // get the current config
    axios.get(process.env.REACT_APP_API_URL + '/api/get_config?name=all')
      .then((res) => {
        setConfig(JSON.parse(res.data.config));
      })
    setInterval(() => {
      axios.get(process.env.REACT_APP_API_URL + '/api/get_config?name=all')
        .then((res) => {
          setConfig(JSON.parse(res.data.config));
        })
    }, 5000);
  }, []);

  const videoRef = useRef<any>();
  const playerRef = useRef<any>();

  useEffect(() => {
    if (videoRef.current && !playerRef.current) {
      console.log("start video");
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        fluid: true,
        muted: true,
        poster: "/hls/imgs/img.jpg",
      });

      playerRef.current.src({
        type: 'application/x-mpegURL',
        src: "/hls/stream.m3u8",
      });
    }
  }, [videoRef, playerRef]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    }
  }, []);

  return (
    <>
      <Box sx={{ display: config.status == "start" ? 'flex' : "none", flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div data-vjs-player>
          <video ref={videoRef} className="video-js vjs-default-skin" />
        </div>
        <Box className="px-4 pt-4 w-full font-semibold text-lg">Bottle detectron with AI</Box>
        <Box className="px-4 pt-3 pb-2 w-full text-gray-800 text-sm">Shares:</Box>
        <Box className="flex gap-4 px-4">
          <TwitterShareButton url={window.location.href} title="EII Robot Platform">
            <img src="/x.jpg" alt="twitter" className="w-9 h-9 rounded-full" />
          </TwitterShareButton>
          <LineShareButton url={window.location.href} title="EII Robot Platform">
            <LineIcon size={36} round={true} />
          </LineShareButton>
          <EmailShareButton url={window.location.href} subject="EII Robot Platform">
            <EmailIcon size={36} round={true} />
          </EmailShareButton>
          <FacebookShareButton url={window.location.href} title="EII Robot Platform">
            <FacebookIcon size={36} round={true} />
          </FacebookShareButton>
          <WhatsappShareButton url={window.location.href} title="EII Robot Platform">
            <WhatsappIcon size={36} round={true} />
          </WhatsappShareButton>
          <TelegramShareButton url={window.location.href} title="EII Robot Platform">
            <TelegramIcon size={36} round={true} />
          </TelegramShareButton>
        </Box>
      </Box>
      <Box className="flex justify-center items-center p-4" sx={{ display: config.status == "start" ? 'none' : "flex", height: "calc(100vh - 64px)", width: "100%", fontSize: '36px', color: 'rgba(0, 0, 0, 0.2)' }}>
        <Box>The robot is not started</Box>
      </Box>
    </>
  );
}