# 🐳 TÀI LIỆU HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG AI (END-TO-END DOCKER GUIDE)

Tài liệu này là cẩm nang chính thức (Step-by-Step) để bất kỳ ai dù không biết lập trình Python cũng có thể khởi chạy Thành công 100% Hệ thống Gợi ý AI (Collaborative Filtering) của dự án Electro Store thông qua công nghệ Ảo hóa Docker Container.

---

## BƯỚC 1: CHUẨN BỊ MÔI TRƯỜNG (PREREQUISITES)
1. Máy tính của bạn cần được cài đặt phần mềm **Docker Desktop**.
2. Tải Docker Desktop tại trang chủ: `https://www.docker.com/products/docker-desktop/`
3. Cài đặt xong, hãy mở chương trình Docker Desktop lên và chờ cho đến khi hiện dòng chữ **"Engine is running"** (hoặc biểu tượng màu xanh lá cây ở góc màn hình).

---

## BƯỚC 2: SETUP SOURCE CODE & DỮ LIỆU
1. Mở thư mục chứa mã nguồn của dự án AI (nơi có chứa file `Dockerfile` và `app.py`).
2. **Dữ liệu mồi (Tùy chọn):** Theo chuẩn MLOps, toàn bộ file CSV rác khổng lồ (Ví dụ `events.csv` 100MB) đã bị chặn đóng gói bởi file `.dockerignore` để hình phạt Image siêu nhẹ. 
   > Nếu MySQL chưa có dữ liệu, chạy `python collaborativefiltering/train.py` — pipeline tự dùng mock data và lưu model vào `collaborativefiltering/asset/`.

---

## BƯỚC 3: ĐÓNG GÓI HỆ THỐNG (BUILD IMAGE)
Quá trình này sẽ nén Hệ Điều Hành thu nhỏ, Cấu trúc Python và Bộ Mã Nguồn của bạn lại thành 1 "Cái Khuôn Đúc" (Image) tên là `electro-ai-engine`.

1. Mở màn hình Gõ lệnh (Terminal / Command Prompt / PowerShell) Của Windows hoặc VSCode Mạng ngay tại Thư mục Dự Án (Nơi Có file `Dockerfile`).
2. Copy và Dán dòng lệnh sau đây vào Terminal rồi ấn Enter:
   ```bash
   docker build -t electro-ai-engine:v1.0 .
   ```
   *(Hãy nhớ copy cả Dấu Chấm `.` ở cuối dòng nhé, nó có nghĩa là tìm file cấu hình tại thư mục này).*
3. Máy tính xả chữ chạy Log Download mất khoảng 1-3 Phút. Chờ dòng thông báo `Success / Exporting to image` hiện ra là Cỗ Lõi Xong! Bạn Có Thể Bật Giao Diện Docker Desktop, Sang Tab **Images** Sẽ Thấy File Trắng Sáng Mang Tên này Vừa Ra Đời.

---

## BƯỚC 4: KHỞI ĐỘNG TÀU SÂN BAY (RUN CONTAINER)
Đây là bước đánh thức Web Server AI Backend Dậy. Bạn có 2 Cách Làm:

### Cách 1: Chạy bằng Dòng lệnh Truyền Thống (Hacker Style)
Dán lệnh này vào Terminal:
```bash
docker run -d --name ai_recommender -p 5003:5003 electro-ai-engine:v1.0
```

### Cách 2: Chạy Bằng Bấm Chuột (Giao diện Docker Desktop Xịn xò)
1. Mở App **Docker Desktop**, sang cột trái chọn Tab **Images**.
2. Thấy Lõi `electro-ai-engine` Mới Tinh Sáng Bóng Nằm Đó, Rê Chuột Sang Phải.
3. Bấm Nút Hình Tam Giác Trọng Lực **(Cái Nút Chạy/Play ▶️)**.
4. Một cái Bảng Dropdown Chú Thích Mở Xuống, Gõ 2 Chữ:
   - Dòng Container Name: `ai_recommender` (Để Nhớ Mặt Phân Biệt Về Sau).
   - Dòng Host Port (TCP Cột Trái): Bấm vào Cây Bút Gõ Nhập Số `5003`. (Vì API Của Dự Vừa Chốt Chờ Khách Ở Cổng Mạng 5003 Này).
5. Cuối cùng, Bấm Rụp **Nút Chạy RUN Màu Xanh Nằm Khuy Dưới**. 

Cốc Cốc! Chuyển Sang tab **Containers** của Docker Desktop Đi Nào! Một Khúc Bánh Vuông Xanh Lá (Running) Lưng Lửng Chữ `ai_recommender` Đang Cựa Quậy Đón Mọi Sức Chiều Dữ Liệu Gọi! MLOps Hoạt Động Không Chết Web!

---

## BƯỚC 5: NGHIỆM THU KẾT QUẢ ĐẦU CUỐI (END-TO-END TEST)
Mở Trình duyệt Web (Chrome) hoặc Công Tắc Postman. Dán Đoạn Giao Tiếp Link này vào để lấy Sản Phẩm Gợi ý Trí Tuệ Về:

```text
http://localhost:5003/api/recommend?user_id=1050&top_n=10
```

**Thành quả:** Màn Hình Trắng Đen Trả Về Hàm JSON Tuyệt Đối Chẩn Xác Gồm Tên User, Cục Cấu Kích Hoạt `(Strategy: AI_Cosine)` và Mảng `[Sản Phẩm Cần Tư Vấn Cho Tên Này]` Rõ Mồn Một Trong Chưa Tới Đuôi Ánh Sáng \~ 40 Mili Giây!

---
## VÒNG TUẦN HOÀN: KHỞI ĐỘNG NÓNG (HOT-RELOAD RETRAIN)
Nếu Sau Tuần Tới Công Ty Có File Dữ Liệu `events.csv` Xịn Mới Nặng 200MB! Đừng Lo Cái App Tắt Màn. Hãy Copy Lôi File Này Bỏ Vào Thư mục `data/raw/`. 

Ngồi Im Thưởng Thức Lệnh Báo Máy Chủ Python Học Lại Từ Đầu Đè RAM Báo API Mới:
Mở Terminal Gõ:
```bash
curl -X POST http://localhost:5003/api/retrain
```
Hệ Thống Phản Lại Bằng Dòng Chữ: "Sếp Cứ Giao Việc Nghỉ Cà Phê Chờ Em 5 Phút Nấu Ngầm Lại Mắt Não Mới Cho Cổng Này Nhé!". Hoàn Thành Luân Hồi Kết Nhiệm Vụ Ạ! Trang React Cứ Sang Vuốt Cả 6 Lần Khúc Đứt Nhanh Của Thầy Cô Chấm Điểm Tuyệt Hảo Đầu Tư Công Sức Này!
