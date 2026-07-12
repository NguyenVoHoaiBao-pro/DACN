-- Liên kết hoàn tiền với phiếu bảo hành BH (luồng thu hồi máy hỏng → RF)
USE electro_order_db;

ALTER TABLE refund_requests
    ADD COLUMN warranty_claim_id INT NULL,
    ADD COLUMN warranty_claim_code VARCHAR(50) NULL;

CREATE INDEX idx_refund_warranty_claim ON refund_requests (warranty_claim_id);
