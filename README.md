<div align="center">

# ELECTRO STORE
### He Thong Thuong Mai Dien Tu Microservices

**Do An Chuyen Nganh — Khoa Cong Nghe Thong Tin**
**Truong Dai hoc Nong Lam TP. Ho Chi Minh**

[![Java](https://img.shields.io/badge/Java-17-orange?style=flat-square&logo=openjdk)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-brightgreen?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=flat-square&logo=mysql)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7-red?style=flat-square&logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-required-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

</div>

---

## Muc Luc

- [Gioi thieu du an](#gioi-thieu-du-an)
- [Kien truc he thong](#kien-truc-he-thong)
- [Danh sach Microservices](#danh-sach-microservices)
- [Yeu cau moi truong](#yeu-cau-moi-truong)
- [Huong dan cai dat](#huong-dan-cai-dat)
- [Khoi chay he thong](#khoi-chay-he-thong)
- [Kiem tra trang thai](#kiem-tra-trang-thai)
- [Dung he thong](#dung-he-thong)
- [Cau hinh nang cao](#cau-hinh-nang-cao)
- [Xu ly loi thuong gap](#xu-ly-loi-thuong-gap)

---

## Gioi Thieu Du An

**Electro Store** la he thong thuong mai dien tu chuyen ban thiet bi dien tu, duoc xay dung theo mo hinh **Microservices Architecture**. Du an ung dung cac cong nghe hien dai bao gom:

- **Spring Boot 3** cho cac Java Microservices
- **AI Recommendation** (Item-based Collaborative Filtering) bang Python/FastAPI
- **RAG Chatbot** tich hop NVIDIA NIM + Pinecone Vector DB
- **Statistics Dashboard** voi AI-powered insights
- **Thanh toan VNPay** tich hop Sandbox
- **JWT + Google OAuth** cho xac thuc nguoi dung
- **Eureka Service Discovery** + API Gateway
- **Zipkin Distributed Tracing**

---

## Kien Truc He Thong

```
                       ┌─────────────────────┐
                       │    React Frontend    │
                       │     (Port: 5173)     │
                       └──────────┬───────────┘
                                  │ HTTP
          ┌───────────────────────▼───────────────────────┐
          │                   API Gateway                  │
          │                   (Port: 8080)                 │
          └────┬──────────────────┬──────────────────┬─────┘
               │                  │                  │
               ▼                  ▼                  ▼
        ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
        │auth-service │    │   catalog   │    │    user     │
        │  Port: 8081 │    │  Port: 8082 │    │  Port: 8083 │
        ├─────────────┤    ├─────────────┤    ├─────────────┤
        │    cart     │    │    order    │    │   review    │
        │  Port: 8084 │    │  Port: 8086 │    │  Port: 8087 │
        ├─────────────┤    ├─────────────┤    ├─────────────┤
        │ statistics  │    │   chatbot   │    │    reco     │
        │  Port: 8088 │    │  Port: 8089 │    │  Port: 5003 │
        └─────────────┘    └─────────────┘    └─────────────┘

          ┌─────────────────────────────────────────────────┐
          │              Infrastructure (Docker)             │
          │   MySQL: 3306  |  Redis: 6379  |  Zipkin: 9411  │
          └─────────────────────────────────────────────────┘
```

---

## Danh Sach Microservices

| Service | Cong nghe | Port | Mo ta |
|---------|-----------|------|-------|
| `discovery-server` | Spring Eureka | 8761 | Service Registry |
| `config-server` | Spring Cloud Config | 8888 | Cau hinh tap trung |
| `api-gateway` | Spring Cloud Gateway | 8080 | Cong vao duy nhat |
| `auth-service` | Spring Boot + JWT | 8081 | Xac thuc & phan quyen |
| `catalog-service` | Spring Boot | 8082 | Quan ly san pham & danh muc |
| `user-service` | Spring Boot | 8083 | Quan ly nguoi dung |
| `cart-service` | Spring Boot + Redis | 8084 | Gio hang |
| `order-service` | Spring Boot + VNPay | 8086 | Dat hang & thanh toan |
| `review-service` | Spring Boot | 8087 | Danh gia san pham |
| `statistics-service` | Spring Boot + AI | 8088 | Thong ke & phan tich |
| `chatbot-service` | Spring AI + RAG | 8089 | Chatbot tu van |
| `reco-service` | Python FastAPI | 5003 | Goi y san pham (CF) |
| `frontend` | React + Vite | 5173 | Giao dien nguoi dung |

---

## Yeu Cau Moi Truong

### Bat buoc

| Cong cu | Phien ban toi thieu | Kiem tra |
|---------|---------------------|---------|
| **JDK** | 17+ | `java -version` |
| **Maven** | 3.8+ | `mvn -version` |
| **Docker Desktop** | 24+ | `docker -v` |
| **Python** | 3.10+ | `python --version` |
| **Node.js** | 18+ | `node -v` |
| **Git** | 2.x | `git --version` |
| **PowerShell** | 5.1+ | `$PSVersionTable` |

### RAM khuyen nghi

| Che do | RAM toi thieu | Ghi chu |
|--------|---------------|---------|
| **Minimal** (6 services) | 8 GB | Discovery, Config, Auth, User, Catalog, Gateway |
| **Full** (tat ca) | 16 GB | Toan bo microservices |

---

## Huong Dan Cai Dat

### Buoc 1 — Clone du an

```bash
git clone https://github.com/NguyenVoHoaiBao-pro/DACN.git
cd DACN
```

### Buoc 2 — Cau hinh bien moi truong

```powershell
# Sao chep file cau hinh mau
Copy-Item .env.example .env
```

Mo file `.env` va dien thong tin:

```env
# -- Co so du lieu (Local Docker — mac dinh) -----------------------
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=

# -- Redis (Local Docker — mac dinh) -------------------------------
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# -- JWT Secret (toi thieu 32 ky tu) --------------------------------
JWT_SECRET=your_jwt_signing_secret_minimum_32_chars_here

# -- VNPay Sandbox --------------------------------------------------
VNPAY_TMN_CODE=1T0D4TUS
VNPAY_HASH_SECRET=UNVQ0K206FIK1H2PNV667HPWJ2ARZMWD

# -- Google OAuth (tuy chon) ----------------------------------------
# GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# -- Chatbot AI (tuy chon) ------------------------------------------
# NVIDIA_API_KEY=nvapi-...
# PINECONE_API_KEY=pcsk-...
# PINECONE_INDEX_NAME=electro-store-products
```

### Buoc 3 — Cai dat Python cho reco-service

```powershell
# Di chuyen vao thu muc reco-service
cd reco-service

# Tao virtual environment
python -m venv .venv

# Kich hoat virtual environment
.venv\Scripts\Activate.ps1

# Cai dat cac thu vien
pip install -r requirements.txt

# Quay lai thu muc goc
cd ..
```

### Buoc 4 — Cai dat Frontend

```powershell
cd frontend
npm install
cd ..
```

### Buoc 5 — Import Database

```powershell
# Khoi dong MySQL container truoc
docker compose up -d mysql

# Cho MySQL san sang (~30 giay), sau do import schema
docker exec -i electro-mysql mysql -uroot < electro_store_db.sql
```

---

## Khoi Chay He Thong

### Cach 1 — Khoi dong day du (khuyen nghi)

```powershell
# Chay tu thu muc goc du an
.\START.ps1
```

Script se tu dong thuc hien:
1. Khoi dong **Docker** (MySQL + Redis)
2. Build module **shared**
3. Khoi dong **tat ca Spring Boot services** theo thu tu phase
4. Kiem tra va bao cao trang thai

### Cach 2 — Che do Minimal (tiet kiem RAM)

```powershell
# Chi khoi dong 6 service cot loi
.\START.ps1 -Minimal
```

### Cach 3 — Bo qua Docker (DB da chay san)

```powershell
.\START.ps1 -SkipDocker
```

### Cach 4 — Bo qua Build (tang toc khi da build)

```powershell
.\START.ps1 -SkipDocker -SkipBuild
```

### Khoi dong reco-service (Python) — Thu cong

```powershell
cd reco-service
.venv\Scripts\Activate.ps1

# Huan luyen model lan dau
python collaborativefiltering/train.py

# Khoi dong FastAPI server
uvicorn app:app --host 0.0.0.0 --port 5003 --reload
```

### Khoi dong Frontend

```powershell
cd frontend
npm run dev
```

---

## Kiem Tra Trang Thai

Sau khi khoi dong, truy cap cac URL sau de kiem tra:

### Cong chinh

| URL | Mo ta |
|-----|-------|
| http://localhost:5173 | **Frontend** React App |
| http://localhost:8080 | **API Gateway** |
| http://localhost:8761 | **Eureka Dashboard** |
| http://localhost:9411 | **Zipkin Tracing** |

### Swagger UI tung service

| Service | URL |
|---------|-----|
| **All (qua Gateway)** | http://localhost:8080/swagger-ui.html |
| auth-service | http://localhost:8081/swagger-ui/index.html |
| catalog-service | http://localhost:8082/swagger-ui/index.html |
| user-service | http://localhost:8083/swagger-ui/index.html |
| cart-service | http://localhost:8084/swagger-ui/index.html |
| order-service | http://localhost:8086/swagger-ui/index.html |
| review-service | http://localhost:8087/swagger-ui/index.html |
| statistics-service | http://localhost:8088/swagger-ui/index.html |
| **reco-service** | http://localhost:5003/docs |

### Kiem tra hang loat

```powershell
.\check-all-services.ps1
```

### Xem log service

```powershell
# Log cua tung service nam trong .run/
Get-Content .run\catalog-service.log -Tail 50 -Wait
Get-Content .run\auth-service.log -Tail 50 -Wait
```

---

## Dung He Thong

```powershell
# Dung tat ca (Java services + Docker)
.\STOP.ps1

# Chi dung Java, giu MySQL + Redis chay
.\STOP.ps1 -KeepInfra
```

---

## Cau Hinh Nang Cao

### Su dung Aiven MySQL (Cloud)

```env
MYSQL_HOST=mysql-xxxxx.i.aivencloud.com
MYSQL_PORT=28570
MYSQL_USER=avnadmin
MYSQL_PASSWORD=your_aiven_password
MYSQL_USE_SSL=true
MYSQL_SSL_MODE=REQUIRED
```

Sau do khoi dong voi:

```powershell
.\START.ps1 -SkipDocker
```

### Bat Zipkin Tracing

```powershell
# Khoi dong Zipkin container
docker compose up -d zipkin

# Truy cap UI
Start-Process "http://localhost:9411"
```

### Cau hinh Chatbot RAG (NVIDIA + Pinecone)

```env
NVIDIA_API_KEY=nvapi-your_key_here
NVIDIA_CHAT_MODEL=meta/llama-3.1-8b-instruct
NVIDIA_EMBEDDING_MODEL=nvidia/nv-embed-v1
PINECONE_API_KEY=pcsk-your_key_here
PINECONE_INDEX_NAME=electro-store-products
```

> **Luu y**: Tao Pinecone index voi `dimensions=4096`, `metric=cosine` tren [app.pinecone.io](https://app.pinecone.io)

---

## Xu Ly Loi Thuong Gap

### Loi: Port da duoc su dung

```powershell
# Kiem tra process dang dung port (vd: 8080)
netstat -ano | findstr :8080

# Kill process theo PID
taskkill /PID <PID> /F
```

### Loi: Build shared that bai (o C: day)

```powershell
# Bo qua build neu shared jar da co
.\START.ps1 -SkipDocker -SkipBuild
```

### Loi: MySQL khong ket noi duoc

```powershell
# Kiem tra container dang chay
docker ps

# Khoi dong lai MySQL
docker compose restart mysql

# Xem log MySQL
docker logs electro-mysql
```

### Loi: reco-service "Model chua duoc nap"

```powershell
# Huan luyen model truoc
cd reco-service
.venv\Scripts\Activate.ps1
python collaborativefiltering/train.py

# Hoac goi API retrain
Invoke-RestMethod -Uri "http://localhost:5003/api/retrain" -Method POST
```

### Loi: Service DOWN sau khi khoi dong

```powershell
# Doi them 30-60 giay roi kiem tra lai
Start-Sleep 60
.\check-all-services.ps1

# Neu van loi, xem log
Get-Content .run\<ten-service>.log -Tail 100
```

### Loi: PowerShell khong cho chay script

```powershell
# Chay voi quyen Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Cau Truc Thu Muc

```
DACN/
├── api-gateway/             # Spring Cloud Gateway
├── auth-service/            # Xac thuc JWT + OAuth
├── cart-service/            # Gio hang (Redis)
├── catalog-service/         # San pham & Danh muc
├── chatbot-service/         # RAG Chatbot (NVIDIA + Pinecone)
├── config-repo/             # Cau hinh tap trung
├── config-server/           # Spring Cloud Config Server
├── database/                # Schema SQL
├── discovery-server/        # Eureka Service Registry
├── docker/                  # Docker init scripts
├── docs/                    # Tai lieu ky thuat
├── frontend/                # React + Vite UI
├── order-service/           # Dat hang & VNPay
├── reco-service/            # AI Goi y (Python FastAPI)
│   ├── collaborativefiltering/
│   │   ├── train.py         # Pipeline huan luyen CF
│   │   ├── recommend.py     # Engine goi y
│   │   ├── data_sources.py  # Tang du lieu
│   │   └── service_client.py# HTTP client
│   └── app.py               # FastAPI entrypoint
├── review-service/          # Danh gia san pham
├── scripts/                 # PowerShell utilities
├── shared/                  # Maven shared library
├── statistics-service/      # Thong ke & AI Analytics
├── user-service/            # Quan ly nguoi dung
├── docker-compose.yml       # Ha tang Docker
├── .env.example             # Mau bien moi truong
├── START.ps1                # Script khoi dong
└── STOP.ps1                 # Script dung he thong
```

---

## Cong Nghe Su Dung

| Linh vuc | Cong nghe |
|----------|-----------|
| **Backend Java** | Spring Boot 3, Spring Cloud, Spring Security |
| **Service Mesh** | Eureka Discovery, Spring Cloud Gateway, Config Server |
| **AI/ML** | Python, FastAPI, scikit-surprise, Collaborative Filtering |
| **Chatbot** | Spring AI, NVIDIA NIM, Pinecone Vector DB, RAG |
| **Co so du lieu** | MySQL 8.0, Redis 7 |
| **Thanh toan** | VNPay Sandbox |
| **Tracing** | Zipkin, Micrometer OTEL |
| **Frontend** | React, Vite |
| **Container** | Docker, Docker Compose |
| **Build Tool** | Maven (Java), pip (Python), npm (Frontend) |

---

<div align="center">

**© 2024 Electro Store — Do An Chuyen Nganh**
**Khoa Cong Nghe Thong Tin — Dai Hoc Nong Lam TP. HCM**

</div>
