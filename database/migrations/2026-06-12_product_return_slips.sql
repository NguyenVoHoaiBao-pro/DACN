-- Phiếu hoàn trả hàng — Nhân viên Kho (electro_catalog_db)
USE electro_catalog_db;

CREATE TABLE IF NOT EXISTS product_return_slips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slip_code VARCHAR(30) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    serial_number VARCHAR(100) NOT NULL,
    product_item_id INT NULL,
    variant_id INT NULL,
    order_id INT NULL,
    order_code VARCHAR(50) NULL,
    customer_name VARCHAR(200) NULL,
    customer_phone VARCHAR(30) NULL,
    product_name VARCHAR(300) NULL,
    sku_code VARCHAR(100) NULL,
    variant_name VARCHAR(150) NULL,
    tracking_code VARCHAR(100) NULL,
    item_status_before VARCHAR(30) NULL,
    condition_type VARCHAR(20) NULL,
    is_defective TINYINT(1) NULL,
    reason TEXT NULL,
    warehouse_notes TEXT NULL,
    processed_at DATETIME NULL,
    created_by_user_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_return_slip_status (status),
    INDEX idx_return_slip_serial (serial_number),
    INDEX idx_return_slip_order (order_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
