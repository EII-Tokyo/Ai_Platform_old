FROM pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime

# ENV TZ=Asia/Tokyo
# RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get install -y libavcodec-extra libx264-dev python3 python3-pip
RUN apt-get install -y ffmpeg && apt-get install -y wget && apt install -y curl

COPY . /backend
WORKDIR /backend

RUN pip install -r requirements.txt