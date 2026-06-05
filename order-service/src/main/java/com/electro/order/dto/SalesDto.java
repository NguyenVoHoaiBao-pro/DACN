package com.electro.order.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class SalesDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiConfigResponse {
        private BigDecimal monthlyRevenueTarget;
        private BigDecimal commissionRateOrganic;
        private BigDecimal commissionRateWeb;
        private BigDecimal commissionRateSalesAssisted;
        private BigDecimal commissionRateSalesLink;
        private BigDecimal maxCancelRatePercent;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiConfigUpdateRequest {
        private BigDecimal monthlyRevenueTarget;
        private BigDecimal commissionRateOrganic;
        private BigDecimal commissionRateWeb;
        private BigDecimal commissionRateSalesAssisted;
        private BigDecimal commissionRateSalesLink;
        private BigDecimal maxCancelRatePercent;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalKpiResponse {
        private int year;
        private int month;
        private Integer salesUserId;
        private String salesUserName;
        private BigDecimal monthlyRevenueTarget;
        private BigDecimal provisionalRevenue;
        private BigDecimal accumulatedCommission;
        private BigDecimal cancelRatePercent;
        private BigDecimal maxCancelRatePercent;
        private boolean cancelRateExceeded;
        private long totalAssignedOrders;
        private long deliveredOrders;
        private long cancelledOrders;
        private BigDecimal progressPercent;
        private List<CommissionLine> commissionLines;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffKpiOverviewResponse {
        private int year;
        private int month;
        private List<PersonalKpiResponse> staffRows;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesUserOption {
        private Integer id;
        private String name;
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttributeOrderRequest {
        private String orderSource;
        private String orderCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommissionLine {
        private Integer orderId;
        private String orderCode;
        private LocalDateTime orderDate;
        private String firstItemName;
        private BigDecimal totalAmount;
        private String orderSource;
        private BigDecimal commissionAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PipelineCard {
        private Integer orderId;
        private String orderCode;
        private String customerName;
        private String note;
        private BigDecimal totalAmount;
        private String orderSource;
        private String orderStatus;
        private String pipelineStatus;
        private LocalDateTime orderDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PipelineBoardResponse {
        private Map<String, List<PipelineCard>> columns;
        private int activeOrderCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatePipelineRequest {
        private String pipelineStatus;
    }
}
