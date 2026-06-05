# Sử dụng base image Python 3.9 phiên bản Slim (siêu nhẹ)
FROM python:3.9-slim

# Đặt thư mục làm việc bên trong Container
WORKDIR /app

# Cài đặt build-essential để hỗ trợ biên dịch scikit-surprise C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy file danh sách thư viện và cài đặt trước (Tận dụng Docker Cache)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn dự án vào trong Container
COPY . .

# Mở cổng giao tiếp API ra ngoài (Khớp với cổng FastAPI)
EXPOSE 5003

# Khai báo môi trường Mặc định
ENV PYTHONUNBUFFERED=1
ENV AI_PORT=5003

# Lệnh Khởi động FastAPI server bằng Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5003"]
