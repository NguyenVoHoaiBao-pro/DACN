USE electro_user_db;

ALTER TABLE live_chat_conversations
    ADD COLUMN IF NOT EXISTS customer_user_id INT NULL AFTER guest_phone,
    ADD COLUMN IF NOT EXISTS guest_email VARCHAR(120) NULL AFTER customer_user_id;

CREATE INDEX IF NOT EXISTS idx_live_chat_customer ON live_chat_conversations (customer_user_id);
