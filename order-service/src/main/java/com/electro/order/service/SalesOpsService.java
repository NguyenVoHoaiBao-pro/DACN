package com.electro.order.service;

import com.electro.order.dto.UserDto;
import com.electro.order.dto.SalesDto;
import com.electro.order.entity.Order;
import com.electro.order.entity.OrderDetail;
import com.electro.order.entity.SalesKpiConfig;
import com.electro.order.exception.BadRequestException;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.repository.OrderDetailRepository;
import com.electro.order.repository.OrderRepository;
import com.electro.order.repository.SalesKpiConfigRepository;
import com.electro.order.client.UserClient;
import com.electro.order.security.OrderSecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class SalesOpsService {

    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final SalesKpiConfigRepository kpiConfigRepository;
    private final SalesAssignmentService salesAssignmentService;
    private final UserClient userClient;

    public SalesDto.KpiConfigResponse getKpiConfig() {
        return mapConfig(ensureConfig());
    }

    public SalesDto.KpiConfigResponse updateKpiConfig(SalesDto.KpiConfigUpdateRequest req, Integer adminUserId) {
        SalesKpiConfig cfg = ensureConfig();
        if (req.getMonthlyRevenueTarget() != null) {
            cfg.setMonthlyRevenueTarget(req.getMonthlyRevenueTarget());
        }
        if (req.getCommissionRateOrganic() != null) {
            cfg.setCommissionRateOrganic(req.getCommissionRateOrganic());
        }
        if (req.getCommissionRateWeb() != null) {
            cfg.setCommissionRateWeb(req.getCommissionRateWeb());
        }
        if (req.getCommissionRateSalesAssisted() != null) {
            cfg.setCommissionRateSalesAssisted(req.getCommissionRateSalesAssisted());
        }
        if (req.getCommissionRateSalesLink() != null) {
            cfg.setCommissionRateSalesLink(req.getCommissionRateSalesLink());
        }
        if (req.getMaxCancelRatePercent() != null) {
            cfg.setMaxCancelRatePercent(req.getMaxCancelRatePercent());
        }
        cfg.setUpdatedByUserId(adminUserId);
        return mapConfig(kpiConfigRepository.save(cfg));
    }

    @Transactional(readOnly = true)
    public SalesDto.PersonalKpiResponse getPersonalKpi(String username, int year, int month) {
        UserDto.Response user = userClient.getUserByUsername(username);
        return buildPersonalKpi(user.getId(), user.getName(), year, month);
    }

    @Transactional(readOnly = true)
    public SalesDto.PersonalKpiResponse getPersonalKpiForUser(Integer salesUserId, int year, int month) {
        UserDto.Response user = userClient.getUserById(salesUserId);
        return buildPersonalKpi(user.getId(), user.getName(), year, month);
    }

    @Transactional(readOnly = true)
    public SalesDto.StaffKpiOverviewResponse getStaffKpiOverview(int year, int month) {
        List<Map<String, Object>> salesUsers = userClient.getActiveSalesUsers();
        List<SalesDto.PersonalKpiResponse> rows = new ArrayList<>();
        for (Map<String, Object> row : salesUsers) {
            Object idObj = row.get("id");
            if (!(idObj instanceof Number n)) {
                continue;
            }
            String name = row.get("name") != null ? row.get("name").toString() : "";
            rows.add(buildPersonalKpi(n.intValue(), name, year, month));
        }
        rows.sort(Comparator.comparing(SalesDto.PersonalKpiResponse::getProvisionalRevenue).reversed());
        return new SalesDto.StaffKpiOverviewResponse(year, month, rows);
    }

    @Transactional(readOnly = true)
    public List<SalesDto.SalesUserOption> listSalesUsers() {
        return userClient.getActiveSalesUsers().stream()
                .map(row -> {
                    SalesDto.SalesUserOption opt = new SalesDto.SalesUserOption();
                    Object id = row.get("id");
                    if (id instanceof Number n) {
                        opt.setId(n.intValue());
                    }
                    opt.setName(row.get("name") != null ? row.get("name").toString() : "");
                    opt.setEmail(row.get("email") != null ? row.get("email").toString() : "");
                    return opt;
                })
                .filter(o -> o.getId() != null)
                .toList();
    }

    @Transactional(readOnly = true)
    public SalesDto.PipelineBoardResponse getPipelineBoard(String username, boolean allStaff, Integer filterSalesId) {
        Integer salesId = filterSalesId;
        if (!allStaff && salesId == null) {
            salesId = userClient.getUserByUsername(username).getId();
        }

        Map<String, List<SalesDto.PipelineCard>> columns = new LinkedHashMap<>();
        for (Order.SalesPipelineStatus st : Order.SalesPipelineStatus.values()) {
            columns.put(st.name(), new ArrayList<>());
        }

        List<Order> orders;
        if (salesId != null) {
            orders = orderRepository.findByAssignedSalesUserIdAndIsHiddenFalseOrderByOrderDateDesc(salesId);
        } else {
            orders = orderRepository.findByIsHiddenFalseAndAssignedSalesUserIdIsNotNullOrderByOrderDateDesc();
        }

        int activeCount = 0;
        for (Order o : orders) {
            if (!isActivePipelineOrder(o)) {
                continue;
            }
            activeCount++;
            Order.SalesPipelineStatus st = o.getSalesPipelineStatus() != null
                    ? o.getSalesPipelineStatus() : Order.SalesPipelineStatus.NEW_ASSIGNED;
            columns.computeIfAbsent(st.name(), k -> new ArrayList<>()).add(toPipelineCard(o));
        }

        SalesDto.PipelineBoardResponse response = new SalesDto.PipelineBoardResponse();
        response.setColumns(columns);
        response.setActiveOrderCount(activeCount);
        return response;
    }

    public Order updatePipeline(Integer orderId, String status, String username) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!OrderSecurityHelper.hasFullOrderManageAccess()) {
            UserDto.Response user = userClient.getUserByUsername(username);
            if (order.getAssignedSalesUserId() == null
                    || !order.getAssignedSalesUserId().equals(user.getId())) {
                throw new BadRequestException("Bạn chỉ được cập nhật đơn được gán cho mình");
            }
        }

        Order.SalesPipelineStatus newStatus = Order.SalesPipelineStatus.valueOf(status);
        order.setSalesPipelineStatus(newStatus);
        if (newStatus == Order.SalesPipelineStatus.APPROVED_WAREHOUSE
                && order.getStatus() == Order.OrderStatus.PENDING) {
            order.setStatus(Order.OrderStatus.CONFIRMED);
            order.setConfirmedAt(LocalDateTime.now());
        }
        return orderRepository.save(order);
    }

    public Order attributeOrder(Integer orderId, SalesDto.AttributeOrderRequest request, String username) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        UserDto.Response sales = userClient.getUserByUsername(username);

        if (!OrderSecurityHelper.hasFullOrderManageAccess()
                && (order.getAssignedSalesUserId() == null
                || !order.getAssignedSalesUserId().equals(sales.getId()))) {
            throw new BadRequestException("Bạn chỉ được gắn nguồn cho đơn được gán cho mình");
        }

        Order.OrderSource source = parseOrderSource(request.getOrderSource());
        salesAssignmentService.attributeToSales(order, sales.getId(), source);
        return order;
    }

    public Order attributeOrderByCode(SalesDto.AttributeOrderRequest request, String username) {
        if (request.getOrderCode() == null || request.getOrderCode().isBlank()) {
            throw new BadRequestException("Vui lòng nhập mã đơn hàng");
        }
        Order order = orderRepository.findByOrderCode(request.getOrderCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderCode", request.getOrderCode()));
        return attributeOrder(order.getId(), request, username);
    }

    private SalesDto.PersonalKpiResponse buildPersonalKpi(Integer salesUserId, String salesName, int year, int month) {
        SalesKpiConfig cfg = ensureConfig();
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

        List<Order> assigned = orderRepository.findByAssignedSalesUserIdAndOrderDateBetween(
                salesUserId, start, end);

        List<Order> delivered = assigned.stream()
                .filter(o -> o.getStatus() == Order.OrderStatus.DELIVERED
                        || o.getStatus() == Order.OrderStatus.COMPLETED)
                .collect(Collectors.toList());

        long cancelled = assigned.stream()
                .filter(o -> o.getStatus() == Order.OrderStatus.CANCELLED)
                .count();

        BigDecimal revenue = delivered.stream()
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<SalesDto.CommissionLine> lines = new ArrayList<>();
        BigDecimal commission = BigDecimal.ZERO;
        for (Order o : delivered) {
            BigDecimal rate = rateForOrder(cfg, o);
            BigDecimal lineCommission = o.getTotalAmount().multiply(rate).setScale(0, RoundingMode.HALF_UP);
            commission = commission.add(lineCommission);
            SalesDto.CommissionLine line = new SalesDto.CommissionLine();
            line.setOrderId(o.getId());
            line.setOrderCode(o.getOrderCode());
            line.setOrderDate(o.getOrderDate());
            line.setTotalAmount(o.getTotalAmount());
            line.setOrderSource(resolveOrderSourceLabel(o));
            line.setCommissionAmount(lineCommission);
            line.setFirstItemName(firstItemName(o.getId()));
            lines.add(line);
        }

        BigDecimal cancelRate = assigned.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(cancelled * 100.0 / assigned.size()).setScale(1, RoundingMode.HALF_UP);

        BigDecimal progress = cfg.getMonthlyRevenueTarget().signum() == 0
                ? BigDecimal.ZERO
                : revenue.multiply(BigDecimal.valueOf(100))
                .divide(cfg.getMonthlyRevenueTarget(), 1, RoundingMode.HALF_UP);

        boolean cancelExceeded = cancelRate.compareTo(cfg.getMaxCancelRatePercent()) > 0;

        SalesDto.PersonalKpiResponse r = new SalesDto.PersonalKpiResponse();
        r.setYear(year);
        r.setMonth(month);
        r.setSalesUserId(salesUserId);
        r.setSalesUserName(salesName);
        r.setMonthlyRevenueTarget(cfg.getMonthlyRevenueTarget());
        r.setProvisionalRevenue(revenue);
        r.setAccumulatedCommission(commission);
        r.setCancelRatePercent(cancelRate);
        r.setMaxCancelRatePercent(cfg.getMaxCancelRatePercent());
        r.setCancelRateExceeded(cancelExceeded);
        r.setTotalAssignedOrders(assigned.size());
        r.setDeliveredOrders(delivered.size());
        r.setCancelledOrders(cancelled);
        r.setProgressPercent(progress.min(BigDecimal.valueOf(100)));
        r.setCommissionLines(lines);
        return r;
    }

    private static boolean isActivePipelineOrder(Order o) {
        if (o.getSalesPipelineStatus() == Order.SalesPipelineStatus.APPROVED_WAREHOUSE) {
            return false;
        }
        return o.getStatus() == Order.OrderStatus.PENDING
                || o.getStatus() == Order.OrderStatus.CONFIRMED;
    }

    private SalesDto.PipelineCard toPipelineCard(Order o) {
        SalesDto.PipelineCard c = new SalesDto.PipelineCard();
        c.setOrderId(o.getId());
        c.setOrderCode(o.getOrderCode());
        c.setTotalAmount(o.getTotalAmount());
        c.setOrderDate(o.getOrderDate());
        c.setOrderSource(resolveOrderSourceLabel(o));
        c.setOrderStatus(o.getStatus().name());
        c.setPipelineStatus(o.getSalesPipelineStatus() != null
                ? o.getSalesPipelineStatus().name() : Order.SalesPipelineStatus.NEW_ASSIGNED.name());
        try {
            UserDto.Response u = userClient.getUserById(o.getUserId());
            c.setCustomerName(u.getName());
        } catch (Exception ignored) {
            c.setCustomerName(o.getShippingName());
        }
        String note = o.getNote() != null ? o.getNote() : "";
        if (o.getAdminNote() != null && !o.getAdminNote().isBlank()) {
            note = (note.isBlank() ? "" : note + " · ") + o.getAdminNote();
        }
        c.setNote(note.isBlank() ? o.getStatus().name() : note);
        return c;
    }

    private SalesKpiConfig ensureConfig() {
        return kpiConfigRepository.findById(1).orElseGet(() -> {
            SalesKpiConfig c = new SalesKpiConfig();
            c.setId(1);
            return kpiConfigRepository.save(c);
        });
    }

    private static BigDecimal rateForOrder(SalesKpiConfig cfg, Order order) {
        Order.OrderSource source = order.getOrderSource();
        if (source == null || source == Order.OrderSource.WEB_ORGANIC) {
            if (order.getAssignedSalesUserId() != null) {
                return cfg.getCommissionRateWeb();
            }
            return cfg.getCommissionRateOrganic();
        }
        return switch (source) {
            case WEB_ASSIGNED -> cfg.getCommissionRateWeb();
            case SALES_CHAT, ADMIN_SALES -> cfg.getCommissionRateSalesAssisted();
            case SALES_LINK -> cfg.getCommissionRateSalesLink();
            default -> cfg.getCommissionRateOrganic();
        };
    }

    private static String resolveOrderSourceLabel(Order order) {
        Order.OrderSource source = order.getOrderSource();
        if (source == null) {
            return order.getAssignedSalesUserId() != null ? "WEB_ASSIGNED" : "WEB_ORGANIC";
        }
        if (source == Order.OrderSource.WEB_ORGANIC && order.getAssignedSalesUserId() != null) {
            return "WEB_ASSIGNED";
        }
        return source.name();
    }

    private static Order.OrderSource parseOrderSource(String raw) {
        if (raw == null || raw.isBlank()) {
            return Order.OrderSource.SALES_CHAT;
        }
        try {
            return Order.OrderSource.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Nguồn đơn không hợp lệ: " + raw);
        }
    }

    private String firstItemName(Integer orderId) {
        List<OrderDetail> d = orderDetailRepository.findByOrderId(orderId);
        if (d != null && !d.isEmpty()) {
            return d.get(0).getProductName();
        }
        return "";
    }

    private static SalesDto.KpiConfigResponse mapConfig(SalesKpiConfig cfg) {
        SalesDto.KpiConfigResponse r = new SalesDto.KpiConfigResponse();
        r.setMonthlyRevenueTarget(cfg.getMonthlyRevenueTarget());
        r.setCommissionRateOrganic(cfg.getCommissionRateOrganic());
        r.setCommissionRateWeb(cfg.getCommissionRateWeb());
        r.setCommissionRateSalesAssisted(cfg.getCommissionRateSalesAssisted());
        r.setCommissionRateSalesLink(cfg.getCommissionRateSalesLink());
        r.setMaxCancelRatePercent(cfg.getMaxCancelRatePercent());
        r.setUpdatedAt(cfg.getUpdatedAt());
        return r;
    }
}
