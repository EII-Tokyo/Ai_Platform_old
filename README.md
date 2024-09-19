# AI platform

- [AI platform](#ai-platform)
  - [Preparation](#preparation)
  - [Configuration](#configuration)
    - [Bucket \& Key](#bucket--key)
    - [Grafana](#grafana)
  - [Usage](#usage)
    - [Add Model and upload image/video](#add-model-and-upload-imagevideo)
    - [write frontend code](#write-frontend-code)
  - [Ref](#ref)

## Preparation

1. [cuda](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/)

2. [docker](https://docs.docker.com/engine/install/ubuntu/)
   **IMPORTANT**  Don't install Desktop Docker!

3. [docker compose](https://docs.docker.com/compose/install/linux/#install-using-the-repository)

4. [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)

   ```bash
   # Configuring Docker
   sudo nvidia-ctk runtime configure --runtime=docker

   # Restart the Docker daemon
   sudo systemctl restart docker
   ```

5. [MongoDB Compass](https://www.mongodb.com/docs/compass/current/install)

## Configuration

```bash
# start docker
sudo docker compose -f docker-compose-dev.yml up
```

| Name     | Dev Port | Prod Port |
| :----    | :---:    | :---:     |
| frontend | 8002     | 80        |
| backend  | 8008     | 8000      |
| minio    | 9092     | 9000      |
| flower   | 5556     | 5555      |
| loki     | 3100     | 3100      |
| redis    | 6379     | 6379      |
| mongo    | 27018    | 27017     |
| grafana  | 3001     | -         |

### Bucket & Key 

1. Open MINIO http://localhost:9092
2. Create a new bucket : **yolo-files**

   ```python
   # backend/apis/medias.py
   minio_access_key = os.environ.get('MINIO_ACCESS_KEY')
   minio_secret_key = os.environ.get('MINIO_SECRET_KEY')
   minio_bucket = "yolo-files"
   ```

3. Change access policy [private -> public]
4. create *access key* and paste public key and secret key to docker-compose

   ```yaml
   - MINIO_ACCESS_KEY= new_public_key
   - MINIO_SECRET_KEY= new_secret_key
   ```

### Grafana

1. confirm the docker name, **MUST NOT** include **-** symbol.
   + Error: yolo-dev
   + Correct: yolo_dev

   ```yaml
   # docker-compose-dev.yml
   name: yolotester_dev
   ```

2. fill the docker name into the *protail-config.yaml* .

   ```yaml
   # promtail/promtail-config.yaml
   values: ["com.docker.compose.project=yolotester-dev"]
   ```

3. restart docker compose

   ```bash
   #restart docker
   sudo docker compose -f docker-compose-dev.yml up -d
   ```

## Usage

### Add Model and upload image/video

1. Open EII_boot frontend http://localhost:8002
2. Choice Model and upload.

   ![insert model](./readme_img/model.png)

3. train model and view th result.

### write frontend code

1. check *Node.js* and *Yarn* is installed.

   ```bash
   node -v
   yarn -v
   ```

2. if not install 

   ``` bash
   sudo apt update
   sudo apt install nodejs
   sudo apt install npm
   npm install --global yarn
   ```

3. change IP address.

   first view current ip address

   ```bash
   # only view ip address
   ifconfig | grep 'inet ' | grep -v '127.0.0.1' | awk '{ print $2 }'
   172.17.0.1
   192.168.1.16 <-- your host ip address
   ```

   write your ip address to **.env.development** files.

   ```python
   # frontend/.env.development
   REACT_APP_API_URL=http://<your_ip_address>:8002
   ```

4. boot frontend program.

   ```bash
   cd frontend && yarn && yarn start
   ```

## Ref

1. [MUI](https://mui.com/)
2. [tailwindcss](https://tailwindcss.com/)