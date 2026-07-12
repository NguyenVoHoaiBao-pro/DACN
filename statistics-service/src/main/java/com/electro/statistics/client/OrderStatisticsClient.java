package com.electro.statistics.client;

import java.util.List;
import java.util.Map;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "order-service", path = "/api/orders/internal/statistics")
public interface OrderStatisticsClient {

    // Lấy các con số Tổng quan (Tổng doanh thu, Tổng đơn hàng, Tỉ lệ Tăng trưởng).
    // Phục vụ việc vẽ các thẻ (Cards) Thống kê nhanh trên đầu trang Admin Dashboard.
    @GetMapping("/overview")
    Map<String, Object> getOverview();

    // Lấy Dữ liệu vẽ Biểu đồ Doanh thu (Dạng Cột/Đường).
    // Dữ liệu được Order Service tự động gom nhóm theo ngày/tháng/năm tùy vào tham số 'period'.
    @GetMapping("/revenue/chart")
    Map<String, Object> getRevenueChart(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate);

    // Thống kê Tỉ lệ Trạng thái Đơn hàng (Đang giao, Đã giao, Hủy...).
    // Dùng để vẽ Biểu đồ tròn (Pie Chart) giúp Admin đánh giá hiệu quả vận hành.
    @GetMapping("/orders/by-status")
    Map<String, Object> getOrderStatusStats();

    // Xin danh sách Top các Sản phẩm mang lại nhiều doanh thu nhất hoặc bán chạy nhất.
    @GetMapping("/top-products")
    List<Map<String, Object>> getTopProducts(@RequestParam(defaultValue = "10") int limit);

    // Lấy danh sách các Đơn hàng mới nhất vừa được đặt để hiển thị trên Bảng tin theo dõi.
    @GetMapping("/orders/recent")
    Map<String, Object> getRecentOrders(@RequestParam(defaultValue = "10") int limit);

    // Thống kê xem khách hàng thích thanh toán bằng COD (Tiền mặt) hay VNPAY (Chuyển khoản) hơn.
    @GetMapping("/payment-methods")
    Map<String, Object> getPaymentMethodStats();

    @GetMapping("/action-kpis")
    Map<String, Object> getActionKpis();

    @GetMapping("/revenue/by-product")
    List<Map<String, Object>> getRevenueByProduct(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate);

    @GetMapping("/finance/summary")
    Map<String, Object> getFinanceSummary(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate);

    @GetMapping("/finance/ledger")
    Map<String, Object> getFinanceLedger(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit);
}
