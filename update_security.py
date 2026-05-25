import os
import re

files_to_check = [
    'user-service/src/main/java/com/electro/user/config/SecurityConfig.java',
    'statistics-service/src/main/java/com/electro/statistics/config/SecurityConfig.java',
    'order-service/src/main/java/com/electro/order/config/SecurityConfig.java',
    'review-service/src/main/java/com/electro/review/config/SecurityConfig.java',
    'catalog-service/src/main/java/com/electro/catalog/config/SecurityConfig.java',
    'auth-service/src/main/java/com/electro/auth/config/SecurityConfig.java',
    'cart-service/src/main/java/com/electro/cart/config/SecurityConfig.java'
]

for file_path in files_to_check:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if actuator is already permitted
        if '/actuator/' not in content:
            # We want to find `.requestMatchers(...)` and inject `.requestMatchers("/actuator/**").permitAll()` before it
            # A simple way is to find `http.csrf` or `.authorizeHttpRequests`
            # Let's search for `.authorizeHttpRequests(auth -> auth` or similar
            
            # Using regex to find the start of auth configurations
            pattern = r'(\.authorizeHttpRequests\s*\(\s*[a-zA-Z0-9_]+\s*->\s*[a-zA-Z0-9_]+)'
            
            def repl(match):
                return match.group(1) + '\n                        .requestMatchers("/actuator/**").permitAll()'
            
            new_content = re.sub(pattern, repl, content)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file_path} to allow /actuator/**")
            else:
                print(f"Could not find injection point in {file_path}")

print("Done updating SecurityConfig!")
