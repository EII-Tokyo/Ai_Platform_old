# Install

1. cuda cudnn docker docker-compose nvidia-container-toolkit 

2. minio id and secret, public imgs bucket

# Usage

```bash
docker compose up -d
```

# install

## 1. install docker

https://docs.docker.com/engine/install/ubuntu/

```
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

```
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 2. docker compose

```
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

## 3. nvidia-container-toolkit

```
sudo nvidia-ctk runtime configure --runtime=docker
```

https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

## 4. reboot docker

```
sudo systemctl restart docker
```

## 5. start docker

minio id and secret, public imgs bucket

```
sudo docker compose up
```

1. create a new bucket  in MINIO , name : imgs
2. change access policy [private -> public]
3. create 'access key' and paste public key to docker-compose
   replace  by new public key
    ```
    - MINIO_ACCESS_KEY= new_public_key
    ```
4. restart docker compose

## 6. mongo compass

```
```
## 7. grafana config

promtail/promtail-config.yaml
        values: ["com.docker.compose.project=yolotester-dev"]

== docker_compose.yml
        name: yolotester-dev

# Usage

## 1. add a MODEL

```
sudo docker compose up

```

## 2. EII boot

todo:
1. how to add MODEL
2. how to run MODEL


# devp

1. yarn 
2. yarn start
3. frontend/.env.development :
   REACT_APP_API_URL=http://192.168.1.16:8002
   REACT_APP_API_URL=http://my_ip_address:8002

docker compose 