package com.electro.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionKpisDTO {
    private Long pendingOrders;
    private Long pendingImeiOrders;
    private Long pendingRefundCount;
    private Long pendingReturnReviews;
    private Long openWarrantyClaims;
    private Long returnsInTransit;
    private Long criticalLowStock;
}
