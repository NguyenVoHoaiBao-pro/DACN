package com.electro.order.controller;

import com.electro.order.dto.RefundDto;
import com.electro.order.service.RefundReceiptStorageService;
import com.electro.order.service.RefundService;
import com.electro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/admin/refunds")
@RequiredArgsConstructor
public class AdminRefundController {

    private static final String VIEW = "hasAnyAuthority('REFUND_VIEW','REFUND_BANK_INFO','REFUND_APPROVE','USER_MANAGE','ROLE_ADMIN','ADMIN')";
    private static final String BANK_INFO = "hasAnyAuthority('REFUND_BANK_INFO','REFUND_APPROVE','USER_MANAGE','ROLE_ADMIN','ADMIN')";
    private static final String APPROVE = "hasAnyAuthority('REFUND_APPROVE','USER_MANAGE','ROLE_ADMIN','ADMIN')";

    private final RefundService refundService;
    private final RefundReceiptStorageService receiptStorage;

    @GetMapping
    @PreAuthorize(VIEW)
    public ResponseEntity<ApiResponse<List<RefundDto.Summary>>> list(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "paymentMethod", required = false) String paymentMethod) {
        return ResponseEntity.ok(ApiResponse.success("Danh sách yêu cầu hoàn tiền",
                refundService.list(status, paymentMethod)));
    }

    @GetMapping("/{id}/audit-logs")
    @PreAuthorize(VIEW)
    public ResponseEntity<ApiResponse<List<RefundDto.AuditLogEntry>>> auditLogs(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Nhật ký kiểm toán",
                refundService.listAuditLogs(id)));
    }

    @GetMapping("/{id}/gateway-balance")
    @PreAuthorize(APPROVE)
    public ResponseEntity<ApiResponse<RefundDto.GatewayBalanceResponse>> gatewayBalance(
            @PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Kiểm tra số dư cổng",
                refundService.checkGatewayBalance(id)));
    }

    @PostMapping("/napas-lookup")
    @PreAuthorize(BANK_INFO)
    public ResponseEntity<ApiResponse<RefundDto.NapasLookupResponse>> napasLookup(
            @RequestBody RefundDto.NapasLookupRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tra cứu Napas",
                refundService.napasLookup(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize(VIEW)
    public ResponseEntity<ApiResponse<RefundDto.Detail>> detail(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Chi tiết hoàn tiền",
                refundService.getDetail(id)));
    }

    @GetMapping("/{id}/voucher")
    @PreAuthorize(VIEW)
    public ResponseEntity<ApiResponse<RefundDto.Voucher>> voucher(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Phiếu chi",
                refundService.getVoucher(id)));
    }

    /** Sales: lưu STK khách (COD) — chưa chi tiền */
    @PutMapping("/{id}/bank-info")
    @PreAuthorize(BANK_INFO)
    public ResponseEntity<ApiResponse<RefundDto.Detail>> updateBankInfo(
            @PathVariable Integer id,
            @Valid @RequestBody RefundDto.UpdateBankInfoRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã lưu thông tin ngân hàng",
                refundService.updateBankInfo(id, request)));
    }

    /** Admin: VNPay / MoMo / ZaloPay — hoàn qua cổng */
    @PutMapping("/{id}/approve")
    @PreAuthorize(APPROVE)
    public ResponseEntity<ApiResponse<RefundDto.Detail>> approve(
            @PathVariable Integer id,
            @RequestBody(required = false) RefundDto.ApproveRequest request) {
        RefundDto.ApproveRequest req = request != null ? request : new RefundDto.ApproveRequest();
        return ResponseEntity.ok(ApiResponse.success("Đã hoàn tiền qua cổng",
                refundService.approve(id, req)));
    }

    /** Admin: COD — chuyển khoản thủ công + biên lai + sinh phiếu chi */
    @PostMapping(value = "/{id}/confirm-cod", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(APPROVE)
    public ResponseEntity<ApiResponse<RefundDto.Detail>> confirmCod(
            @PathVariable Integer id,
            @RequestParam String customerBankName,
            @RequestParam String customerBankAccount,
            @RequestParam String customerBankAccountName,
            @RequestParam(required = false) String transferReference,
            @RequestParam(required = false) String notes,
            @RequestParam("receipt") MultipartFile receipt) throws Exception {
        String receiptUrl = receiptStorage.store(id, receipt);
        RefundDto.ConfirmCodRequest req = new RefundDto.ConfirmCodRequest(
                customerBankName, customerBankAccount, customerBankAccountName,
                transferReference, notes);
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận chuyển khoản & sinh phiếu chi",
                refundService.confirmCodRefund(id, req, receiptUrl)));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize(APPROVE)
    public ResponseEntity<ApiResponse<RefundDto.Detail>> reject(
            @PathVariable Integer id,
            @Valid @RequestBody RefundDto.RejectRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối hoàn tiền",
                refundService.reject(id, request)));
    }

    @PutMapping("/{id}/confirm-transfer")
    @PreAuthorize(APPROVE)
    public ResponseEntity<ApiResponse<RefundDto.Detail>> confirmTransfer(
            @PathVariable Integer id,
            @RequestBody(required = false) RefundDto.ConfirmManualTransferRequest request) {
        RefundDto.ConfirmManualTransferRequest req = request != null
                ? request : new RefundDto.ConfirmManualTransferRequest();
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận chuyển khoản",
                refundService.confirmManualTransfer(id, req)));
    }

    @PutMapping("/{id}/retry")
    @PreAuthorize(APPROVE)
    public ResponseEntity<ApiResponse<RefundDto.Detail>> retry(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Thử lại hoàn tiền cổng",
                refundService.retryGateway(id)));
    }

    @GetMapping("/receipts/{filename}")
    @PreAuthorize(VIEW)
    public ResponseEntity<Resource> serveReceipt(@PathVariable String filename) throws Exception {
        Path file = receiptStorage.resolve(filename);
        Resource resource = new UrlResource(file.toUri());
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.IMAGE_JPEG)
                .body(resource);
    }
}
