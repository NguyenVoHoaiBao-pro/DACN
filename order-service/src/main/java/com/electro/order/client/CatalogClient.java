package com.electro.order.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import com.electro.order.dto.CatalogClientDto;

@FeignClient(name = "catalog-service", path = "/api/products")
public interface CatalogClient {

    // Lấy thông tin chung của một Sản phẩm (Tên, Mô tả, Thương hiệu, v.v) thông qua ID sản phẩm.
    // Dùng khi cần hiển thị tên sản phẩm trong chi tiết Đơn hàng.
    @GetMapping("/internal/{productId}")
    CatalogClientDto.ProductResponse getProductById(@PathVariable("productId") Integer productId);

    // Lấy thông tin chi tiết của một Biến thể (Màu sắc, Dung lượng, Giá bán hiện tại, Tồn kho) thông qua ID biến thể.
    // Order Service dùng hàm này để kiểm tra xem giá có bị thay đổi không và kho còn hàng không trước khi chốt đơn.
    @GetMapping("/internal/variants/{variantId}")
    CatalogClientDto.VariantResponse getVariantById(@PathVariable("variantId") Integer variantId);
   
    // Hàm Trừ (hoặc Cộng) tồn kho của một Biến thể.
    // Order Service truyền delta âm (VD: -1) để trừ kho khi Khách Đặt Hàng thành công.
    // Order Service truyền delta dương (VD: +1) để hoàn lại kho khi Khách Hủy Đơn.
    @PutMapping("/internal/variants/{variantId}/stock")
    void updateStock(@PathVariable("variantId") Integer variantId, @RequestParam("delta") Integer delta);

    // Tìm thông tin của một Máy vật lý cụ thể thông qua mã Barcode/IMEI/Serial.
    // Dùng khi nhân viên kho quét mã vạch để đóng gói hàng hóa vào Đơn hàng.
    @GetMapping("/internal/items/by-code")
    CatalogClientDto.ProductItemResponse findItemByCode(@RequestParam("value") String value);

    // Tìm thông tin của một Máy vật lý cụ thể thông qua ID nội bộ của nó.
    @GetMapping("/internal/items/{id}")
    CatalogClientDto.ProductItemResponse findItemById(@PathVariable("id") Integer id);

    // Khóa (Giữ chỗ) một Máy vật lý cụ thể.
    // Khi mã IMEI này được gán vào Đơn hàng, nó sẽ bị khóa lại (RESERVED) để không bị bán trùng cho người khác.
    @PutMapping("/internal/items/{id}/reserve")
    CatalogClientDto.ProductItemResponse reserveItem(@PathVariable("id") Integer id);

    // Giải phóng (Nhả) Máy vật lý cụ thể.
    // Dùng trong trường hợp Đơn hàng bị Hủy sau khi đã đóng gói, máy này sẽ được nhả ra để bán tiếp.
    @PutMapping("/internal/items/{id}/release")
    void releaseItem(@PathVariable("id") Integer id);

    // Kích hoạt Bảo hành điện tử cho một Máy/Sản phẩm.
    // Order Service gọi hàm này tự động khi Đơn hàng chuyển sang trạng thái DELIVERED (Đã giao hàng thành công).
    @PutMapping("/internal/items/activate-warranty")
    CatalogClientDto.ActivateWarrantyResponse activateWarranty(
            @RequestBody CatalogClientDto.ActivateWarrantyRequest request);

    // Cập nhật trạng thái vật lý của một Máy (Ví dụ: Từ trạng thái IN_STOCK chuyển thành SOLD).
    @PutMapping("/internal/items/{id}/status")
    CatalogClientDto.ProductItemResponse updateItemStatus(
            @PathVariable("id") Integer id,
            @RequestParam("status") String status);
}
