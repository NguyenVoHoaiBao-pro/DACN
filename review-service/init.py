import re

# Update pom.xml
pom_path = "d:/electro-store-microservices/review-service/pom.xml"
with open(pom_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("<artifactId>cart-service</artifactId>", "<artifactId>review-service</artifactId>")
content = content.replace("<name>cart-service</name>", "<name>review-service</name>")
content = content.replace("<description>Cart Service for Electro Store</description>", "<description>Review Service for Electro Store</description>")

with open(pom_path, "w", encoding="utf-8") as f:
    f.write(content)

# Update application.yml
yml_path = "d:/electro-store-microservices/review-service/src/main/resources/application.yml"
with open(yml_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("port: 8084", "port: 8087")
content = content.replace("name: cart-service", "name: review-service")
content = content.replace("electro_cart", "electro_review")
content = content.replace("jdbc:mysql://localhost:3307/", "jdbc:mysql://localhost:3306/")

with open(yml_path, "w", encoding="utf-8") as f:
    f.write(content)
