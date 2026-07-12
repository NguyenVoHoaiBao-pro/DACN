package com.electro.catalog.service;

import com.electro.catalog.dto.InventoryAuditDto;
import com.electro.catalog.entity.InventoryAudit;
import com.electro.catalog.entity.InventoryAuditLine;
import com.electro.catalog.entity.InventoryAuditVariant;
import com.electro.catalog.entity.ProductItem;
import com.electro.catalog.entity.ProductItemStatus;
import com.electro.catalog.entity.ProductType;
import com.electro.catalog.entity.ProductVariant;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.InventoryAuditRepository;
import com.electro.catalog.repository.ProductItemRepository;
import com.electro.catalog.repository.ProductTypeRepository;
import com.electro.catalog.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryAuditService {

    private static final List<InventoryAudit.AuditStatus> LOCK_STATUSES = List.of(
            InventoryAudit.AuditStatus.IN_PROGRESS,
            InventoryAudit.AuditStatus.COMPLETED,
            InventoryAudit.AuditStatus.PENDING_APPROVAL
    );

    private final InventoryAuditRepository auditRepository;
    private final ProductItemRepository productItemRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductTypeRepository productTypeRepository;

    @Transactional(readOnly = true)
    public List<InventoryAuditDto.Summary> listAll() {
        return auditRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InventoryAuditDto.Detail getDetail(Integer id) {
        InventoryAudit audit = loadAudit(id);
        return toDetail(audit);
    }

    @Transactional
    public InventoryAuditDto.Summary create(InventoryAuditDto.CreateRequest request) {
        if (request.getProductTypeId() == null) {
            throw new BadRequestException("Vui lòng chọn danh mục kiểm kê.");
        }
        ProductType productType = productTypeRepository.findById(request.getProductTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductType", "id", request.getProductTypeId()));

        List<ProductVariant> variants = productVariantRepository
                .findActiveByCategoryWithProduct(request.getProductTypeId());
        if (variants.isEmpty()) {
            throw new BadRequestException("Danh mục không có sản phẩm active để kiểm kê.");
        }

        String code = "AUD-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        InventoryAudit audit = InventoryAudit.builder()
                .auditCode(code)
                .status(InventoryAudit.AuditStatus.IN_PROGRESS)
                .productTypeId(productType.getId())
                .productTypeName(productType.getName())
                .stockLocked(true)
                .notes(request.getNotes())
                .createdByUserId(request.getCreatedByUserId())
                .startedAt(LocalDateTime.now())
                .build();

        Map<Integer, Integer> availableCounts = loadAvailableCounts(variants);
        for (ProductVariant variant : variants) {
            int systemQty = resolveSystemQty(variant, availableCounts);
            if (systemQty <= 0) {
                continue;
            }
            InventoryAuditVariant row = InventoryAuditVariant.builder()
                    .audit(audit)
                    .variantId(variant.getId())
                    .productName(variant.getProduct() != null ? variant.getProduct().getName() : null)
                    .skuCode(variant.getSkuCode())
                    .variantName(variant.getVariantName())
                    .systemQty(systemQty)
                    .actualQty(0)
                    .variance(0)
                    .build();
            audit.getVariants().add(row);
        }

        if (audit.getVariants().isEmpty()) {
            throw new BadRequestException("Danh mục không có tồn kho để kiểm kê.");
        }

        return toSummary(auditRepository.save(audit));
    }

    @Transactional
    public InventoryAuditDto.ScanResponse scan(Integer auditId, InventoryAuditDto.ScanRequest request) {
        InventoryAudit audit = loadAudit(auditId);
        assertEditable(audit);

        String serial = normalizeScanInput(request.getSerialNumber());
        if (serial.isEmpty()) {
            throw new BadRequestException("Mã Serial không hợp lệ.");
        }
        if (serial.length() > 100) {
            throw new BadRequestException(
                    "Mã Serial quá dài. Chỉ quét từng mã một (tối đa 100 ký tự), không dán cả cột Excel.");
        }
        boolean duplicate = audit.getLines().stream()
                .anyMatch(l -> serial.equalsIgnoreCase(l.getSerialNumber())
                        && l.getScanResult() != InventoryAuditLine.ScanResult.MISSING);
        if (duplicate) {
            throw new BadRequestException("Serial đã được quét trong phiếu này.");
        }

        ProductItem item = productItemRepository.findBySerialNumber(serial)
                .or(() -> productItemRepository.findByImeiOrSerialNumber(serial, serial))
                .orElse(null);

        Map<Integer, InventoryAuditVariant> scope = scopeMap(audit);
        InventoryAuditLine.ScanResult result = registerScanLine(audit, scope, serial, item);
        Integer variantId = item != null && item.getVariant() != null ? item.getVariant().getId() : null;
        InventoryAuditVariant snapshot = variantId != null ? scope.get(variantId) : null;

        String message = switch (result) {
            case MATCH -> "Khớp — tăng số lượng thực tế.";
            case EXTRA -> item != null && snapshot != null
                    ? "Cảnh báo — máy thuộc danh mục nhưng trạng thái: " + item.getStatus().name()
                    : item != null ? "Thừa — Serial không thuộc danh mục kiểm kê."
                    : "Thừa — không tìm thấy Serial trong hệ thống.";
            default -> "Đã ghi nhận.";
        };

        refreshTotalScanned(audit);
        auditRepository.save(audit);

        return InventoryAuditDto.ScanResponse.builder()
                .serialNumber(serial)
                .scanResult(result.name())
                .message(message)
                .totalScanned(audit.getTotalScanned())
                .actualQty(snapshot != null ? snapshot.getActualQty() : null)
                .productName(snapshot != null ? snapshot.getProductName() : null)
                .build();
    }

    @Transactional
    public InventoryAuditDto.BulkScanResponse scanBulk(
            Integer auditId, InventoryAuditDto.BulkScanRequest request) {
        InventoryAudit audit = loadAudit(auditId);
        assertEditable(audit);

        List<String> rawList = request.getSerialNumbers();
        if (rawList == null || rawList.isEmpty()) {
            throw new BadRequestException("Danh sách Serial trống.");
        }
        if (rawList.size() > 2000) {
            throw new BadRequestException("Tối đa 2000 mã mỗi lần. Hãy chia danh sách thành nhiều đợt.");
        }

        Set<String> alreadyScanned = audit.getLines().stream()
                .filter(l -> l.getScanResult() != InventoryAuditLine.ScanResult.MISSING)
                .map(l -> l.getSerialNumber().toLowerCase())
                .collect(Collectors.toCollection(HashSet::new));

        List<String> batch = new ArrayList<>();
        Set<String> batchKeys = new HashSet<>();
        int duplicate = 0;
        int invalid = 0;
        for (String raw : rawList) {
            String serial = normalizeScanInput(raw);
            if (serial.isEmpty() || serial.length() > 100) {
                invalid++;
                continue;
            }
            String key = serial.toLowerCase();
            if (alreadyScanned.contains(key) || batchKeys.contains(key)) {
                duplicate++;
                continue;
            }
            batchKeys.add(key);
            batch.add(serial);
        }

        Map<Integer, InventoryAuditVariant> scope = scopeMap(audit);
        Map<String, ProductItem> itemMap = new HashMap<>();
        if (!batch.isEmpty()) {
            for (ProductItem pi : productItemRepository.findBySerialOrImeiIn(batch)) {
                if (pi.getSerialNumber() != null) {
                    itemMap.put(pi.getSerialNumber().toLowerCase(), pi);
                }
                if (pi.getImei() != null) {
                    itemMap.put(pi.getImei().toLowerCase(), pi);
                }
            }
        }

        int matched = 0;
        int extra = 0;
        for (String serial : batch) {
            ProductItem item = itemMap.get(serial.toLowerCase());
            InventoryAuditLine.ScanResult result = registerScanLine(audit, scope, serial, item);
            if (result == InventoryAuditLine.ScanResult.MATCH) {
                matched++;
            } else {
                extra++;
            }
        }

        refreshTotalScanned(audit);
        auditRepository.save(audit);

        List<InventoryAuditDto.VariantSummary> variants = audit.getVariants().stream()
                .map(v -> toVariantSummary(v, List.of()))
                .collect(Collectors.toList());

        return InventoryAuditDto.BulkScanResponse.builder()
                .processed(batch.size())
                .matched(matched)
                .extra(extra)
                .duplicate(duplicate)
                .invalid(invalid)
                .totalScanned(audit.getTotalScanned())
                .variants(variants)
                .build();
    }

    @Transactional(readOnly = true)
    public InventoryAuditDto.CountingProgress getCountingProgress(Integer id) {
        InventoryAudit audit = auditRepository.findByIdWithVariants(id)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryAudit", "id", id));
        List<InventoryAuditDto.VariantSummary> variants = audit.getVariants().stream()
                .map(v -> toVariantSummary(v, List.of()))
                .collect(Collectors.toList());
        return InventoryAuditDto.CountingProgress.builder()
                .id(audit.getId())
                .auditCode(audit.getAuditCode())
                .status(audit.getStatus().name())
                .totalScanned(audit.getTotalScanned())
                .variants(variants)
                .build();
    }

    @Transactional
    public InventoryAuditDto.CompleteResponse complete(Integer auditId) {
        InventoryAudit audit = loadAudit(auditId);
        if (audit.getStatus() != InventoryAudit.AuditStatus.IN_PROGRESS) {
            throw new BadRequestException("Phiếu không ở trạng thái đang kiểm đếm.");
        }

        Set<String> scannedSerials = audit.getLines().stream()
                .filter(l -> l.getScanResult() != InventoryAuditLine.ScanResult.MISSING)
                .map(l -> l.getSerialNumber().toLowerCase())
                .collect(Collectors.toCollection(HashSet::new));

        int matched = 0;
        int extra = 0;
        List<InventoryAuditDto.LineDetail> discrepancies = new ArrayList<>();

        for (InventoryAuditLine line : audit.getLines()) {
            if (line.getScanResult() == InventoryAuditLine.ScanResult.MISSING) {
                continue;
            }
            if (line.getScanResult() == InventoryAuditLine.ScanResult.MATCH) {
                matched++;
            } else {
                extra++;
                discrepancies.add(toLineDetail(line, null));
            }
        }

        int missing = 0;
        Map<Integer, InventoryAuditVariant> scope = scopeMap(audit);
        for (InventoryAuditVariant snapshot : scope.values()) {
            List<ProductItem> available = productItemRepository
                    .findAvailableByVariantIdFifo(snapshot.getVariantId(), ProductItemStatus.AVAILABLE);
            for (ProductItem pi : available) {
                if (pi.getSerialNumber() == null) {
                    continue;
                }
                if (!scannedSerials.contains(pi.getSerialNumber().toLowerCase())) {
                    missing++;
                    InventoryAuditLine missingLine = InventoryAuditLine.builder()
                            .audit(audit)
                            .serialNumber(pi.getSerialNumber())
                            .scanResult(InventoryAuditLine.ScanResult.MISSING)
                            .systemStatus(pi.getStatus().name())
                            .productItemId(pi.getId())
                            .variantId(pi.getVariant() != null ? pi.getVariant().getId() : snapshot.getVariantId())
                            .build();
                    audit.getLines().add(missingLine);
                    discrepancies.add(toLineDetail(missingLine, pi.getVariant()));
                }
            }
            snapshot.setVariance(snapshot.getActualQty() - snapshot.getSystemQty());
        }

        audit.setTotalMatched(matched);
        audit.setTotalExtra(extra);
        audit.setTotalMissing(missing);
        audit.setStatus(InventoryAudit.AuditStatus.COMPLETED);
        audit.setCompletedAt(LocalDateTime.now());
        auditRepository.save(audit);

        return InventoryAuditDto.CompleteResponse.builder()
                .id(audit.getId())
                .auditCode(audit.getAuditCode())
                .totalMatched(matched)
                .totalMissing(missing)
                .totalExtra(extra)
                .variants(buildVariantSummaries(audit))
                .discrepancies(discrepancies)
                .build();
    }

    @Transactional
    public InventoryAuditDto.Detail submit(Integer auditId, InventoryAuditDto.SubmitRequest request) {
        InventoryAudit audit = loadAudit(auditId);
        if (audit.getStatus() != InventoryAudit.AuditStatus.COMPLETED) {
            throw new BadRequestException("Hoàn tất kiểm đếm trước khi gửi báo cáo.");
        }
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            audit.setNotes(request.getNotes().trim());
        }
        audit.setStatus(InventoryAudit.AuditStatus.PENDING_APPROVAL);
        audit.setSubmittedAt(LocalDateTime.now());
        return toDetail(auditRepository.save(audit));
    }

    @Transactional
    public InventoryAuditDto.Detail approve(Integer auditId, Integer adminUserId) {
        InventoryAudit audit = loadAudit(auditId);
        if (audit.getStatus() != InventoryAudit.AuditStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Phiếu không chờ phê duyệt.");
        }

        Set<String> scannedSerials = audit.getLines().stream()
                .filter(l -> l.getScanResult() == InventoryAuditLine.ScanResult.MATCH)
                .map(l -> l.getSerialNumber().toLowerCase())
                .collect(Collectors.toCollection(HashSet::new));

        for (InventoryAuditVariant snapshot : audit.getVariants()) {
            ProductVariant variant = productVariantRepository.findById(snapshot.getVariantId())
                    .orElse(null);
            if (variant == null) {
                continue;
            }
            variant.setStockQuantity(Math.max(snapshot.getActualQty(), 0));
            productVariantRepository.save(variant);

            List<ProductItem> available = productItemRepository
                    .findAvailableByVariantIdFifo(snapshot.getVariantId(), ProductItemStatus.AVAILABLE);
            for (ProductItem pi : available) {
                if (pi.getSerialNumber() != null
                        && !scannedSerials.contains(pi.getSerialNumber().toLowerCase())) {
                    pi.setStatus(ProductItemStatus.DEFECTIVE);
                    productItemRepository.save(pi);
                }
            }
        }

        audit.setStatus(InventoryAudit.AuditStatus.APPROVED);
        audit.setStockLocked(false);
        audit.setApprovedByUserId(adminUserId);
        audit.setApprovedAt(LocalDateTime.now());
        return toDetail(auditRepository.save(audit));
    }

    @Transactional
    public InventoryAuditDto.Detail reject(Integer auditId, InventoryAuditDto.RejectRequest request) {
        InventoryAudit audit = loadAudit(auditId);
        if (audit.getStatus() != InventoryAudit.AuditStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Phiếu không chờ phê duyệt.");
        }
        audit.setStatus(InventoryAudit.AuditStatus.REJECTED);
        audit.setStockLocked(false);
        if (request != null && request.getAdminNote() != null) {
            audit.setAdminNote(request.getAdminNote().trim());
        }
        return toDetail(auditRepository.save(audit));
    }

    @Transactional(readOnly = true)
    public boolean isVariantLockedForSale(Integer variantId) {
        return auditRepository.findActiveLocked(LOCK_STATUSES).stream()
                .anyMatch(a -> a.getVariants().stream()
                        .anyMatch(v -> variantId.equals(v.getVariantId())));
    }

    /**
     * Lấy một mã serial từ input quét — hỗ trợ dán 1 dòng Excel (tab) hoặc 1 mã.
     * Không chấp nhận nhiều dòng trong một lần gọi scan (frontend quét lần lượt).
     */
    private InventoryAuditLine.ScanResult registerScanLine(
            InventoryAudit audit,
            Map<Integer, InventoryAuditVariant> scope,
            String serial,
            ProductItem item) {
        Integer variantId = item != null && item.getVariant() != null ? item.getVariant().getId() : null;
        InventoryAuditVariant snapshot = variantId != null ? scope.get(variantId) : null;

        InventoryAuditLine.ScanResult result;
        if (item != null && snapshot != null && item.getStatus() == ProductItemStatus.AVAILABLE) {
            result = InventoryAuditLine.ScanResult.MATCH;
            snapshot.setActualQty(snapshot.getActualQty() + 1);
            snapshot.setVariance(snapshot.getActualQty() - snapshot.getSystemQty());
        } else {
            result = InventoryAuditLine.ScanResult.EXTRA;
        }

        InventoryAuditLine line = InventoryAuditLine.builder()
                .audit(audit)
                .serialNumber(serial)
                .scanResult(result)
                .systemStatus(item != null ? item.getStatus().name() : null)
                .productItemId(item != null ? item.getId() : null)
                .variantId(variantId)
                .build();
        audit.getLines().add(line);
        return result;
    }

    private void refreshTotalScanned(InventoryAudit audit) {
        audit.setTotalScanned((int) audit.getLines().stream()
                .filter(l -> l.getScanResult() != InventoryAuditLine.ScanResult.MISSING)
                .count());
    }

    private String normalizeScanInput(String raw) {
        if (raw == null) {
            return "";
        }
        String firstLine = raw.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .findFirst()
                .orElse("");
        if (firstLine.contains("\t")) {
            String[] cols = firstLine.split("\t");
            for (String col : cols) {
                String token = col.trim();
                if (token.matches("^(ES\\d{10,}|\\d{12,20}|IMEI[A-Z0-9_]+)$")) {
                    return token;
                }
            }
            for (int i = cols.length - 1; i >= 0; i--) {
                String token = cols[i].trim();
                if (!token.isEmpty() && token.length() <= 100) {
                    return token;
                }
            }
        }
        return firstLine.trim();
    }

    private InventoryAudit loadAudit(Integer id) {
        InventoryAudit audit = auditRepository.findByIdWithLines(id)
                .orElseThrow(() -> new ResourceNotFoundException("InventoryAudit", "id", id));
        audit.getVariants().size();
        return audit;
    }

    private void assertEditable(InventoryAudit audit) {
        if (audit.getStatus() != InventoryAudit.AuditStatus.IN_PROGRESS) {
            throw new BadRequestException("Phiếu kiểm kê không còn ở trạng thái quét.");
        }
    }

    private Map<Integer, InventoryAuditVariant> scopeMap(InventoryAudit audit) {
        Map<Integer, InventoryAuditVariant> map = new HashMap<>();
        for (InventoryAuditVariant row : audit.getVariants()) {
            map.put(row.getVariantId(), row);
        }
        return map;
    }

    private Map<Integer, Integer> loadAvailableCounts(List<ProductVariant> variants) {
        List<Integer> ids = variants.stream().map(ProductVariant::getId).collect(Collectors.toList());
        Map<Integer, Integer> counts = new HashMap<>();
        if (ids.isEmpty()) {
            return counts;
        }
        productItemRepository.countAvailableByVariantIds(ids, ProductItemStatus.AVAILABLE)
                .forEach(row -> counts.put((Integer) row[0], ((Long) row[1]).intValue()));
        return counts;
    }

    private int resolveSystemQty(ProductVariant variant, Map<Integer, Integer> availableCounts) {
        int serialCount = availableCounts.getOrDefault(variant.getId(), 0);
        if (Boolean.TRUE.equals(variant.getRequiresSerial())) {
            return serialCount;
        }
        int stock = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
        return Math.max(stock, serialCount);
    }

    private List<InventoryAuditDto.VariantSummary> buildVariantSummaries(InventoryAudit audit) {
        Map<Integer, List<String>> missingByVariant = audit.getLines().stream()
                .filter(l -> l.getScanResult() == InventoryAuditLine.ScanResult.MISSING)
                .collect(Collectors.groupingBy(
                        InventoryAuditLine::getVariantId,
                        Collectors.mapping(InventoryAuditLine::getSerialNumber, Collectors.toList())));

        return audit.getVariants().stream()
                .map(v -> toVariantSummary(v, missingByVariant.getOrDefault(v.getVariantId(), List.of())))
                .collect(Collectors.toList());
    }

    private InventoryAuditDto.VariantSummary toVariantSummary(
            InventoryAuditVariant row, List<String> missingSerials) {
        String matchStatus;
        if (row.getVariance() == 0) {
            matchStatus = "MATCH";
        } else if (row.getVariance() < 0) {
            matchStatus = "SHORTAGE";
        } else {
            matchStatus = "SURPLUS";
        }
        return InventoryAuditDto.VariantSummary.builder()
                .id(row.getId())
                .variantId(row.getVariantId())
                .productName(row.getProductName())
                .skuCode(row.getSkuCode())
                .variantName(row.getVariantName())
                .systemQty(row.getSystemQty())
                .actualQty(row.getActualQty())
                .variance(row.getVariance())
                .matchStatus(matchStatus)
                .missingSerials(missingSerials)
                .build();
    }

    private InventoryAuditDto.Summary toSummary(InventoryAudit a) {
        return InventoryAuditDto.Summary.builder()
                .id(a.getId())
                .auditCode(a.getAuditCode())
                .status(a.getStatus().name())
                .statusLabel(statusLabel(a.getStatus()))
                .productTypeId(a.getProductTypeId())
                .productTypeName(a.getProductTypeName())
                .stockLocked(a.getStockLocked())
                .startedAt(a.getStartedAt())
                .completedAt(a.getCompletedAt())
                .submittedAt(a.getSubmittedAt())
                .totalScanned(a.getTotalScanned())
                .totalMatched(a.getTotalMatched())
                .totalMissing(a.getTotalMissing())
                .totalExtra(a.getTotalExtra())
                .build();
    }

    private InventoryAuditDto.Detail toDetail(InventoryAudit a) {
        Map<Integer, ProductVariant> variants = loadVariants(a.getLines());
        List<InventoryAuditDto.LineDetail> lines = a.getLines().stream()
                .map(l -> toLineDetail(l, variants.get(l.getVariantId())))
                .collect(Collectors.toList());
        List<InventoryAuditDto.LineDetail> discrepancies = lines.stream()
                .filter(l -> !"MATCH".equals(l.getScanResult()))
                .collect(Collectors.toList());
        Map<Integer, List<String>> missingByVariant = a.getLines().stream()
                .filter(l -> l.getScanResult() == InventoryAuditLine.ScanResult.MISSING)
                .collect(Collectors.groupingBy(
                        InventoryAuditLine::getVariantId,
                        Collectors.mapping(InventoryAuditLine::getSerialNumber, Collectors.toList())));

        List<InventoryAuditDto.VariantSummary> variantSummaries = a.getVariants().stream()
                .map(v -> toVariantSummary(v, missingByVariant.getOrDefault(v.getVariantId(), List.of())))
                .collect(Collectors.toList());

        return InventoryAuditDto.Detail.builder()
                .id(a.getId())
                .auditCode(a.getAuditCode())
                .status(a.getStatus().name())
                .statusLabel(statusLabel(a.getStatus()))
                .productTypeId(a.getProductTypeId())
                .productTypeName(a.getProductTypeName())
                .stockLocked(a.getStockLocked())
                .notes(a.getNotes())
                .adminNote(a.getAdminNote())
                .startedAt(a.getStartedAt())
                .completedAt(a.getCompletedAt())
                .submittedAt(a.getSubmittedAt())
                .approvedAt(a.getApprovedAt())
                .totalScanned(a.getTotalScanned())
                .totalMatched(a.getTotalMatched())
                .totalMissing(a.getTotalMissing())
                .totalExtra(a.getTotalExtra())
                .variants(variantSummaries)
                .lines(lines)
                .discrepancies(discrepancies)
                .build();
    }

    private InventoryAuditDto.LineDetail toLineDetail(InventoryAuditLine line, ProductVariant variant) {
        return InventoryAuditDto.LineDetail.builder()
                .id(line.getId())
                .serialNumber(line.getSerialNumber())
                .scanResult(line.getScanResult().name())
                .systemStatus(line.getSystemStatus())
                .variantId(line.getVariantId())
                .skuCode(variant != null ? variant.getSkuCode() : null)
                .productName(variant != null && variant.getProduct() != null ? variant.getProduct().getName() : null)
                .scannedAt(line.getScannedAt())
                .build();
    }

    private Map<Integer, ProductVariant> loadVariants(List<InventoryAuditLine> lines) {
        List<Integer> ids = lines.stream()
                .map(InventoryAuditLine::getVariantId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
        Map<Integer, ProductVariant> map = new HashMap<>();
        if (!ids.isEmpty()) {
            productVariantRepository.findAllByIdWithProduct(ids).forEach(v -> map.put(v.getId(), v));
        }
        return map;
    }

    private String statusLabel(InventoryAudit.AuditStatus status) {
        return switch (status) {
            case DRAFT -> "Nháp";
            case IN_PROGRESS -> "Đang kiểm đếm";
            case COMPLETED -> "Chờ gửi báo cáo";
            case PENDING_APPROVAL -> "Chờ Admin duyệt";
            case APPROVED -> "Đã duyệt điều chỉnh";
            case REJECTED -> "Admin từ chối";
        };
    }
}
