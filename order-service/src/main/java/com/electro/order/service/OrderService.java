package com.electro.order.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.electro.order.client.CatalogClient;
import com.electro.order.dto.CatalogClientDto;
import com.electro.order.dto.GHNDto;
import com.electro.order.dto.OrderDto;
import com.electro.order.dto.PaymentDto;
import com.electro.order.dto.RefundDto;
import com.electro.order.entity.Coupon;
import com.electro.order.entity.Order;
import com.electro.order.entity.OrderDetail;
import com.electro.order.entity.OrderItem;
import com.electro.order.exception.BadRequestException;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.security.OrderSecurityHelper;
import com.electro.order.security.SalesOrderEditPolicy;
import com.electro.order.repository.CouponRepository;
import com.electro.order.repository.OrderDetailRepository;
import com.electro.order.repository.OrderItemRepository;
import com.electro.order.repository.OrderRepository;
import com.electro.order.service.payment.PaymentService;

@Service
@Transactional
public class OrderService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OrderService.class);

    @Autowired
    private com.electro.order.client.UserClient userClient;

    @Autowired
    private SalesAssignmentService salesAssignmentService;

    @Autowired
    private com.electro.order.client.CartClient cartClient;

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderDetailRepository orderDetailRepository;

    @Autowired
    private CatalogClient catalogClient;

    @Autowired
    @Lazy
    private PaymentService paymentService;

    @Autowired
    @Lazy
    private RefundService refundService;

    @Autowired
    private GHNService ghnService;

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Value("${app.server.url:http://localhost:8080}")
    private String serverUrl;

    // Fallback khi GHN API không có địa chỉ GHN (districtId/wardCode)
    private static final BigDecimal DEFAULT_SHIPPING_FEE = new BigDecimal("30000");
    // Giữ lại cho previewCoupon (không cần địa chỉ GHN)
    private static final BigDecimal FREE_SHIPPING_THRESHOLD_FALLBACK = new BigDecimal("500000");

    // ═══════════════════════════════════════════════════════════════════════════
    // CHECKOUT — tạo đơn hàng từ giỏ hàng
    // ═══════════════════════════════════════════════════════════════════════════
    public OrderDto.OrderResponse checkout(String username, OrderDto.CheckoutRequest request) {
        com.electro.order.dto.UserDto.Response user = findUser(username);

        // 1. Lấy giỏ hàng
        //Dòng 84 : Gọi Feign Client Sang Cart Service
        com.electro.order.dto.CartDto.CartResponse cart = cartClient.getCartByUserId(user.getId());
        //Dòng 85-87 : kiểm tra giỏ hàng rỗng
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new BadRequestException("Giỏ hàng trống, vui lòng thêm sản phẩm trước khi đặt hàng");
        }
        var items = cart.getItems(); // lấy danh sách sản phẩm

        // 2. Kiểm tra tồn kho
        for (var item : items) {
            var variant = item.getVariant();
            if (variant.getStockQuantity() == null || variant.getStockQuantity() < item.getQuantity()) {
                int available = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
                throw new BadRequestException(
                        "Sản phẩm \"" + variant.getVariantName() + "\" không đủ hàng. Còn lại: " + available
                                + ", yêu cầu: " + item.getQuantity());
            }
        }

        // 3. Xác định địa chỉ giao hàng
        String shippingName, shippingPhone, shippingAddress, shippingProvince, shippingDistrict, shippingWard;
        Integer savedAddressId = null;

        //Nếu user truyền lên AddressID 
        if (request.getAddressId() != null) {
            //Lấy địa chỉ giao hàng từ User Service ,dùng Feign Client để đồng bộ
            com.electro.order.client.UserAddressDto dto = userClient.getAddressById(request.getAddressId());
            if (dto == null) throw new ResourceNotFoundException("UserAddress", "id", request.getAddressId());
            savedAddressId = dto.getId();
            //gán các thông tin trả về
            shippingName = dto.getReceiverName();
            shippingPhone = dto.getReceiverPhone();
            shippingAddress = dto.getAddress();
            shippingProvince = dto.getProvince();
            shippingDistrict = dto.getDistrict();
            shippingWard = dto.getWard();
            if (shippingName == null || shippingName.isBlank()
                    || shippingPhone == null || shippingPhone.isBlank()
                    || shippingAddress == null || shippingAddress.isBlank()) {
                throw new BadRequestException("Địa chỉ giao hàng không đầy đủ thông tin");
            }
        } else {
            if (request.getShippingName() == null || request.getShippingName().isBlank()
                    || request.getShippingPhone() == null || request.getShippingPhone().isBlank()
                    || request.getShippingAddress() == null || request.getShippingAddress().isBlank()) {
                throw new BadRequestException(
                        "Vui lòng cung cấp addressId hoặc thông tin giao hàng (shippingName, shippingPhone, shippingAddress)");
            }
            shippingName = request.getShippingName();
            shippingPhone = request.getShippingPhone();
            shippingAddress = request.getShippingAddress();
            shippingProvince = request.getShippingProvince();
            shippingDistrict = request.getShippingDistrict();
            shippingWard = request.getShippingWard();
        }

        // 4. Validate phương thức thanh toán
        Order.PaymentMethod paymentMethod;
        try {
            paymentMethod = Order.PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Phương thức thanh toán không hợp lệ. Chấp nhận: COD, BANK_TRANSFER, MOMO, VNPAY, ZALOPAY");
        }

        // 5. Tính subtotal
        BigDecimal subtotal = BigDecimal.ZERO;
        for (var item : items) {
            // BẢN VÁ LỖI (FIX): Ép buộc lấy giá MỚI NHẤT từ Catalog (Variant) để chốt bill, không tin tưởng giá cũ của Cart
            BigDecimal price = (item.getVariant() != null && item.getVariant().getPrice() != null)
                    ? BigDecimal.valueOf(item.getVariant().getPrice())
                    : (item.getUnitPrice() != null ? BigDecimal.valueOf(item.getUnitPrice()) : BigDecimal.ZERO);
            subtotal = subtotal.add(price.multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        // 6. Áp mã giảm giá
        BigDecimal discountAmount = BigDecimal.ZERO;
        Coupon coupon = null;
        String couponCodeApplied = null;

        //Móc Coupon từ Database lên
        if (request.getCouponCode() != null && !request.getCouponCode().isBlank()) {
            String code = request.getCouponCode().trim().toUpperCase();
            coupon = couponRepository.findActiveCouponByCode(code, LocalDateTime.now())
                    .orElseThrow(() -> new BadRequestException("Mã giảm giá không hợp lệ hoặc đã hết hạn"));

            if (!Boolean.TRUE.equals(coupon.getIsActive())) {
                throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
            }
            if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
                throw new BadRequestException("Mã giảm giá đã đạt giới hạn sử dụng");
            }
            if (coupon.getMinOrderValue() != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
                throw new BadRequestException(
                        "Đơn hàng tối thiểu " + coupon.getMinOrderValue().toPlainString() + " VNĐ để sử dụng mã này");
            }

            if (coupon.getDiscountType() == Coupon.DiscountType.PERCENT) {
                discountAmount = subtotal.multiply(coupon.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                if (coupon.getMaxDiscountAmount() != null
                        && discountAmount.compareTo(coupon.getMaxDiscountAmount()) > 0) {
                    discountAmount = coupon.getMaxDiscountAmount();
                }
            } else { // FIXED
                discountAmount = coupon.getDiscountValue();
                if (discountAmount.compareTo(subtotal) > 0) {
                    discountAmount = subtotal;
                }
            }
            couponCodeApplied = coupon.getCode();
        }

        // 7. Phí vận chuyển — tính động từ GHN nếu có địa chỉ GHN
        //Tự Động Tính Chi Phí Vận Chuyển GHN (dùng Feign Client)
        BigDecimal shippingFee = ghnService.calculateShippingFeeForOrder(
                request.getToDistrictId(),
                request.getToWardCode(),
                subtotal
        );

        // 8. Tổng tiền
        BigDecimal totalAmount = subtotal.subtract(discountAmount).add(shippingFee);

        // 9. Sinh mã đơn hàng
        String orderCode = "ORD-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));

        // 10. Tạo Order : Tạo Đối tượng đơn hàng và lưu vào db
        Order order = new Order();
        order.setOrderCode(orderCode);
        order.setUserId(user.getId());
        order.setShippingName(shippingName);
        order.setShippingPhone(shippingPhone);
        order.setShippingAddress(shippingAddress);
        order.setShippingProvince(shippingProvince);
        order.setShippingDistrict(shippingDistrict);
        order.setShippingWard(shippingWard);
        order.setShippingFee(shippingFee);
        order.setPaymentMethod(paymentMethod);
        order.setPaymentStatus(Order.PaymentStatus.PENDING);
        order.setStatus(Order.OrderStatus.PENDING);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setTotalAmount(totalAmount);
        order.setCouponCode(couponCodeApplied);
        order.setCoupon(coupon);
        order.setNote(request.getNote());
        // Lưu GHN Address IDs để dùng khi tạo vận đơn
        order.setToDistrictId(request.getToDistrictId());
        order.setToWardCode(request.getToWardCode());
        if (savedAddressId != null) {
            order.setUserAddressId(savedAddressId);
        }

        Order savedOrder = orderRepository.save(order);
        salesAssignmentService.assignOnNewOrder(savedOrder, request.getSalesRef());

        // 11. Tạo OrderDetail cho mỗi CartItem
        List<OrderDetail> orderDetails = new ArrayList<>();
        for (var cartItem : items) {
            OrderDetail detail = new OrderDetail();
            detail.setOrder(savedOrder);
            detail.setVariantId(cartItem.getVariant().getId());
            if (cartItem.getVariant().getProduct() != null) {
                detail.setProductId(cartItem.getVariant().getProduct().getId());
                detail.setProductName(cartItem.getVariant().getProduct().getName());
            }
            detail.setVariantName(cartItem.getVariant().getVariantName());
            detail.setSkuCode(cartItem.getVariant().getSkuCode());
            
            detail.setQuantity(cartItem.getQuantity());
            BigDecimal price = cartItem.getUnitPrice() != null ? BigDecimal.valueOf(cartItem.getUnitPrice()) : BigDecimal.valueOf(cartItem.getVariant().getPrice());
            detail.setUnitPrice(price);
            detail.setDiscountAmount(BigDecimal.ZERO);
            detail.setTotalPrice(price.multiply(BigDecimal.valueOf(cartItem.getQuantity())));
            orderDetails.add(detail);
        }
        orderDetailRepository.saveAll(orderDetails);

        // 13. Cập nhật tồn kho (Trừ đi số lượng đã đặt; IMEI gán sau khi admin xuất kho)
        //Trừ Tồn Kho Dùng Feign Client gọi Sang Catalog Service
        for (var cartItem : items) {
            catalogClient.updateStock(cartItem.getVariant().getId(), -cartItem.getQuantity());
        }

        // 13. Cập nhật số lần dùng coupon
        if (coupon != null) {
            coupon.setUsedCount(coupon.getUsedCount() + 1);
            couponRepository.save(coupon);
        }

        // 14. Dùng Feign Client ra lệnh Cart Service Xóa giỏ hàng
        cartClient.clearCartByUserId(user.getId());

        // 💡 Tự động lưu phân mảnh PURCHASE interaction vào Analytics Insights
        try {
            for (var cartItem : items) {
                // (Gửi qua Kafka hoặc gọi API sau này để lưu UserInteraction)
            }
        } catch (Exception e) {
            log.error("Lỗi khi lưu UserInteraction tracker cho đơn hàng: {}", e.getMessage());
        }

        // 15. Nếu thanh toán online → tạo Payment URL qua Payment Gateway
        if (paymentMethod == Order.PaymentMethod.VNPAY
                || paymentMethod == Order.PaymentMethod.MOMO
                || paymentMethod == Order.PaymentMethod.ZALOPAY) {
            try {
                PaymentDto.PaymentUrlResponse paymentResult = paymentService.createPayment(
                        savedOrder, "127.0.0.1", null, "vn");
                // Reload order từ DB vì PaymentService đã cập nhật order
                savedOrder = orderRepository.findById(savedOrder.getId()).orElse(savedOrder);
            } catch (Exception e) {
                // Nếu tạo payment URL thất bại → vẫn giữ đơn hàng, user có thể retry sau
                log.error("Lỗi khi tạo payment URL trong lúc checkout: {}", e.getMessage(), e);
                savedOrder.setPaymentStatus(Order.PaymentStatus.PENDING);
                orderRepository.save(savedOrder);
            }
        }
        //TRả về cục đơnh àng + Link thanh toán nếu có trả về cho phía Frontend
        return mapToOrderResponse(savedOrder, orderDetails);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PREVIEW COUPON — xem giảm giá mà chưa tạo đơn
    // ═══════════════════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public OrderDto.ApplyCouponResponse previewCoupon(String username, String couponCode) {
        com.electro.order.dto.UserDto.Response user = findUser(username);
        com.electro.order.dto.CartDto.CartResponse cart = cartClient.getCartByUserId(user.getId());
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new BadRequestException("Giỏ hàng trống");
        }
        var items = cart.getItems();

        BigDecimal subtotal = BigDecimal.ZERO;
        for (var item : items) {
            BigDecimal price = item.getUnitPrice() != null ? BigDecimal.valueOf(item.getUnitPrice()) : BigDecimal.valueOf(item.getVariant().getPrice());
            subtotal = subtotal.add(price.multiply(BigDecimal.valueOf(item.getQuantity())));
        }

        String code = couponCode.trim().toUpperCase();
        Coupon coupon = couponRepository.findActiveCouponByCode(code, LocalDateTime.now())
                .orElseThrow(() -> new BadRequestException("Mã giảm giá không hợp lệ hoặc đã hết hạn"));

        if (!Boolean.TRUE.equals(coupon.getIsActive())) {
            throw new BadRequestException("Mã giảm giá đã bị vô hiệu hóa");
        }
        if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw new BadRequestException("Mã giảm giá đã đạt giới hạn sử dụng");
        }
        if (coupon.getMinOrderValue() != null && subtotal.compareTo(coupon.getMinOrderValue()) < 0) {
            throw new BadRequestException(
                    "Đơn hàng tối thiểu " + coupon.getMinOrderValue().toPlainString() + " VNĐ để sử dụng mã này");
        }

        BigDecimal discountAmount;
        if (coupon.getDiscountType() == Coupon.DiscountType.PERCENT) {
            discountAmount = subtotal.multiply(coupon.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            if (coupon.getMaxDiscountAmount() != null
                    && discountAmount.compareTo(coupon.getMaxDiscountAmount()) > 0) {
                discountAmount = coupon.getMaxDiscountAmount();
            }
        } else {
            discountAmount = coupon.getDiscountValue();
            if (discountAmount.compareTo(subtotal) > 0) {
                discountAmount = subtotal;
            }
        }

        // previewCoupon: không có địa chỉ GHN → dùng fallback cố định
        BigDecimal shippingFee = subtotal.compareTo(FREE_SHIPPING_THRESHOLD_FALLBACK) >= 0
                ? BigDecimal.ZERO : DEFAULT_SHIPPING_FEE;
        BigDecimal finalAmount = subtotal.subtract(discountAmount).add(shippingFee);

        OrderDto.ApplyCouponResponse response = new OrderDto.ApplyCouponResponse();
        response.setCouponCode(coupon.getCode());
        response.setDiscountType(coupon.getDiscountType().name());
        response.setDiscountValue(coupon.getDiscountValue());
        response.setOriginalSubtotal(subtotal);
        response.setDiscountAmount(discountAmount);
        response.setFinalAmount(finalAmount);
        response.setMessage("Áp dụng mã \"" + coupon.getCode() + "\" thành công, giảm "
                + discountAmount.toPlainString() + " VNĐ");
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET MY ORDERS — danh sách đơn hàng của user
    // ═══════════════════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public Page<OrderDto.OrderSummaryResponse> getMyOrders(String username, String status, Pageable pageable) {
        com.electro.order.dto.UserDto.Response user = findUser(username);

        Page<Order> orders;
        if (status != null && !status.isBlank()) {
            try {
                Order.OrderStatus orderStatus = Order.OrderStatus.valueOf(status.toUpperCase());
                orders = orderRepository.findByUserIdAndStatus(user.getId(), orderStatus, pageable);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Trạng thái không hợp lệ: " + status);
            }
        } else {
            orders = orderRepository.findByUserId(user.getId(), pageable);
        }

        return orders.map(this::mapToOrderSummary);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GET ORDER DETAIL — chi tiết đơn hàng theo orderCode
    // ═══════════════════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public OrderDto.OrderResponse getOrderByCode(String username, String orderCode) {
        com.electro.order.dto.UserDto.Response user = findUser(username);

        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderCode", orderCode));

        // Chỉ cho xem đơn hàng của mình
        if (!order.getUserId().equals(user.getId())) {
            throw new ResourceNotFoundException("Order", "orderCode", orderCode);
        }

        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        return mapToOrderResponse(order, details);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CANCEL ORDER — hủy đơn hàng (chỉ PENDING / CONFIRMED)
    // ═══════════════════════════════════════════════════════════════════════════
    public OrderDto.OrderResponse cancelOrder(String username, Integer orderId, OrderDto.CancelRequest request) {
        com.electro.order.dto.UserDto.Response user = findUser(username);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!order.getUserId().equals(user.getId())) {
            throw new ResourceNotFoundException("Order", "id", orderId);
        }

        if (order.getStatus() != Order.OrderStatus.PENDING
                && order.getStatus() != Order.OrderStatus.CONFIRMED) {
            throw new BadRequestException(
                    "Chỉ có thể hủy đơn hàng ở trạng thái PENDING hoặc CONFIRMED. Trạng thái hiện tại: "
                            + order.getStatus());
        }

        // Hoàn lại tồn kho
        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        for (OrderDetail detail : details) {
            if (detail.getVariantId() != null) {
                catalogClient.updateStock(detail.getVariantId(), detail.getQuantity());
            }
        }

        // Hoàn lại coupon
        if (order.getCoupon() != null) {
            Coupon coupon = order.getCoupon();
            coupon.setUsedCount(Math.max(0, coupon.getUsedCount() - 1));
            couponRepository.save(coupon);
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason(request != null ? request.getReason() : null);
        orderRepository.save(order);

        RefundDto.CancellationRefundResult cancellationRefund =
                triggerPreDeliveryCancellationRefund(order, request != null ? request.getReason() : null);

        order = orderRepository.findById(order.getId()).orElse(order);
        OrderDto.OrderResponse response = mapToOrderResponse(order, details);
        response.setCancellationRefund(cancellationRefund);
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN — Quản lý đơn hàng
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Admin xem tất cả đơn hàng — lọc theo status, tìm kiếm theo keyword
     */
    @Transactional(readOnly = true)
    public Page<OrderDto.AdminOrderSummaryResponse> adminGetAllOrders(
            String status, String keyword, Integer userId, Integer assignedSalesUserId, Pageable pageable) {
        Page<Order> orders;

        if (assignedSalesUserId != null) {
            Order.OrderStatus orderStatus = (status != null && !status.isBlank()) ? parseStatus(status) : null;
            String key = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
            orders = orderRepository.adminFilterOrders(assignedSalesUserId, orderStatus, key, pageable);
        } else if (userId != null) {
            orders = orderRepository.findByUserId(userId, pageable);
            if (status != null && !status.isBlank()) {
                Order.OrderStatus orderStatus = parseStatus(status);
                orders = orderRepository.findByUserIdAndStatus(userId, orderStatus, pageable);
            }
        } else if (keyword != null && !keyword.isBlank()) {
            orders = orderRepository.searchOrders(keyword.trim(), pageable);
            if (status != null && !status.isBlank()) {
                Order.OrderStatus orderStatus = parseStatus(status);
                orders = orderRepository.searchOrdersByKeywordAndStatus(keyword.trim(), orderStatus, pageable);
            }
        } else if (status != null && !status.isBlank()) {
            Order.OrderStatus orderStatus = parseStatus(status);
            orders = orderRepository.findByStatus(orderStatus, pageable);
        } else {
            orders = orderRepository.findAllActive(pageable);
        }

        return mapAdminOrderPage(orders);
    }

    private Page<OrderDto.AdminOrderSummaryResponse> mapAdminOrderPage(Page<Order> orders) {
        if (orders.isEmpty()) {
            return orders.map(order -> mapToAdminOrderSummary(order, Collections.emptyList()));
        }
        List<Integer> orderIds = orders.getContent().stream().map(Order::getId).toList();
        Map<Integer, List<OrderDetail>> detailsByOrderId = orderDetailRepository.findByOrderIds(orderIds).stream()
                .collect(Collectors.groupingBy(detail -> detail.getOrder().getId()));
        return orders.map(order -> mapToAdminOrderSummary(
                order, detailsByOrderId.getOrDefault(order.getId(), Collections.emptyList())));
    }

    /** Kho: tra cứu đơn gốc theo Serial / mã đơn / vận đơn hoàn. */
    @Transactional(readOnly = true)
    public OrderDto.ReturnContextResponse lookupReturnContext(String keyword) {
        String kw = keyword == null ? "" : keyword.trim();
        if (kw.isEmpty()) {
            throw new BadRequestException("Vui lòng nhập Serial, mã đơn hoặc mã vận đơn.");
        }

        var bySerial = orderItemRepository.findBySerialOrImeiWithOrder(kw);
        if (bySerial.isPresent()) {
            return mapReturnContext(bySerial.get());
        }

        Order order = orderRepository.findByOrderCode(kw).orElse(null);
        if (order == null) {
            order = orderRepository.findFirstByTrackingCodeIgnoreCase(kw).orElse(null);
        }
        if (order != null) {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            OrderItem first = items.isEmpty() ? null : items.get(0);
            if (first != null) {
                return mapReturnContext(first);
            }
            return OrderDto.ReturnContextResponse.builder()
                    .orderId(order.getId())
                    .orderCode(order.getOrderCode())
                    .orderStatus(order.getStatus() != null ? order.getStatus().name() : null)
                    .customerName(order.getShippingName())
                    .customerPhone(order.getShippingPhone())
                    .trackingCode(order.getTrackingCode())
                    .build();
        }

        throw new ResourceNotFoundException("Order", "keyword", kw);
    }

    private OrderDto.ReturnContextResponse mapReturnContext(OrderItem oi) {
        OrderDetail od = oi.getOrderDetail();
        Order order = od != null ? od.getOrder() : null;
        return OrderDto.ReturnContextResponse.builder()
                .orderId(order != null ? order.getId() : null)
                .orderCode(order != null ? order.getOrderCode() : null)
                .orderStatus(order != null && order.getStatus() != null ? order.getStatus().name() : null)
                .customerName(order != null ? order.getShippingName() : null)
                .customerPhone(order != null ? order.getShippingPhone() : null)
                .trackingCode(order != null ? order.getTrackingCode() : null)
                .productItemId(oi.getProductItemId())
                .serialNumber(oi.getSerialNumber() != null ? oi.getSerialNumber() : oi.getImei())
                .productName(od != null ? od.getProductName() : null)
                .skuCode(od != null ? od.getSkuCode() : null)
                .variantName(od != null ? od.getVariantName() : null)
                .build();
    }

    /** Hàng đợi gom hàng — CONFIRMED, PROCESSING (ưu tiên đơn cũ). */
    @Transactional(readOnly = true)
    public Page<OrderDto.AdminOrderSummaryResponse> warehouseFulfillmentQueue(Pageable pageable) {
        List<Order.OrderStatus> statuses = List.of(
                Order.OrderStatus.CONFIRMED,
                Order.OrderStatus.PROCESSING
        );
        return mapAdminOrderPage(
                orderRepository.findByStatusInAndHiddenFalse(statuses, pageable));
    }

    /**
     * Admin xem chi tiết đơn hàng (bất kỳ đơn nào)
     */
    @Transactional(readOnly = true)
    public OrderDto.AdminOrderResponse adminGetOrderById(Integer orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        return mapToAdminOrderResponse(order, details);
    }

    /**
     * Xử lý webhook GHN — cập nhật trạng thái vận chuyển tự động khi shipper/GHN đổi status.
     * @return true nếu tìm thấy và xử lý đơn bán
     */
    public boolean applyGhnWebhookStatus(GHNDto.WebhookCallbackRequest payload) {
        String ghnStatus = payload.getStatus().trim().toLowerCase();
        Order order = resolveOrderFromGhnWebhook(payload);
        if (order == null) {
            return false;
        }

        order.setGhnShippingStatus(ghnStatus);
        order.setGhnStatusUpdatedAt(parseGhnWebhookTime(payload.getTime()));

        if (payload.getOrderCode() != null && !payload.getOrderCode().isBlank()) {
            if (order.getGhnOrderCode() == null || order.getGhnOrderCode().isBlank()) {
                order.setGhnOrderCode(payload.getOrderCode());
            }
            if (order.getTrackingCode() == null || order.getTrackingCode().isBlank()) {
                order.setTrackingCode(payload.getOrderCode());
            }
        }

        appendGhnWebhookNote(order, payload, ghnStatus);

        switch (ghnStatus) {
            case "delivered" -> applyDeliveredFromGhnWebhook(order);
            case "cancel" -> applyCancelledFromGhnWebhook(order, payload);
            case "delivery_fail" -> appendDeliveryFailNote(order, payload);
            case "ready_to_pick", "picking", "money_collect_picking", "picked",
                 "storing", "transporting", "sorting", "delivering", "money_collect_delivering"
                    -> promoteToShippingIfNeeded(order);
            case "waiting_to_return", "return", "return_transporting", "return_sorting",
                 "returning", "return_fail", "returned"
                    -> handleReturnFlowFromGhnWebhook(order, ghnStatus);
            case "lost", "damage", "exception"
                    -> handleShipmentExceptionFromGhnWebhook(order, payload, ghnStatus);
            default -> log.debug("GHN webhook chỉ ghi log: {} — {}", order.getOrderCode(), ghnStatus);
        }

        orderRepository.save(order);
        log.info("GHN webhook applied (order): order={}, ghnStatus={}, orderStatus={}",
                order.getOrderCode(), ghnStatus, order.getStatus());
        return true;
    }

    private void appendDeliveryFailNote(Order order, GHNDto.WebhookCallbackRequest payload) {
        String reason = payload.getReason() != null ? payload.getReason() : "Giao hàng thất bại";
        String existing = order.getAdminNote();
        String line = "[GHN] Giao thất bại — " + reason;
        order.setAdminNote(existing == null || existing.isBlank() ? line : existing + "\n" + line);
    }

    private void handleReturnFlowFromGhnWebhook(Order order, String ghnStatus) {
        if ("returned".equals(ghnStatus)
                && (order.getStatus() == Order.OrderStatus.DELIVERED
                || order.getStatus() == Order.OrderStatus.SHIPPING)) {
            order.setStatus(Order.OrderStatus.REFUNDED);
            order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
            restoreStock(order.getId());
        }
    }

    private void handleShipmentExceptionFromGhnWebhook(
            Order order, GHNDto.WebhookCallbackRequest payload, String ghnStatus) {
        String display = ghnService.translateGHNStatus(ghnStatus);
        String line = "[GHN CẢNH BÁO] " + display;
        if (payload.getReason() != null && !payload.getReason().isBlank()) {
            line += " — " + payload.getReason();
        }
        String existing = order.getAdminNote();
        order.setAdminNote(existing == null || existing.isBlank() ? line : existing + "\n" + line);
    }

    private Order resolveOrderFromGhnWebhook(GHNDto.WebhookCallbackRequest payload) {
        if (payload.getClientOrderCode() != null && !payload.getClientOrderCode().isBlank()) {
            var byClient = orderRepository.findByOrderCode(payload.getClientOrderCode().trim());
            if (byClient.isPresent()) {
                return byClient.get();
            }
        }
        if (payload.getOrderCode() != null && !payload.getOrderCode().isBlank()) {
            return orderRepository.findFirstByTrackingCodeIgnoreCase(payload.getOrderCode().trim())
                    .orElse(null);
        }
        return null;
    }

    private LocalDateTime parseGhnWebhookTime(String time) {
        if (time == null || time.isBlank()) {
            return LocalDateTime.now();
        }
        try {
            return Instant.parse(time).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDateTime();
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }

    private void appendGhnWebhookNote(Order order, GHNDto.WebhookCallbackRequest payload, String ghnStatus) {
        String display = ghnService.translateGHNStatus(ghnStatus);
        String line = "[GHN " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM HH:mm"))
                + "] " + display;
        if (payload.getDescription() != null && !payload.getDescription().isBlank()) {
            line += " — " + payload.getDescription();
        }
        if (payload.getReason() != null && !payload.getReason().isBlank()) {
            line += " (Lý do: " + payload.getReason() + ")";
        }
        String existing = order.getAdminNote();
        order.setAdminNote(existing == null || existing.isBlank() ? line : existing + "\n" + line);
    }

    private void promoteToShippingIfNeeded(Order order) {
        if (order.getStatus() == Order.OrderStatus.PROCESSING) {
            order.setStatus(Order.OrderStatus.SHIPPING);
            if (order.getShippedAt() == null) {
                order.setShippedAt(LocalDateTime.now());
            }
        }
    }

    private void applyDeliveredFromGhnWebhook(Order order) {
        if (order.getStatus() == Order.OrderStatus.COMPLETED) {
            return;
        }
        if (order.getStatus() != Order.OrderStatus.SHIPPING
                && order.getStatus() != Order.OrderStatus.PROCESSING
                && order.getStatus() != Order.OrderStatus.DELIVERED) {
            log.warn("GHN delivered ignored for order {} in status {}", order.getOrderCode(), order.getStatus());
            return;
        }
        order.setDeliveredAt(LocalDateTime.now());
        if (order.getPaymentMethod() == Order.PaymentMethod.COD) {
            order.setPaymentStatus(Order.PaymentStatus.PAID);
            order.setCodReconciled(true);
        }
        activateWarrantyForOrder(order.getId());
        // Luồng 2: GHN delivered → tự động Hoàn thành (khách thấy "Hoàn thành" ngay)
        order.setStatus(Order.OrderStatus.COMPLETED);
        String note = "[Tự động] Hoàn thành đơn sau GHN giao hàng thành công (delivered)";
        String existing = order.getAdminNote();
        order.setAdminNote(existing == null || existing.isBlank() ? note : existing + "\n" + note);
        log.info("Order {} auto-completed via GHN delivered webhook", order.getOrderCode());
    }

    private void applyCancelledFromGhnWebhook(Order order, GHNDto.WebhookCallbackRequest payload) {
        if (order.getStatus() == Order.OrderStatus.CANCELLED
                || order.getStatus() == Order.OrderStatus.REFUNDED
                || order.getStatus() == Order.OrderStatus.COMPLETED) {
            return;
        }
        if (order.getStatus() != Order.OrderStatus.SHIPPING
                && order.getStatus() != Order.OrderStatus.PROCESSING
                && order.getStatus() != Order.OrderStatus.CONFIRMED) {
            log.warn("GHN cancel ignored for order {} in status {}", order.getOrderCode(), order.getStatus());
            return;
        }
        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        String reason = payload.getReason() != null ? payload.getReason() : "GHN hủy vận đơn";
        order.setCancelReason(reason);
        restoreStock(order.getId());
        restoreCoupon(order);
    }

    /**
     * Admin cập nhật trạng thái đơn hàng
     * Flow hợp lệ: PENDING → CONFIRMED → PROCESSING → SHIPPING → DELIVERED → COMPLETED
     *               Bất kỳ (trừ COMPLETED) → CANCELLED
     *               CANCELLED / DELIVERED → REFUNDED
     */
    public OrderDto.AdminOrderResponse adminUpdateOrderStatus(Integer orderId, OrderDto.UpdateStatusRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        Order.OrderStatus newStatus = parseStatus(request.getStatus());
        Order.OrderStatus currentStatus = order.getStatus();

        // Validate chuyển trạng thái hợp lệ
        validateStatusTransition(currentStatus, newStatus);
        OrderSecurityHelper.assertCanUpdateOrderStatus(currentStatus, newStatus);

        // Xử lý logic theo trạng thái mới
        switch (newStatus) {
            case CONFIRMED:
                order.setConfirmedAt(LocalDateTime.now());
                break;
            case SHIPPING:
                order.setShippedAt(LocalDateTime.now());
                // Tự động tạo vận đơn GHN nếu có địa chỉ GHN
                if (order.getToDistrictId() != null && order.getToWardCode() != null) {
                    try {
                        // Tính COD: nếu COD và chưa thanh toán thì thu hộ, ngược lại = 0
                        long codAmount = 0;
                        if (order.getPaymentMethod() == Order.PaymentMethod.COD
                                && order.getPaymentStatus() != Order.PaymentStatus.PAID) {
                            codAmount = order.getTotalAmount().longValue();
                        }
                        // Tên hiển thị trên vận đơn
                        List<OrderDetail> orderDetailsList = orderDetailRepository.findByOrderId(order.getId());
                        String itemName = orderDetailsList.isEmpty() ? "Đơn hàng Electro Store" : orderDetailsList.get(0).getProductName();
                        int totalQty = orderDetailsList.stream().mapToInt(OrderDetail::getQuantity).sum();

                        GHNDto.CreateOrderResponse ghnResult = ghnService.createShippingOrder(
                                order.getOrderCode(),
                                order.getShippingName(),
                                order.getShippingPhone(),
                                order.getShippingAddress(),
                                order.getToWardCode(),
                                order.getToDistrictId(),
                                codAmount,
                                order.getTotalAmount().longValue(),
                                itemName,
                                totalQty
                        );
                        order.setTrackingCode(ghnResult.getOrderCode());
                        order.setGhnOrderCode(ghnResult.getOrderCode());
                        log.info("Auto-created GHN order {} for internal order {}", ghnResult.getOrderCode(), order.getOrderCode());
                    } catch (Exception e) {
                        log.warn("GHN auto-create failed for order {}: {}. Falling back to manual tracking.", order.getOrderCode(), e.getMessage());
                        // Fallback: dùng tracking code thủ công nếu GHN tạo lỗi
                        if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank()) {
                            order.setTrackingCode(request.getTrackingCode());
                        }
                    }
                } else {
                    // Không có GHN address → dùng tracking code thủ công
                    if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank()) {
                        order.setTrackingCode(request.getTrackingCode());
                    }
                }
                break;
            case DELIVERED:
                order.setDeliveredAt(LocalDateTime.now());
                // COD: tự động đánh dấu đã thanh toán + đối soát shipper
                if (order.getPaymentMethod() == Order.PaymentMethod.COD) {
                    order.setPaymentStatus(Order.PaymentStatus.PAID);
                    order.setCodReconciled(true);
                }
                // Kích hoạt bảo hành cho tất cả máy đã gán IMEI trong đơn
                activateWarrantyForOrder(order.getId());
                break;
            case CANCELLED:
                order.setCancelledAt(LocalDateTime.now());
                order.setCancelReason(request.getCancelReason() != null ? request.getCancelReason() : "Admin hủy đơn");
                // Hủy vận đơn GHN nếu đã tạo
                if (order.getGhnOrderCode() != null && !order.getGhnOrderCode().isBlank()) {
                    try {
                        ghnService.cancelShippingOrder(List.of(order.getGhnOrderCode()));
                        log.info("Auto-cancelled GHN order {} for internal order {}", order.getGhnOrderCode(), order.getOrderCode());
                    } catch (Exception e) {
                        log.warn("GHN auto-cancel failed for order {}: {}", order.getOrderCode(), e.getMessage());
                    }
                }
                // Hoàn kho
                restoreStock(order.getId());
                // Hoàn coupon
                restoreCoupon(order);
                break;
            case REFUNDED:
                order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
                // Hoàn kho nếu chưa hoàn (chỉ khi từ DELIVERED)
                if (currentStatus == Order.OrderStatus.DELIVERED || currentStatus == Order.OrderStatus.COMPLETED) {
                    restoreStock(order.getId());
                }
                break;
            default:
                break;
        }

        order.setStatus(newStatus);

        // Cập nhật admin note nếu có
        if (request.getAdminNote() != null) {
            order.setAdminNote(request.getAdminNote());
        }

        orderRepository.save(order);

        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        OrderDto.AdminOrderResponse response = mapToAdminOrderResponse(order, details);
        if (newStatus == Order.OrderStatus.CANCELLED) {
            RefundDto.CancellationRefundResult cancellationRefund = triggerPreDeliveryCancellationRefund(
                    order, request.getCancelReason());
            order = orderRepository.findById(order.getId()).orElse(order);
            response = mapToAdminOrderResponse(order, details);
            response.setCancellationRefund(cancellationRefund);
        }
        return response;
    }

    /**
     * Cập nhật thông tin giao hàng & ghi chú — không thay đổi giá trị đơn.
     * Sales: chỉ PENDING / CONFIRMED. Admin: mọi trạng thái (hỗ trợ đặc biệt).
     */
    public OrderDto.AdminOrderResponse adminUpdateDeliveryInfo(
            Integer orderId, OrderDto.UpdateDeliveryInfoRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!OrderSecurityHelper.hasFullOrderManageAccess()
                && !SalesOrderEditPolicy.canEditDelivery(order.getStatus())) {
            throw new BadRequestException(SalesOrderEditPolicy.lockMessage(order.getStatus()));
        }

        order.setShippingName(requireNonBlank(request.getShippingName(), "Tên người nhận"));
        order.setShippingPhone(requireNonBlank(request.getShippingPhone(), "Số điện thoại nhận hàng"));
        order.setShippingAddress(requireNonBlank(request.getShippingAddress(), "Địa chỉ giao hàng"));

        if (request.getShippingProvince() != null) {
            order.setShippingProvince(request.getShippingProvince().trim());
        }
        if (request.getShippingDistrict() != null) {
            order.setShippingDistrict(request.getShippingDistrict().trim());
        }
        if (request.getShippingWard() != null) {
            order.setShippingWard(request.getShippingWard().trim());
        }
        if (request.getNote() != null) {
            order.setNote(request.getNote().trim());
        }
        if (request.getAdminNote() != null) {
            order.setAdminNote(request.getAdminNote().trim());
        }

        orderRepository.save(order);
        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        return mapToAdminOrderResponse(order, details);
    }

    private static String requireNonBlank(String value, String fieldLabel) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(fieldLabel + " không được để trống");
        }
        return value.trim();
    }

    /**
     * Admin cập nhật trạng thái thanh toán
     */
    public OrderDto.AdminOrderResponse adminUpdatePaymentStatus(Integer orderId, OrderDto.UpdatePaymentStatusRequest request) {
        OrderSecurityHelper.assertCanUpdatePaymentStatus();

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        Order.PaymentStatus newPaymentStatus;
        try {
            newPaymentStatus = Order.PaymentStatus.valueOf(request.getPaymentStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái thanh toán không hợp lệ: " + request.getPaymentStatus()
                    + ". Chấp nhận: PENDING, PAID, FAILED, REFUNDED");
        }

        order.setPaymentStatus(newPaymentStatus);
        orderRepository.save(order);

        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        return mapToAdminOrderResponse(order, details);
    }

    /**
     * Admin hủy đơn hàng (mạnh hơn user — có thể hủy ở nhiều trạng thái hơn)
     */
    public OrderDto.AdminOrderResponse adminCancelOrder(Integer orderId, OrderDto.CancelRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        OrderSecurityHelper.assertCanCancelOrder(order.getStatus());

        if (order.getStatus() == Order.OrderStatus.COMPLETED) {
            throw new BadRequestException("Không thể hủy đơn hàng đã hoàn thành. Hãy dùng trạng thái REFUNDED.");
        }
        if (order.getStatus() == Order.OrderStatus.CANCELLED) {
            throw new BadRequestException("Đơn hàng đã bị hủy trước đó");
        }

        // Hoàn kho + coupon
        if (order.getStatus() != Order.OrderStatus.REFUNDED) {
            restoreStock(order.getId());
            restoreCoupon(order);
        }

        order.setStatus(Order.OrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason(request != null && request.getReason() != null ? request.getReason() : "Admin hủy đơn");
        orderRepository.save(order);

        RefundDto.CancellationRefundResult cancellationRefund = triggerPreDeliveryCancellationRefund(
                order, order.getCancelReason());

        order = orderRepository.findById(order.getId()).orElse(order);
        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        OrderDto.AdminOrderResponse response = mapToAdminOrderResponse(order, details);
        response.setCancellationRefund(cancellationRefund);
        return response;
    }

    /**
     * Thống kê đơn hàng theo trạng thái
     */
    @Transactional(readOnly = true)
    public OrderDto.OrderStatsResponse getOrderStats() {
        OrderDto.OrderStatsResponse stats = new OrderDto.OrderStatsResponse();
        stats.setTotalOrders(orderRepository.count());
        stats.setPendingOrders(orderRepository.countByStatus(Order.OrderStatus.PENDING));
        stats.setConfirmedOrders(orderRepository.countByStatus(Order.OrderStatus.CONFIRMED));
        stats.setProcessingOrders(orderRepository.countByStatus(Order.OrderStatus.PROCESSING));
        stats.setShippingOrders(orderRepository.countByStatus(Order.OrderStatus.SHIPPING));
        stats.setDeliveredOrders(orderRepository.countByStatus(Order.OrderStatus.DELIVERED));
        stats.setCompletedOrders(orderRepository.countByStatus(Order.OrderStatus.COMPLETED));
        stats.setCancelledOrders(orderRepository.countByStatus(Order.OrderStatus.CANCELLED));
        stats.setRefundedOrders(orderRepository.countByStatus(Order.OrderStatus.REFUNDED));
        stats.setHiddenOrders(orderRepository.countHiddenOrders()); // số đơn đang bị ẩn
        return stats;
    }

    /**
     * Admin ẩn / hiện đơn hàng (Soft Delete toggle)
     * - hidden = true  → ẩn khỏi danh sách
     * - hidden = false → hiện lại
     */
    public OrderDto.AdminOrderResponse adminToggleOrderVisibility(
            Integer orderId, OrderDto.UpdateVisibilityRequest request) {

        OrderSecurityHelper.assertCanToggleVisibility();

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        boolean willHide = Boolean.TRUE.equals(request.getHidden());
        order.setIsHidden(willHide);

        if (willHide) {
            order.setHiddenAt(LocalDateTime.now());
            order.setHiddenReason(request.getReason() != null ? request.getReason() : null);
        } else {
            // Khi unhide, xóa thông tin ẩn
            order.setHiddenAt(null);
            order.setHiddenReason(null);
        }

        orderRepository.save(order);

        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        return mapToAdminOrderResponse(order, details);
    }

    /**
     * Admin xem danh sách đơn hàng đã bị ẩn
     */
    @Transactional(readOnly = true)
    public Page<OrderDto.AdminOrderSummaryResponse> adminGetHiddenOrders(Pageable pageable) {
        return mapAdminOrderPage(orderRepository.findHiddenOrders(pageable));
    }

    // ─── Admin helper: validate chuyển trạng thái ─────────────────────────────
    private void validateStatusTransition(Order.OrderStatus current, Order.OrderStatus newStatus) {
        if (current == newStatus) {
            throw new BadRequestException("Đơn hàng đã ở trạng thái " + current);
        }

        boolean valid = switch (current) {
            case PENDING -> newStatus == Order.OrderStatus.CONFIRMED || newStatus == Order.OrderStatus.CANCELLED;
            case CONFIRMED -> newStatus == Order.OrderStatus.PROCESSING || newStatus == Order.OrderStatus.CANCELLED;
            case PROCESSING -> newStatus == Order.OrderStatus.SHIPPING || newStatus == Order.OrderStatus.CANCELLED;
            case SHIPPING -> newStatus == Order.OrderStatus.DELIVERED || newStatus == Order.OrderStatus.CANCELLED;
            case DELIVERED -> newStatus == Order.OrderStatus.COMPLETED || newStatus == Order.OrderStatus.REFUNDED;
            case COMPLETED -> newStatus == Order.OrderStatus.REFUNDED;
            case CANCELLED -> newStatus == Order.OrderStatus.REFUNDED;
            case REFUNDED -> false;
        };

        if (!valid) {
            throw new BadRequestException(
                    "Không thể chuyển từ " + current + " sang " + newStatus
                            + ". Flow: PENDING → CONFIRMED → PROCESSING → SHIPPING → DELIVERED → COMPLETED");
        }
    }

    // ─── Admin helper: parse status string ────────────────────────────────────
    private Order.OrderStatus parseStatus(String status) {
        try {
            return Order.OrderStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + status
                    + ". Chấp nhận: PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, COMPLETED, CANCELLED, REFUNDED");
        }
    }

    // ─── Admin helper: hoàn kho ───────────────────────────────────────────────
    private void restoreStock(Integer orderId) {
        releaseAssignedProductItems(orderId);
        List<OrderDetail> details = orderDetailRepository.findByOrderId(orderId);
        for (OrderDetail detail : details) {
            if (detail.getVariantId() != null) {
                catalogClient.updateStock(detail.getVariantId(), detail.getQuantity());
            }
        }
    }

    private void releaseAssignedProductItems(Integer orderId) {
        List<OrderItem> assigned = orderItemRepository.findByOrderId(orderId);
        for (OrderItem oi : assigned) {
            if (oi.getProductItemId() != null) {
                try {
                    catalogClient.releaseItem(oi.getProductItemId());
                } catch (Exception e) {
                    log.warn("Không thể giải phóng ProductItem #{}: {}", oi.getProductItemId(), e.getMessage());
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GÁN IMEI / SERIAL CHO ĐƠN HÀNG (Xuất kho)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Admin gán mã IMEI/Serial thực tế cho một dòng chi tiết đơn hàng.
     * Nghiệp vụ:
     * - Kiểm tra đơn hàng ở trạng thái cho phép gán (CONFIRMED / PROCESSING).
     * - Kiểm tra số IMEI gán không vượt quá số lượng đã đặt.
     * - Mỗi IMEI phải đang AVAILABLE và thuộc đúng variant đã đặt.
     * - Lưu vào bảng order_item_serials.
     */
    public OrderDto.AdminOrderResponse assignImeiToOrder(Integer orderId, OrderDto.AssignImeiRequest request) {
        OrderSecurityHelper.assertCanAssignImei();

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        Order.OrderStatus orderStatus = order.getStatus();
        boolean allowAssign = orderStatus == Order.OrderStatus.CONFIRMED
                || orderStatus == Order.OrderStatus.PROCESSING
                || orderStatus == Order.OrderStatus.SHIPPING
                || orderStatus == Order.OrderStatus.DELIVERED
                || orderStatus == Order.OrderStatus.COMPLETED;
        if (!allowAssign) {
            throw new BadRequestException(
                    "Không thể gán IMEI cho đơn hàng ở trạng thái " + orderStatus);
        }

        OrderDetail orderDetail = orderDetailRepository.findById(request.getOrderDetailId())
                .orElseThrow(() -> new ResourceNotFoundException("OrderDetail", "id", request.getOrderDetailId()));

        // Kiểm tra orderDetail thuộc đúng order này
        if (!orderDetail.getOrder().getId().equals(orderId)) {
            throw new BadRequestException("Chi tiết đơn hàng không thuộc đơn hàng #" + orderId);
        }

        // Kiểm tra số lượng: đã gán + đang gán mới <= quantity
        long alreadyAssigned = orderItemRepository.countByOrderDetailId(orderDetail.getId());
        if (alreadyAssigned + request.getImeis().size() > orderDetail.getQuantity()) {
            throw new BadRequestException(
                    "Số lượng IMEI vượt quá số lượng đặt hàng. Đã gán: " + alreadyAssigned
                            + ", đang gán thêm: " + request.getImeis().size()
                            + ", tối đa: " + orderDetail.getQuantity());
        }

        Integer expectedVariantId = orderDetail.getVariantId();

        for (String imeiOrSerial : request.getImeis()) {
            String code = imeiOrSerial == null ? "" : imeiOrSerial.trim();
            if (code.isEmpty()) {
                throw new BadRequestException("IMEI/Serial không được để trống");
            }

            CatalogClientDto.ProductItemResponse productItem = findProductItemByCode(code);

            if (!expectedVariantId.equals(productItem.getVariantId())) {
                CatalogClientDto.VariantResponse v = catalogClient.getVariantById(productItem.getVariantId());
                throw new BadRequestException(
                        "IMEI/Serial \"" + code + "\" thuộc mã hàng khác ("
                                + (v != null ? v.getVariantName() : "Unknown")
                                + "), không khớp với dòng đặt hàng ("
                                + orderDetail.getVariantName() + ")");
            }

            if (!"AVAILABLE".equalsIgnoreCase(productItem.getStatus())) {
                throw new BadRequestException(
                        "IMEI/Serial \"" + code + "\" không khả dụng. "
                                + "Trạng thái hiện tại: " + productItem.getStatus());
            }

            catalogClient.reserveItem(productItem.getId());

            OrderItem orderItem = new OrderItem();
            orderItem.setOrderDetail(orderDetail);
            orderItem.setProductItemId(productItem.getId());
            orderItem.setImei(productItem.getImei());
            orderItem.setSerialNumber(productItem.getSerialNumber());
            orderItemRepository.save(orderItem);
        }

        log.info("Đã gán {} IMEI/Serial cho OrderDetail #{} (Order #{})",
                request.getImeis().size(), orderDetail.getId(), orderId);

        if (orderStatus == Order.OrderStatus.DELIVERED
                || orderStatus == Order.OrderStatus.COMPLETED) {
            activateWarrantyForOrder(order.getId());
        }

        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        return mapToAdminOrderResponse(order, details);
    }

    /**
     * Kích hoạt bảo hành cho tất cả máy đã gán IMEI khi đơn DELIVERED.
     * - Gán warrantyStartDate = ngày giao hàng.
     */
    public void activateWarrantyForOrder(Integer orderId) {
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(orderId);
        if (orderItems == null || orderItems.isEmpty()) {
            return;
        }

        List<Integer> itemIds = orderItems.stream()
                .map(OrderItem::getProductItemId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());

        if (itemIds.isEmpty()) {
            return;
        }

        CatalogClientDto.ActivateWarrantyRequest req = new CatalogClientDto.ActivateWarrantyRequest();
        req.setItemIds(itemIds);
        CatalogClientDto.ActivateWarrantyResponse result = catalogClient.activateWarranty(req);
        log.info("Đã kích hoạt bảo hành cho {} máy trong đơn hàng #{}", result.getActivatedCount(), orderId);
    }

    private CatalogClientDto.ProductItemResponse findProductItemByCode(String code) {
        try {
            return catalogClient.findItemByCode(code);
        } catch (feign.FeignException.NotFound e) {
            throw new ResourceNotFoundException("ProductItem", "imeiOrSerial", code);
        } catch (feign.FeignException.BadRequest e) {
            String message = e.contentUTF8();
            if (message != null && message.contains("\"message\"")) {
                int start = message.indexOf("\"message\"");
                message = message.substring(start);
            }
            throw new BadRequestException(message != null && !message.isBlank() ? message : e.getMessage());
        }
    }

    // ─── Admin helper: hoàn coupon ────────────────────────────────────────────
    private RefundDto.CancellationRefundResult triggerPreDeliveryCancellationRefund(
            Order order, String cancelReason) {
        if (!refundService.isEligibleForPreDeliveryCancellation(order)) {
            return RefundDto.CancellationRefundResult.builder()
                    .attempted(false)
                    .build();
        }
        try {
            return refundService.processPreDeliveryCancellationRefund(
                    order.getId(), cancelReason, resolveActorUsername());
        } catch (Exception e) {
            log.error("Pre-delivery cancellation refund failed for {}: {}",
                    order.getOrderCode(), e.getMessage(), e);
            return RefundDto.CancellationRefundResult.builder()
                    .attempted(true)
                    .message("Đã hủy đơn nhưng hoàn cổng thất bại: " + e.getMessage())
                    .build();
        }
    }

    private String resolveActorUsername() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "system";
    }

    private void restoreCoupon(Order order) {
        if (order.getCoupon() != null) {
            Coupon coupon = order.getCoupon();
            coupon.setUsedCount(Math.max(0, coupon.getUsedCount() - 1));
            couponRepository.save(coupon);
        }
    }

    // ─── Admin mapper: Order → AdminOrderResponse ─────────────────────────────
    private OrderDto.AdminOrderResponse mapToAdminOrderResponse(Order order, List<OrderDetail> details) {
        OrderDto.AdminOrderResponse r = new OrderDto.AdminOrderResponse();
        r.setId(order.getId());
        r.setOrderCode(order.getOrderCode());

        // Thông tin khách hàng
        com.electro.order.dto.UserDto.Response user = userClient.getUserById(order.getUserId());
        r.setUserId(user.getId());
        r.setUsername(user.getUsername());
        r.setCustomerName(user.getName());
        r.setCustomerEmail(user.getEmail());
        r.setCustomerPhone(user.getPhone());

        // Giao hàng
        r.setShippingName(order.getShippingName());
        r.setShippingPhone(order.getShippingPhone());
        r.setShippingAddress(order.getShippingAddress());
        r.setShippingProvince(order.getShippingProvince());
        r.setShippingDistrict(order.getShippingDistrict());
        r.setShippingWard(order.getShippingWard());
        r.setShippingFee(order.getShippingFee());
        r.setTrackingCode(order.getTrackingCode());
        r.setGhnShippingStatus(order.getGhnShippingStatus());
        r.setGhnShippingStatusDisplay(ghnService.translateGHNStatus(order.getGhnShippingStatus()));
        r.setGhnStatusUpdatedAt(order.getGhnStatusUpdatedAt());

        // Thanh toán & trạng thái
        r.setPaymentMethod(order.getPaymentMethod().name());
        r.setPaymentStatus(order.getPaymentStatus().name());
        r.setStatus(order.getStatus().name());
        r.setStatusDisplay(getStatusDisplay(order.getStatus()));

        // Tiền
        r.setSubtotal(order.getSubtotal());
        r.setDiscountAmount(order.getDiscountAmount());
        r.setTotalAmount(order.getTotalAmount());

        // Coupon
        if (order.getCoupon() != null) {
            Coupon c = order.getCoupon();
            OrderDto.CouponInfoResponse ci = new OrderDto.CouponInfoResponse();
            ci.setCode(c.getCode());
            ci.setDiscountType(c.getDiscountType().name());
            ci.setDiscountValue(c.getDiscountValue());
            ci.setDiscountAmount(order.getDiscountAmount());
            r.setCouponInfo(ci);
        }

        // Ghi chú
        r.setNote(order.getNote());
        r.setAdminNote(order.getAdminNote());
        r.setCancelReason(order.getCancelReason());

        // Soft Delete
        r.setIsHidden(order.getIsHidden());
        r.setHiddenAt(order.getHiddenAt());
        r.setHiddenReason(order.getHiddenReason());

        // Thời gian
        r.setOrderDate(order.getOrderDate());
        r.setConfirmedAt(order.getConfirmedAt());
        r.setShippedAt(order.getShippedAt());
        r.setDeliveredAt(order.getDeliveredAt());
        r.setCancelledAt(order.getCancelledAt());

        // Items
        List<OrderDto.OrderItemResponse> itemResponses = new ArrayList<>();
        if (details != null) {
            for (OrderDetail d : details) {
                OrderDto.OrderItemResponse ir = mapOrderDetailToItemResponse(d);
                itemResponses.add(ir);
            }
        }
        r.setItems(itemResponses);
        return r;
    }

    // ─── Admin mapper: Order → AdminOrderSummary ──────────────────────────────
    private OrderDto.AdminOrderSummaryResponse mapToAdminOrderSummary(Order order, List<OrderDetail> details) {
        OrderDto.AdminOrderSummaryResponse s = new OrderDto.AdminOrderSummaryResponse();
        s.setId(order.getId());
        s.setOrderCode(order.getOrderCode());
        s.setStatus(order.getStatus().name());
        s.setStatusDisplay(getStatusDisplay(order.getStatus()));
        s.setPaymentMethod(order.getPaymentMethod().name());
        s.setPaymentStatus(order.getPaymentStatus().name());
        s.setTotalAmount(order.getTotalAmount());
        s.setOrderDate(order.getOrderDate());
        s.setIsHidden(order.getIsHidden());

        // Thông tin khách hàng — dùng dữ liệu đã lưu trên đơn, tránh N+1 gọi user-service
        s.setUserId(order.getUserId());
        s.setCustomerName(order.getShippingName());
        s.setAssignedSalesUserId(order.getAssignedSalesUserId());
        s.setOrderSource(order.getOrderSource() != null ? order.getOrderSource().name() : "WEB_ORGANIC");
        s.setSalesPipelineStatus(order.getSalesPipelineStatus() != null
                ? order.getSalesPipelineStatus().name() : "NEW_ASSIGNED");

        s.setShippingName(order.getShippingName());
        s.setShippingPhone(order.getShippingPhone());
        s.setTrackingCode(order.getTrackingCode());
        s.setGhnShippingStatus(order.getGhnShippingStatus());
        s.setGhnShippingStatusDisplay(ghnService.translateGHNStatus(order.getGhnShippingStatus()));
        s.setCarrierLabel(order.getTrackingCode() != null && !order.getTrackingCode().isBlank()
                ? "Giao Hàng Nhanh (GHN)"
                : "GHN — tạo khi xuất kho");

        if (details != null && !details.isEmpty()) {
            s.setTotalItems(details.stream().mapToInt(OrderDetail::getQuantity).sum());
            OrderDetail first = details.get(0);
            s.setFirstItemName(first.getProductName());
            s.setProductSummary(details.stream()
                    .map(d -> d.getProductName()
                            + (d.getVariantName() != null && !d.getVariantName().isBlank()
                            ? " (" + d.getVariantName() + ")" : "")
                            + " ×" + d.getQuantity())
                    .collect(Collectors.joining(", ")));
        } else {
            s.setTotalItems(0);
            s.setProductSummary("");
        }
        return s;
    }

    private com.electro.order.dto.UserDto.Response findUser(String username) {
        return userClient.getUserByUsername(username);
    }

    private String getStatusDisplay(Order.OrderStatus status) {
        return switch (status) {
            case PENDING -> "Chờ xác nhận";
            case CONFIRMED -> "Đã xác nhận";
            case PROCESSING -> "Đang xử lý";
            case SHIPPING -> "Đang giao hàng";
            case DELIVERED -> "Đã giao hàng";
            case COMPLETED -> "Hoàn thành";
            case CANCELLED -> "Đã hủy";
            case REFUNDED -> "Đã hoàn tiền";
        };
    }

    private String getVariantImageUrl(Integer variantId) {
        if (variantId == null) return null;
        try {
            CatalogClientDto.VariantResponse v = catalogClient.getVariantById(variantId);
            return v != null ? v.getImageUrl() : null;
        } catch (Exception e) {
            log.warn("Could not fetch variant image for variantId={}: {}", variantId, e.getMessage());
            return null;
        }
    }

    // ─── map Order + details → full response ──────────────────────────────────
    private OrderDto.OrderResponse mapToOrderResponse(Order order, List<OrderDetail> details) {
        OrderDto.OrderResponse r = new OrderDto.OrderResponse();
        r.setId(order.getId());
        r.setOrderCode(order.getOrderCode());
        r.setShippingName(order.getShippingName());
        r.setShippingPhone(order.getShippingPhone());
        r.setShippingAddress(order.getShippingAddress());
        r.setShippingProvince(order.getShippingProvince());
        r.setShippingDistrict(order.getShippingDistrict());
        r.setShippingWard(order.getShippingWard());
        r.setToDistrictId(order.getToDistrictId());
        r.setToWardCode(order.getToWardCode());
        r.setShippingFee(order.getShippingFee());
        r.setPaymentMethod(order.getPaymentMethod().name());
        r.setPaymentStatus(order.getPaymentStatus().name());
        r.setStatus(order.getStatus().name());
        r.setStatusDisplay(getStatusDisplay(order.getStatus()));
        r.setPaymentUrl(order.getPaymentUrl());
        r.setTransactionRef(order.getTransactionRef());
        r.setSubtotal(order.getSubtotal());
        r.setDiscountAmount(order.getDiscountAmount());
        r.setTotalAmount(order.getTotalAmount());
        r.setNote(order.getNote());
        r.setCancelReason(order.getCancelReason());
        r.setOrderDate(order.getOrderDate());
        r.setConfirmedAt(order.getConfirmedAt());
        r.setDeliveredAt(order.getDeliveredAt());
        r.setCancelledAt(order.getCancelledAt());

        // Coupon info
        if (order.getCoupon() != null) {
            Coupon c = order.getCoupon();
            OrderDto.CouponInfoResponse ci = new OrderDto.CouponInfoResponse();
            ci.setCode(c.getCode());
            ci.setDiscountType(c.getDiscountType().name());
            ci.setDiscountValue(c.getDiscountValue());
            ci.setDiscountAmount(order.getDiscountAmount());
            r.setCouponInfo(ci);
        }

        // Items
        List<OrderDto.OrderItemResponse> itemResponses = new ArrayList<>();
        if (details != null) {
            for (OrderDetail d : details) {
                OrderDto.OrderItemResponse ir = mapOrderDetailToItemResponse(d);
                itemResponses.add(ir);
            }
        }
        r.setItems(itemResponses);
        return r;
    }

    // ─── map Order → summary (danh sách) ─────────────────────────────────────
    private OrderDto.OrderSummaryResponse mapToOrderSummary(Order order) {
        OrderDto.OrderSummaryResponse s = new OrderDto.OrderSummaryResponse();
        s.setId(order.getId());
        s.setOrderCode(order.getOrderCode());
        s.setStatus(order.getStatus().name());
        s.setStatusDisplay(getStatusDisplay(order.getStatus()));
        s.setPaymentMethod(order.getPaymentMethod().name());
        s.setPaymentStatus(order.getPaymentStatus().name());
        s.setTotalAmount(order.getTotalAmount());
        s.setOrderDate(order.getOrderDate());

        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        if (details != null && !details.isEmpty()) {
            s.setTotalItems(details.stream().mapToInt(OrderDetail::getQuantity).sum());
            OrderDetail first = details.get(0);
            s.setFirstItemName(first.getProductName());
            if (first.getVariantId() != null) {
                s.setFirstItemImage(getVariantImageUrl(first.getVariantId()));
            }
        } else {
            s.setTotalItems(0);
        }
        return s;
    }

    /**
     * Helper chung: map OrderDetail → OrderItemResponse (bao gồm danh sách IMEI đã gán)
     */
    private OrderDto.OrderItemResponse mapOrderDetailToItemResponse(OrderDetail d) {
        OrderDto.OrderItemResponse ir = new OrderDto.OrderItemResponse();
        ir.setId(d.getId());
        ir.setVariantId(d.getVariantId());
        ir.setProductName(d.getProductName());
        ir.setVariantName(d.getVariantName());
        ir.setSkuCode(d.getSkuCode());
        ir.setQuantity(d.getQuantity());
        ir.setUnitPrice(d.getUnitPrice());
        ir.setTotalPrice(d.getTotalPrice());
        if (d.getVariantId() != null) {
            ir.setImageUrl(getVariantImageUrl(d.getVariantId()));
        }

        // Gắn danh sách IMEI/Serial đã được assign cho dòng này
        List<OrderItem> serialItems = orderItemRepository.findByOrderDetailId(d.getId());
        if (serialItems != null && !serialItems.isEmpty()) {
            List<String> imeis = serialItems.stream().map(oi -> {
                if (oi.getImei() != null && !oi.getImei().isBlank()) {
                    return oi.getImei();
                }
                return oi.getSerialNumber();
            }).collect(Collectors.toList());
            ir.setAssignedImeis(imeis);
        }

        return ir;
    }
}


