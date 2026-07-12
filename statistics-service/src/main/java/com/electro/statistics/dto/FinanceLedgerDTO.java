package com.electro.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceLedgerDTO {
    private List<LedgerEntry> entries;
    private Integer total;
    private Integer page;
    private Integer limit;
    private Integer totalPages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LedgerEntry {
        private String id;
        private String type;
        private String direction;
        private String referenceCode;
        private String title;
        private BigDecimal amount;
        private String method;
        private String status;
        private String occurredAt;
        private String orderCode;
    }
}
