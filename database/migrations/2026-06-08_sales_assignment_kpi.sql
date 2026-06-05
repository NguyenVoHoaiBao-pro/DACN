-- Sales auto-assign + KPI (Phase D) — electro_order_db
USE electro_order_db;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS assigned_sales_user_id INT NULL AFTER user_id,
    ADD COLUMN IF NOT EXISTS order_source VARCHAR(30) NOT NULL DEFAULT 'WEB_ORGANIC' AFTER assigned_sales_user_id,
    ADD COLUMN IF NOT EXISTS sales_pipeline_status VARCHAR(40) NOT NULL DEFAULT 'NEW_ASSIGNED' AFTER order_source;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_sales ON orders (assigned_sales_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_pipeline ON orders (sales_pipeline_status);

CREATE TABLE IF NOT EXISTS sales_kpi_config (
    id INT PRIMARY KEY DEFAULT 1,
    monthly_revenue_target DECIMAL(15,2) NOT NULL DEFAULT 200000000.00,
    commission_rate_organic DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
    commission_rate_web DECIMAL(8,4) NOT NULL DEFAULT 0.0050,
    commission_rate_sales_assisted DECIMAL(8,4) NOT NULL DEFAULT 0.0100,
    commission_rate_sales_link DECIMAL(8,4) NOT NULL DEFAULT 0.0050,
    max_cancel_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    updated_by_user_id INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO sales_kpi_config (id) VALUES (1);
