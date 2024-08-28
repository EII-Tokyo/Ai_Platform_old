FROM pytorch/pytorch:2.4.0-cuda11.8-cudnn9-runtime

# ENV TZ=Asia/Tokyo
# RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get install -y libavcodec-extra libx264-dev python3 python3-pip
RUN apt-get install -y ffmpeg

COPY . /backend
WORKDIR /backend

RUN pip install -r requirements.txt



