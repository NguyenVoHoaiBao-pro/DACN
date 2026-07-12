-- Warranty inbound (kho nhận máy hỏng) sets final_resolution = REFUND;
-- original ENUM only had REPLACE, REPAIR_RETURN, REJECT.
USE electro_order_db;

ALTER TABLE warranty_claims
    MODIFY COLUMN final_resolution
        ENUM('REPLACE', 'REPAIR_RETURN', 'REJECT', 'REFUND') NULL
        COMMENT 'Phán quyết cuối: đổi máy / sửa trả / từ chối / hoàn tiền';
