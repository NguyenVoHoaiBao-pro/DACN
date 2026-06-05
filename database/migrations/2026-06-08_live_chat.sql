-- Live chat web (Phase C) — electro_user_db
USE electro_user_db;

CREATE TABLE IF NOT EXISTS live_chat_conversations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    channel VARCHAR(20) NOT NULL DEFAULT 'WEB',
    guest_name VARCHAR(120),
    guest_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    assigned_sales_user_id INT NULL,
    last_message_at DATETIME(6) NULL,
    unread_for_sales INT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_live_chat_assigned (assigned_sales_user_id),
    INDEX idx_live_chat_status (status),
    INDEX idx_live_chat_updated (last_message_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS live_chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_user_id INT NULL,
    body TEXT NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_live_chat_msg_conv (conversation_id, id),
    CONSTRAINT fk_live_chat_msg_conv FOREIGN KEY (conversation_id)
        REFERENCES live_chat_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_assign_cursor (
    id INT PRIMARY KEY DEFAULT 1,
    last_index INT NOT NULL DEFAULT -1,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO sales_assign_cursor (id, last_index) VALUES (1, -1);
