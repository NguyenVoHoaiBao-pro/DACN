# Bổ sung `cd_web` từ Microservices (Sales + Warehouse)

File gốc `cd_web.sql` (dump Navicat 30/05/2026) là **một database monolithic** — khác với production microservices (tách `electro_order_db`, `electro_catalog_db`, `electro_user_db`).

## Cách dùng

### Trường hợp A — Đã có DB `cd_web` đang chạy (khuyến nghị)

Chạy patch **idempotent** (an toàn chạy nhiều lần):

```bash
mysql -h HOST -P PORT -u USER -p cd_web < database/cd_web_patch_microservices_sales_warehouse.sql
```

Hoặc mở file trong Navicat / MySQL Workbench → Execute trên schema `cd_web`.

### Trường hợp B — Import mới từ đầu

1. Import `cd_web.sql` (đã có bảng mới: refund, return slips, inventory audit…)
2. **Bắt buộc chạy thêm patch** để `ALTER` bảng cũ (`orders`, `warranty_claims`, `purchase_orders`…):

```bash
mysql -h HOST -P PORT -u USER -p cd_web < database/cd_web_patch_microservices_sales_warehouse.sql
```

---

## Nội dung đã bổ sung

| Nhóm | Bảng / cột |
|------|------------|
| **Sales** | `orders`: `assigned_sales_user_id`, `order_source`, `sales_pipeline_status`, `ghn_shipping_status`, `cod_reconciled` |
| **Sales** | `sales_kpi_config` |
| **Sales** | Quyền: `ORDER_EDIT_DELIVERY`, `REFUND_VIEW`, `REFUND_BANK_INFO` |
| **Hoàn tiền** | `refund_requests`, `refund_audit_logs` |
| **Kho** | `product_return_slips` |
| **Kho** | `stock_lots`, `inventory_audits`, `inventory_audit_lines`, `inventory_audit_variants` |
| **PO** | `purchase_orders` / `purchase_order_items`: cột nhận hàng, duyệt, sai lệch |
| **BH** | `warranty_claims`: video, pickup GHN, thu hồi, kho tiếp nhận |
| **Admin** | Quyền `REFUND_APPROVE` + gán role ADMIN / SALES / WAREHOUSE |

---

## Lưu ý

1. **Live chat** (`live_chat_*`) chưa gộp vào `cd_web` — nếu môn khác cần chat, chạy thêm `database/migrations/2026-06-08_live_chat.sql` (đổi `USE` sang `cd_web`).
2. Microservices production vẫn dùng DB tách — patch này chỉ cho **cd_web monolithic**.
3. Sau patch, nếu chạy app microservices trỏ vào `cd_web`, cần cấu hình tất cả service cùng một schema hoặc dùng monolith thay vì tách DB.
