-- Luồng hoàn tiền — order-service (electro_order_db)
USE electro_order_db;

CREATE TABLE IF NOT EXISTS refund_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    refund_code VARCHAR(30) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    order_id INT NOT NULL,
    order_code VARCHAR(50) NOT NULL,
    return_slip_id INT NULL,
    return_slip_code VARCHAR(30) NULL,
    serial_number VARCHAR(100) NULL,
    customer_name VARCHAR(200) NULL,
    customer_phone VARCHAR(30) NULL,
    product_name VARCHAR(300) NULL,
    refund_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    refund_channel VARCHAR(30) NOT NULL,
    is_defective TINYINT(1) NULL,
    return_reason TEXT NULL,
    voucher_code VARCHAR(30) NULL,
    customer_bank_name VARCHAR(100) NULL,
    customer_bank_account VARCHAR(50) NULL,
    customer_bank_account_name VARCHAR(200) NULL,
    gateway_refund_id VARCHAR(100) NULL,
    gateway_response TEXT NULL,
    failure_reason TEXT NULL,
    approved_by VARCHAR(100) NULL,
    approved_at DATETIME NULL,
    rejected_by VARCHAR(100) NULL,
    rejected_at DATETIME NULL,
    rejection_reason TEXT NULL,
    executed_by VARCHAR(100) NULL,
    executed_at DATETIME NULL,
    completed_at DATETIME NULL,
    transfer_reference VARCHAR(100) NULL,
    receipt_image_url VARCHAR(500) NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_refund_status (status),
    INDEX idx_refund_order (order_id),
    INDEX idx_refund_slip (return_slip_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quyền duyệt hoàn tiền (electro_user_db)
USE electro_user_db;

INSERT IGNORE INTO `permissions` (`id`, `code`, `name`, `description`, `created_at`) VALUES
(27, 'REFUND_APPROVE', 'Duyệt hoàn tiền', 'Kế toán/Admin duyệt và thực hiện hoàn tiền cho khách.', NOW());

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1, 27);
