# Postman — review-service (Full Coverage)

## Import

1. `api-tests/review-service.postman_collection.json` — **9 folder, 31 requests**
2. `api-tests/review-service.postman_environment.json`

## Nghiệp vụ (theo DB `electro_review_db`)

| Rule | DB / API |
|------|----------|
| Tạo review | `is_approved = 0` — **chờ admin duyệt** |
| Public GET reviews / summary | Chỉ `is_approved = 1` |
| `GET /api/reviews/my` | User thấy **mọi** review của mình (kể cả chờ duyệt) |
| `is_verified_purchase` + `order_id` | **Tùy chọn** — gắn nhãn nếu order-service xác nhận đã mua |
| Admin | Duyệt (`PUT .../status`), trả lời (`POST .../reply`), xóa |
| Product không tồn tại | **404** |
| Sửa review | `is_approved` reset về **0** — duyệt lại |

## Chuẩn bị

```powershell
.\START.ps1 -SkipDocker
.\check-all-services.ps1
```

| Service | Port |
|---------|------|
| review-service | 8087 |
| auth | 8081 (JWT cho CRUD) |
| catalog | 8082 (validate product) |
| order | 8086 (verified purchase — tùy chọn) |
| gateway | 8080 |

## Thứ tự Collection Runner

| Folder | Nội dung |
|--------|----------|
| **00** | OpenAPI, health |
| **01** | Login JWT |
| **02** | GET reviews, summary (public — chỉ đã duyệt) |
| **03** | POST helpful (public) |
| **04** | GET /api/reviews/my (JWT) |
| **05** | Create / update / delete review |
| **06** | Admin → 403 (CUSTOMER) |
| **07** | Gateway |
| **08** | Edge cases |

## Lưu ý

- Review mới tạo **không** xuất hiện ngay trên public GET — cần admin duyệt (folder 06 với tài khoản ADMIN nếu test E2E đầy đủ).
- POST create expect **201** + `isApproved: false`.
- Admin dùng `hasRole('ADMIN')` — CUSTOMER → **403**.

```powershell
python api-tests/generate_review_collection.py
.\scripts\Test-Review-Service-Full.ps1
```
