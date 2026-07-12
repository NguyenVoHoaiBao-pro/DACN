-- electro_order_db: align order_source / sales_pipeline with Order.java enums
USE electro_order_db;

-- order_source: add WEB_ASSIGNED (auto round-robin sales assign on checkout)
ALTER TABLE `orders`
  MODIFY COLUMN `order_source` VARCHAR(30) NOT NULL DEFAULT 'WEB_ORGANIC'
  COMMENT 'WEB_ORGANIC|WEB_ASSIGNED|SALES_CHAT|SALES_LINK|ADMIN_SALES';

ALTER TABLE `orders`
  MODIFY COLUMN `sales_pipeline_status` VARCHAR(40) NOT NULL DEFAULT 'NEW_ASSIGNED'
  COMMENT 'NEW_ASSIGNED|CALLING|THINKING|APPROVED_WAREHOUSE';

UPDATE `orders` SET `order_source` = 'WEB_ORGANIC' WHERE `order_source` IS NULL OR `order_source` = '';
UPDATE `orders` SET `sales_pipeline_status` = 'NEW_ASSIGNED' WHERE `sales_pipeline_status` IS NULL OR `sales_pipeline_status` = '';
