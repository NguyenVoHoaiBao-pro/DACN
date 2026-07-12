-- SOP Trả hàng - Hoàn tiền (4 giai đoạn)
USE electro_order_db;

ALTER TABLE orders
    ADD COLUMN cod_reconciled TINYINT(1) NOT NULL DEFAULT 0;

UPDATE orders SET cod_reconciled = 1
WHERE payment_method = 'COD' AND payment_status = 'PAID';

ALTER TABLE refund_requests
    ADD COLUMN defective_reason VARCHAR(40) NULL,
    ADD COLUMN coupon_allocated_discount DECIMAL(15,2) NULL,
    ADD COLUMN shipping_excluded_amount DECIMAL(15,2) NULL,
    ADD COLUMN bank_info_saved_by VARCHAR(100) NULL,
    ADD COLUMN bank_info_saved_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS refund_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    refund_id INT NOT NULL,
    refund_code VARCHAR(30) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_username VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NULL,
    detail TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_refund_audit_refund (refund_id),
    INDEX idx_refund_audit_code (refund_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

USE electro_catalog_db;

ALTER TABLE product_return_slips
    ADD COLUMN defective_reason VARCHAR(40) NULL,
    ADD COLUMN processed_by_user_id INT NULL;
