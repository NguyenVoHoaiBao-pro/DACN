import os
import xml.etree.ElementTree as ET

services = [
    'auth-service', 'cart-service', 'catalog-service',
    'order-service', 'review-service', 'statistics-service', 'user-service'
]

actuator_dependency = """
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
"""

actuator_yaml = """
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: always
"""

for service in services:
    pom_path = os.path.join(service, 'pom.xml')
    if os.path.exists(pom_path):
        with open(pom_path, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'spring-boot-starter-actuator' not in content:
            # Insert before </dependencies>
            content = content.replace('</dependencies>', actuator_dependency + '    </dependencies>')
            with open(pom_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Added actuator to {service} pom.xml')
    
    yaml_path = os.path.join(service, 'src', 'main', 'resources', 'application.yml')
    if os.path.exists(yaml_path):
        with open(yaml_path, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'management:' not in content:
            content += "\n" + actuator_yaml
            with open(yaml_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Added actuator config to {service} application.yml')

print("Done updating actuator!")
