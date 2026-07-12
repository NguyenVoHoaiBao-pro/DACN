package com.electro.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceSummaryDTO {
    private String startDate;
    private String endDate;
    private BigDecimal totalPaymentIn;
    private BigDecimal totalRefundOut;
    private BigDecimal netCashFlow;
    private BigDecimal pendingRefundAmount;
    private Long pendingRefundCount;
}
