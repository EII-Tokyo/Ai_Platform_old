# FROM lyl472324464/lyl:eii-robot-frontend

FROM ubuntu:latest

RUN apt update -y && apt install -y nginx && apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -

RUN apt install -y nodejs

RUN npm install -g yarn

# COPY . /frontend
# Copy libnvcuvid.so.1 from the host to a directory in the container
#COPY COPY ./libnvcuvid.so.1 /usr/lib/x86_64-linux-gnu/

# FROM nginx:1.15.9-alpine
COPY . /frontend
WORKDIR /frontend
RUN mkdir -p /var/www/html
# RUN node -v
# RUN yarn install
RUN yarn build
RUN cp -r ./build/* /var/www/html
# RUN rm /etc/nginx/conf.d/default.conf
RUN cp ./conf.d/* /etc/nginx/conf.d
RUN rm -rf /etc/nginx/sites-enabled/default

# RUN rm /etc/nginx/conf.d/default.conf
# COPY ./prod.conf /etc/nginx/conf.d
# COPY ./dev.conf /etc/nginx/conf.d
