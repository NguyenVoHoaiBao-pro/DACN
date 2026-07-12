-- refund_audit_logs.actor_role was VARCHAR(50); warehouse users carry multiple
-- permission codes and the old audit logger joined them all (e.g. ROLE_WAREHOUSE,STOCK_IMPORT,...).
USE electro_order_db;

ALTER TABLE refund_audit_logs
    MODIFY COLUMN actor_role VARCHAR(255) NULL;
