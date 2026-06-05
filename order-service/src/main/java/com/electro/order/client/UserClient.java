package com.electro.order.client;

import com.electro.order.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;

@FeignClient(name = "user-service")
public interface UserClient {

    // Lấy thông tin địa chỉ giao hàng chi tiết (Tên người nhận, SĐT, Số nhà, Đường, Quận, Huyện...) thông qua ID địa chỉ.
    // Order Service dùng hàm này khi khách hàng không nhập địa chỉ mới, mà chọn một địa chỉ đã lưu sẵn trong Sổ địa chỉ của họ.
    @GetMapping("/api/internal/users/addresses/{addressId}")
    UserAddressDto getAddressById(@PathVariable("addressId") Integer addressId);

    // Lấy thông tin cá nhân cơ bản của User thông qua ID.
    // Dùng để điền thông tin người mua vào Đơn hàng.
    @GetMapping("/api/internal/users/{userId}")
    UserDto.Response getUserById(@PathVariable("userId") Integer userId);

    // Lấy thông tin cá nhân cơ bản của User thông qua Username (thường là Email).
    // Order Service hay gọi hàm này ở đầu mỗi request để xác thực xem User đang gửi request có tồn tại và hợp lệ không.
    @GetMapping("/api/internal/users/username/{username}")
    UserDto.Response getUserByUsername(@PathVariable("username") String username);

    @GetMapping("/api/internal/sales-assignment/next")
    Map<String, Object> getNextSalesAssignee();

    @GetMapping("/api/internal/sales-assignment/users")
    java.util.List<Map<String, Object>> getActiveSalesUsers();
}
