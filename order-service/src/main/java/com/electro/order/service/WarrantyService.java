package com.electro.order.service;

import com.electro.order.client.CatalogClient;
import com.electro.order.client.UserClient;
import com.electro.order.dto.CatalogClientDto;
import com.electro.order.dto.WarrantyDto;
import com.electro.order.entity.WarrantyTicket;
import com.electro.order.exception.BadRequestException;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.repository.WarrantyTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Transactional
public class WarrantyService {

    private final CatalogClient catalogClient;
    private final WarrantyTicketRepository warrantyTicketRepository;
    private final UserClient userClient;

    public WarrantyDto.Response checkWarranty(String imeiOrSerial) {
        try {
            CatalogClientDto.ProductItemResponse item = catalogClient.findItemByCode(imeiOrSerial.trim());
            CatalogClientDto.VariantResponse variant = catalogClient.getVariantById(item.getVariantId());

            LocalDate endDate = null;
            boolean isValid = false;
            String message = "Thiết bị chính hãng.";

            if (item.getWarrantyStartDate() != null) {
                int months = item.getWarrantyMonths() != null ? item.getWarrantyMonths() : 12;
                endDate = item.getWarrantyStartDate().plusMonths(months);
                if (LocalDate.now().isAfter(endDate)) {
                    isValid = false;
                    message = "Thiết bị đã hết hạn bảo hành.";
                } else {
                    isValid = true;
                    message = "Thiết bị còn trong thời hạn bảo hành.";
                }
            } else if ("AVAILABLE".equalsIgnoreCase(item.getStatus())) {
                isValid = true;
                message = "Thiết bị chính hãng chưa kích hoạt bảo hành.";
            } else {
                message = "Không thể xác định thời hạn bảo hành. Máy ở trạng thái: " + item.getStatus();
            }

            return WarrantyDto.Response.builder()
                    .productName(variant != null && variant.getProduct() != null ? variant.getProduct().getName() : "")
                    .variantName(variant != null ? variant.getVariantName() : "")
                    .imageUrl(variant != null ? variant.getImageUrl() : null)
                    .imei(item.getImei())
                    .serialNumber(item.getSerialNumber())
                    .status(item.getStatus())
                    .warrantyStartDate(item.getWarrantyStartDate())
                    .warrantyEndDate(endDate)
                    .warrantyMonths(item.getWarrantyMonths())
                    .isValid(isValid)
                    .message(message)
                    .build();
        } catch (feign.FeignException.NotFound e) {
            return WarrantyDto.Response.builder()
                    .isValid(false)
                    .message("Không tìm thấy thông tin. Vui lòng kiểm tra lại thiết bị.")
                    .build();
        }
    }

    public WarrantyDto.Response updateWarrantyStatus(String imeiOrSerial, String status) {
        CatalogClientDto.ProductItemResponse item = catalogClient.findItemByCode(imeiOrSerial.trim());
        catalogClient.updateItemStatus(item.getId(), status);
        return checkWarranty(imeiOrSerial);
    }

    public WarrantyDto.TicketResponse createWarrantyTicket(String username, WarrantyDto.TicketRequest request) {
        com.electro.order.dto.UserDto.Response user = userClient.getUserByUsername(username);
        if (user == null) {
            throw new ResourceNotFoundException("User", "username", username);
        }

        CatalogClientDto.ProductItemResponse item = catalogClient.findItemByCode(request.getImeiOrSerial().trim());
        catalogClient.updateItemStatus(item.getId(), "IN_REPAIR");

        WarrantyTicket ticket = new WarrantyTicket();
        ticket.setProductItemId(item.getId());
        ticket.setCustomerName(request.getCustomerName());
        ticket.setCustomerPhone(request.getCustomerPhone());
        ticket.setIssueDescription(request.getIssueDescription());
        ticket.setCreatedByUserId(user.getId());
        ticket.setStatus(WarrantyTicket.TicketStatus.PENDING);
        ticket.setTicketCode(generateTicketCode());

        return mapToTicketResponse(warrantyTicketRepository.save(ticket), item);
    }

    public WarrantyDto.TicketResponse getTicketById(Integer id) {
        WarrantyTicket ticket = warrantyTicketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WarrantyTicket", "id", id));
        CatalogClientDto.ProductItemResponse item = catalogClient.findItemById(ticket.getProductItemId());
        return mapToTicketResponse(ticket, item);
    }

    public Page<WarrantyDto.TicketResponse> getAllTickets(String keyword, String status, Pageable pageable) {
        WarrantyTicket.TicketStatus ticketStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                ticketStatus = WarrantyTicket.TicketStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }
        return warrantyTicketRepository.searchTickets(keyword, ticketStatus, pageable)
                .map(t -> {
                    CatalogClientDto.ProductItemResponse item = null;
                    try {
                        item = catalogClient.findItemById(t.getProductItemId());
                    } catch (Exception ignored) {
                    }
                    return mapToTicketResponse(t, item);
                });
    }

    public WarrantyDto.TicketResponse updateTicketStatus(Integer id, WarrantyDto.TicketUpdateAdminRequest request) {
        WarrantyTicket ticket = warrantyTicketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WarrantyTicket", "id", id));

        WarrantyTicket.TicketStatus newStatus;
        try {
            newStatus = WarrantyTicket.TicketStatus.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái phiếu bảo hành không hợp lệ: " + request.getStatus());
        }

        ticket.setStatus(newStatus);
        if (request.getTechnicianNote() != null) {
            ticket.setTechnicianNote(request.getTechnicianNote());
        }
        if (request.getRepairCost() != null) {
            ticket.setRepairCost(request.getRepairCost());
        }

        if (newStatus == WarrantyTicket.TicketStatus.COMPLETED && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(java.time.LocalDateTime.now());
        }
        if (newStatus == WarrantyTicket.TicketStatus.RETURNED && ticket.getReturnedAt() == null) {
            ticket.setReturnedAt(java.time.LocalDateTime.now());
            catalogClient.updateItemStatus(ticket.getProductItemId(), "SOLD");
        }
        if (newStatus == WarrantyTicket.TicketStatus.CANCELLED) {
            catalogClient.updateItemStatus(ticket.getProductItemId(), "SOLD");
        }

        return mapToTicketResponse(warrantyTicketRepository.save(ticket), null);
    }

    private String generateTicketCode() {
        String prefix = "WR-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        String maxCode = warrantyTicketRepository.findMaxTicketCodeWithPrefix(prefix);
        int seq = 1;
        if (maxCode != null && maxCode.length() > prefix.length()) {
            try {
                seq = Integer.parseInt(maxCode.substring(prefix.length())) + 1;
            } catch (NumberFormatException ignored) {
            }
        }
        return prefix + String.format("%03d", seq);
    }

    private WarrantyDto.TicketResponse mapToTicketResponse(WarrantyTicket ticket, CatalogClientDto.ProductItemResponse item) {
        String statusDisplay = switch (ticket.getStatus()) {
            case PENDING -> "Chờ kiểm tra";
            case IN_PROGRESS -> "Đang sửa chữa";
            case COMPLETED -> "Đã sửa xong";
            case CANCELLED -> "Đã hủy";
            case RETURNED -> "Đã biên nhận trả khách";
        };
        return WarrantyDto.TicketResponse.builder()
                .id(ticket.getId())
                .ticketCode(ticket.getTicketCode())
                .imei(item != null ? item.getImei() : null)
                .serialNumber(item != null ? item.getSerialNumber() : null)
                .customerName(ticket.getCustomerName())
                .customerPhone(ticket.getCustomerPhone())
                .issueDescription(ticket.getIssueDescription())
                .technicianNote(ticket.getTechnicianNote())
                .status(ticket.getStatus().name())
                .statusDisplay(statusDisplay)
                .repairCost(ticket.getRepairCost())
                .receivedAt(ticket.getReceivedAt())
                .resolvedAt(ticket.getResolvedAt())
                .returnedAt(ticket.getReturnedAt())
                .build();
    }
}
