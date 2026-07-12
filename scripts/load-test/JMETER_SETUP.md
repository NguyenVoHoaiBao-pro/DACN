# Kiểm thử tải JMeter — Electro Store (5 API)

## Bước 1: Tạo tài khoản + seed-500-users.csv

```powershell
pip install mysql-connector-python
python scripts/load-test/seed_loadtest_users.py --count 500
```

File tạo ra: `scripts/load-test/seed-500-users.csv` (**đúng 500 dòng**, không header — mốc **500**).

Format mỗi dòng: `username,password,user_id`

```
loadtest_001,123456,10567
loadtest_002,123456,10568
...
loadtest_500,123456,11066
```

> Mốc **1000** và **2000** dùng cùng file này với **Recycle on EOF = true** (500 account × recycle).

## Bước 2: CSV Data Set Config (JMeter)

| Thuộc tính | Giá trị |
|------------|---------|
| Filename | `D:\electro-store-microservices\scripts\load-test\seed-500-users.csv` |
| File encoding | **UTF-8** |
| Variable Names | `username,password,user_id` |
| Delimiter | `,` |
| Recycle on EOF | **true** |
| Stop thread on EOF | **false** |
| Sharing mode | All threads |

## Bước 3: HTTP Request Defaults

- Server: `localhost`
- Port: `8080`
- Protocol: `http`

## Bước 4: 5 API trong Test Plan

### API 1 — GET Products (35%)
```
GET /api/products?page=0&size=10
```

### API 2 — POST Login (10%)
```
POST /api/auth/login
Body (JSON):
{"username":"${username}","password":"${password}"}
```
**JSON Extractor:** `accessToken` ← `$.data.accessToken`

### API 3 — GET Cart (15%)
```
GET /api/cart
Header: Authorization: Bearer ${accessToken}
```

### API 4 — POST Chatbot (15%) — pool riêng 10 threads
```
POST /api/chatbot/chat
Body: {"message":"Laptop gaming nào đang giảm giá?"}
Timeout: 60000 ms
```

### API 5 — GET Recommend (25%)
```
GET /recommend/${user_id}?top_k=10
```

## Bước 5: 3 mốc Virtual Users

| Mốc | Threads | Ramp-up | Duration | Ghi chú |
|-----|---------|---------|----------|---------|
| **500** | 500 | 60s | 5 phút | `seed-500-users.csv` — Recycle **OFF** (1:1) |
| **1000** | 1000 | 120s | 5 phút | `seed-500-users.csv` — Recycle **ON** |
| **2000** | 2000 | 180s | 5 phút | `seed-500-users.csv` — Recycle **ON** |

Chi tiết: `jmeter-scenarios.properties`

## Bước 6: Listeners

- Summary Report
- Aggregate Report
- Response Time Graph

## Lưu ý

1. Chạy `.\START.ps1` + reco-service trước khi test.
2. Chatbot gọi LLM — giữ pool chatbot ≤ 10–15 threads.
3. Mật khẩu tất cả tài khoản loadtest: **`123456`**
4. Chỉ dùng tài khoản `loadtest_*` cho JMeter — không dùng admin.
