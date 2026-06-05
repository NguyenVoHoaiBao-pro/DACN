package com.electro.review.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.electro.review.dto.UserClientDto;

@FeignClient(name = "user-service")
public interface UserClient {

    // Lấy ID người dùng thực sự thông qua Username (Email).
    // Khi gửi Review lên, Frontend chỉ truyền Token chứa Username. Review Service dùng hàm này
    // để đổi Username lấy ID nhằm lưu vào Database một cách bảo mật.
    @GetMapping("/api/internal/users/username/{username}")
    UserClientDto.UserResponse getUserByUsername(@PathVariable("username") String username);
     
    // Lấy thông tin cá nhân cơ bản (Tên, Hình đại diện...) thông qua ID.
    // Dùng ở bước cuối cùng (Data Enrichment) để đắp Tên hiển thị thật của người dùng vào JSON trả về cho Frontend.
    @GetMapping("/api/internal/users/{userId}")
    UserClientDto.UserResponse getUserById(@PathVariable("userId") Integer userId);
}
