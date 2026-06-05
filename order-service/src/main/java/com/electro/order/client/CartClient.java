package com.electro.order.client;

import com.electro.order.dto.CartDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "cart-service", path = "/api/carts")
public interface CartClient {

    // Lấy toàn bộ danh sách các món hàng (sản phẩm, số lượng) đang nằm trong giỏ hàng của User.
    // Order Service gọi hàm này ở bước ĐẦU TIÊN khi tạo Đơn hàng để lấy thông tin tính tiền.
    @GetMapping("/internal/{userId}")
    CartDto.CartResponse getCartByUserId(@PathVariable("userId") Integer userId);

    // Xóa toàn bộ sản phẩm trong giỏ hàng của User.
    // Order Service gọi hàm này ở bước CUỐI CÙNG (sau khi đặt hàng thành công) để "dọn dẹp" giỏ hàng.
    @DeleteMapping("/internal/{userId}/clear")
    void clearCartByUserId(@PathVariable("userId") Integer userId);
}
