package com.electro.order.controller;

import com.electro.shared.dto.ApiResponse;
import com.electro.order.dto.SalesDto;
import com.electro.order.entity.Order;
import com.electro.order.service.SalesOpsService;
import com.electro.order.client.UserClient;
import com.electro.order.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/sales")
@RequiredArgsConstructor
public class AdminSalesController {

    private final SalesOpsService salesOpsService;
    private final UserClient userClient;

    @GetMapping("/pipeline")
    @PreAuthorize("hasAnyAuthority('ORDER_VIEW_ALL', 'REPORT_SALES', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<SalesDto.PipelineBoardResponse>> pipeline(
            @RequestParam(defaultValue = "false") boolean allStaff,
            @RequestParam(required = false) Integer salesUserId) {
        return ResponseEntity.ok(ApiResponse.success("Pipeline",
                salesOpsService.getPipelineBoard(currentUsername(), allStaff, salesUserId)));
    }

    @PutMapping("/orders/{orderId}/pipeline-status")
    @PreAuthorize("hasAnyAuthority('ORDER_CONFIRM', 'ORDER_VIEW_ALL', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<Order>> updatePipeline(
            @PathVariable Integer orderId,
            @RequestBody SalesDto.UpdatePipelineRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Pipeline updated",
                salesOpsService.updatePipeline(orderId, request.getPipelineStatus(), currentUsername())));
    }

    @PutMapping("/orders/{orderId}/attribution")
    @PreAuthorize("hasAnyAuthority('ORDER_CONFIRM', 'REPORT_SALES', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<Order>> attributeOrder(
            @PathVariable Integer orderId,
            @RequestBody SalesDto.AttributeOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Order attributed",
                salesOpsService.attributeOrder(orderId, request, currentUsername())));
    }

    @PutMapping("/orders/attribution-by-code")
    @PreAuthorize("hasAnyAuthority('ORDER_CONFIRM', 'REPORT_SALES', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<Order>> attributeOrderByCode(
            @RequestBody SalesDto.AttributeOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Order attributed",
                salesOpsService.attributeOrderByCode(request, currentUsername())));
    }

    @GetMapping("/my-kpi")
    @PreAuthorize("hasAnyAuthority('REPORT_SALES', 'ORDER_VIEW_ALL', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<SalesDto.PersonalKpiResponse>> myKpi(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        java.time.YearMonth ym = java.time.YearMonth.now();
        int y = year != null ? year : ym.getYear();
        int m = month != null ? month : ym.getMonthValue();
        return ResponseEntity.ok(ApiResponse.success("KPI",
                salesOpsService.getPersonalKpi(currentUsername(), y, m)));
    }

    @GetMapping("/staff-kpi")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'REPORT_REVENUE', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<SalesDto.StaffKpiOverviewResponse>> staffKpi(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        java.time.YearMonth ym = java.time.YearMonth.now();
        int y = year != null ? year : ym.getYear();
        int m = month != null ? month : ym.getMonthValue();
        return ResponseEntity.ok(ApiResponse.success("Staff KPI",
                salesOpsService.getStaffKpiOverview(y, m)));
    }

    @GetMapping("/sales-users")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'REPORT_REVENUE', 'ORDER_VIEW_ALL', 'REPORT_SALES', 'ROLE_ADMIN', 'ADMIN', 'ROLE_SALES', 'SALES')")
    public ResponseEntity<ApiResponse<List<SalesDto.SalesUserOption>>> salesUsers() {
        return ResponseEntity.ok(ApiResponse.success("Sales users", salesOpsService.listSalesUsers()));
    }

    @GetMapping("/kpi-config")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<SalesDto.KpiConfigResponse>> getKpiConfig() {
        return ResponseEntity.ok(ApiResponse.success("Config", salesOpsService.getKpiConfig()));
    }

    @PutMapping("/kpi-config")
    @PreAuthorize("hasAnyAuthority('USER_MANAGE', 'ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<SalesDto.KpiConfigResponse>> updateKpiConfig(
            @RequestBody SalesDto.KpiConfigUpdateRequest request) {
        Integer adminId = resolveUserId(currentUsername());
        return ResponseEntity.ok(ApiResponse.success("Config updated",
                salesOpsService.updateKpiConfig(request, adminId)));
    }

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private Integer resolveUserId(String username) {
        try {
            UserDto.Response u = userClient.getUserByUsername(username);
            return u.getId();
        } catch (Exception e) {
            return null;
        }
    }
}
