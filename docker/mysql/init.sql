-- Docker first boot: create all microservice databases
-- Full data: run scripts/Import-Databases.ps1 after split-database.py

CREATE DATABASE IF NOT EXISTS `electro_catalog_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `electro_cart_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `electro_order_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `electro_user_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `electro_review_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `electro_statistics_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Legacy monolith DB (optional — giữ để tham chiếu / import tay)
CREATE DATABASE IF NOT EXISTS `electro_store_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'electro'@'%' IDENTIFIED BY 'electro';
GRANT ALL PRIVILEGES ON electro_catalog_db.* TO 'electro'@'%';
GRANT ALL PRIVILEGES ON electro_cart_db.* TO 'electro'@'%';
GRANT ALL PRIVILEGES ON electro_order_db.* TO 'electro'@'%';
GRANT ALL PRIVILEGES ON electro_user_db.* TO 'electro'@'%';
GRANT ALL PRIVILEGES ON electro_review_db.* TO 'electro'@'%';
GRANT ALL PRIVILEGES ON electro_statistics_db.* TO 'electro'@'%';
GRANT ALL PRIVILEGES ON electro_store_db.* TO 'electro'@'%';
FLUSH PRIVILEGES;
