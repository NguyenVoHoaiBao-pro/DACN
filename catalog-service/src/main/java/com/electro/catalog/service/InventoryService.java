package com.electro.catalog.service;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.entity.*;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductVariantRepository productVariantRepository;
    private final ProductItemRepository productItemRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final StockLotRepository stockLotRepository;

    private Integer requireTransactionUserId(Integer userId) {
        if (userId == null) {
            throw new BadRequestException(
                    "Thiếu thông tin người thực hiện (user_id). Vui lòng đăng nhập lại và thử lại.");
        }
        return userId;
    }

    @Transactional
    public void importStock(InventoryDto.ImportStockRequest request) {
        Integer actorUserId = requireTransactionUserId(request.getUserId());
        for (InventoryDto.ImportStockItem itemDto : request.getItems()) {
            ProductVariant variant = productVariantRepository.findById(itemDto.getVariantId())
                    .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", itemDto.getVariantId()));

            int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            variant.setStockQuantity(current + itemDto.getQuantity());
            productVariantRepository.save(variant);

            InventoryTransaction tx = new InventoryTransaction();
            tx.setTransactionType(InventoryTransaction.TransactionType.IMPORT);
            tx.setQuantity(itemDto.getQuantity());
            tx.setVariantId(variant.getId());
            tx.setReason(request.getNote() != null && !request.getNote().isBlank()
                    ? request.getNote()
                    : "Nhập hàng từ: " + (request.getSupplier() != null ? request.getSupplier() : "N/A"));
            tx.setReferenceType(request.getReferenceType());
            tx.setReferenceId(request.getReferenceId());
            tx.setUserId(actorUserId);
            inventoryTransactionRepository.save(tx);
        }
    }

    @Transactional
    public void returnStock(InventoryDto.ReturnStockRequest request) {
        returnStockForSlip(request.getImei(), Boolean.TRUE.equals(request.getIsDefective()),
                request.getReason(), null, request.getUserId());
    }

    @Transactional
    public void returnStockForSlip(String serialRaw, boolean defective, String reason, String notes,
            Integer actorUserId) {
        String serial = serialRaw != null ? serialRaw.trim() : "";
        ProductItem productItem = productItemRepository
                .findBySerialNumber(serial)
                .or(() -> productItemRepository.findByImeiOrSerialNumber(serial, serial))
                .orElseThrow(() -> new ResourceNotFoundException("ProductItem", "serialNumber", serial));

        ProductItemStatus status = productItem.getStatus();
        if (status == ProductItemStatus.AVAILABLE) {
            throw new BadRequestException("Serial đã AVAILABLE trong kho — không thể hoàn trả lại.");
        }
        if (status == ProductItemStatus.RESERVED) {
            throw new BadRequestException("Serial đang RESERVED — hủy/giải phóng đơn trước.");
        }
        if (status != ProductItemStatus.SOLD
                && status != ProductItemStatus.DEFECTIVE
                && status != ProductItemStatus.IN_REPAIR) {
            throw new BadRequestException("Trạng thái Serial không hỗ trợ hoàn kho: " + status);
        }

        if (defective) {
            productItem.setStatus(ProductItemStatus.DEFECTIVE);
        } else {
            productItem.setStatus(ProductItemStatus.AVAILABLE);
            ProductVariant variant = productItem.getVariant();
            if (variant != null) {
                int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
                variant.setStockQuantity(current + 1);
                productVariantRepository.save(variant);
            }
        }
        productItemRepository.save(productItem);

        String noteText = reason != null ? reason : "";
        if (notes != null && !notes.isBlank()) {
            noteText = noteText.isBlank() ? notes : noteText + " | " + notes;
        }

        InventoryTransaction tx = new InventoryTransaction();
        tx.setTransactionType(defective
                ? InventoryTransaction.TransactionType.ADJUSTMENT
                : InventoryTransaction.TransactionType.RETURN);
        tx.setQuantity(1);
        tx.setVariantId(productItem.getVariant() != null ? productItem.getVariant().getId() : null);
        tx.setProductItemId(productItem.getId());
        tx.setReason("Hàng hoàn trả: " + noteText);
        tx.setUserId(requireTransactionUserId(actorUserId));
        inventoryTransactionRepository.save(tx);
    }

    @Transactional
    public void addImeiToProduct(InventoryDto.ImeiRequest request) {
        ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", request.getVariantId()));

        StockLot stockLot = null;
        if (request.getStockLotId() != null) {
            stockLot = stockLotRepository.findById(request.getStockLotId())
                    .orElseThrow(() -> new ResourceNotFoundException("StockLot", "id", request.getStockLotId()));
            if (stockLot.getStatus() == StockLot.StockLotStatus.RECALL) {
                throw new BadRequestException("Mã lô đang bị đánh dấu thu hồi — không thể nhập thêm Serial.");
            }
        }

        String batchNumber = request.getBatchNumber();
        if (stockLot != null) {
            batchNumber = stockLot.getLotNumber();
        }

        List<ProductItem> itemsToSave = new ArrayList<>();
        for (String rawSerial : request.getImeis()) {
            String serial = rawSerial == null ? "" : rawSerial.trim();
            if (serial.isEmpty()) {
                continue;
            }
            if (productItemRepository.existsBySerialNumber(serial)
                    || productItemRepository.findByImeiOrSerialNumber(serial, serial).isPresent()) {
                throw new BadRequestException("Serial " + serial + " đã tồn tại trong hệ thống");
            }
            ProductItem item = new ProductItem();
            item.setSerialNumber(serial);
            item.setBatchNumber(batchNumber);
            item.setPurchaseOrderId(request.getPurchaseOrderId());
            item.setStockLotId(request.getStockLotId());
            item.setVariant(variant);
            item.setStatus(ProductItemStatus.AVAILABLE);
            itemsToSave.add(item);
        }

        productItemRepository.saveAll(itemsToSave);

        boolean linkedToPo = request.getPurchaseOrderItemId() != null;
        if (linkedToPo) {
            applyPoImeiTracking(request, itemsToSave.size());
            int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            variant.setStockQuantity(current + itemsToSave.size());
            productVariantRepository.save(variant);
            if (stockLot != null) {
                maybeCloseStockLot(stockLot);
            }
        } else {
            int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            variant.setStockQuantity(current + itemsToSave.size());
            productVariantRepository.save(variant);
        }

        InventoryTransaction tx = new InventoryTransaction();
        tx.setTransactionType(InventoryTransaction.TransactionType.IMPORT);
        tx.setQuantity(itemsToSave.size());
        tx.setVariantId(variant.getId());
        if (linkedToPo) {
            tx.setReferenceType("PURCHASE_ORDER");
            tx.setReferenceId(request.getPurchaseOrderId());
        }
        if (stockLot != null) {
            tx.setReason("Nhập Serial lô " + stockLot.getLotNumber());
        } else {
            tx.setReason(request.getNote() != null && !request.getNote().isBlank()
                    ? request.getNote()
                    : "Nhập hàng theo lô Serial: " + batchNumber);
        }
        tx.setUserId(requireTransactionUserId(request.getUserId()));
        inventoryTransactionRepository.save(tx);
    }

    private void maybeCloseStockLot(StockLot lot) {
        long scanned = productItemRepository.countByStockLotId(lot.getId());
        if (lot.getExpectedQuantity() != null && lot.getExpectedQuantity() > 0
                && scanned >= lot.getExpectedQuantity()) {
            lot.setStatus(StockLot.StockLotStatus.CLOSED);
            stockLotRepository.save(lot);
        }
    }

    private void applyPoImeiTracking(InventoryDto.ImeiRequest request, int count) {
        PurchaseOrderItem poi = purchaseOrderItemRepository.findById(request.getPurchaseOrderItemId())
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrderItem", "id", request.getPurchaseOrderItemId()));

        if (!poi.getVariantId().equals(request.getVariantId())) {
            throw new BadRequestException("Sản phẩm không khớp với dòng đơn mua hàng đã chọn.");
        }

        PurchaseOrder po = purchaseOrderRepository.findByIdWithItems(
                        request.getPurchaseOrderId() != null
                                ? request.getPurchaseOrderId()
                                : poi.getPurchaseOrder().getId())
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", request.getPurchaseOrderId()));

        if (po.getStatus() != PurchaseOrder.PurchaseOrderStatus.RECEIVED
                && po.getStatus() != PurchaseOrder.PurchaseOrderStatus.COMPLETED) {
            throw new BadRequestException("Chỉ quét Serial cho đơn PO đã nhập kho.");
        }

        int received = poi.getQuantityReceived() != null ? poi.getQuantityReceived() : 0;
        int damaged = poi.getQuantityDamaged() != null ? poi.getQuantityDamaged() : 0;
        int scanned = poi.getQuantityImeiScanned() != null ? poi.getQuantityImeiScanned() : 0;
        int imeiRequired = Math.max(0, received - damaged);
        int remaining = Math.max(0, imeiRequired - scanned);

        if (count > remaining) {
            throw new BadRequestException(
                    "Vượt quá số lượng cần quét Serial. Còn lại: " + remaining + " mã cho dòng này.");
        }

        poi.setQuantityImeiScanned(scanned + count);
        purchaseOrderItemRepository.save(poi);

        boolean allDone = po.getItems().stream().allMatch(i -> {
            int req = Math.max(0,
                    (i.getQuantityReceived() != null ? i.getQuantityReceived() : 0)
                            - (i.getQuantityDamaged() != null ? i.getQuantityDamaged() : 0));
            int done = i.getQuantityImeiScanned() != null ? i.getQuantityImeiScanned() : 0;
            return done >= req;
        });
        if (allDone) {
            po.setStatus(PurchaseOrder.PurchaseOrderStatus.COMPLETED);
            purchaseOrderRepository.save(po);
        }
    }

    public List<InventoryDto.SerialFifoItem> getFifoSerials(Integer variantId, int limit) {
        productVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", variantId));
        List<ProductItem> items = productItemRepository.findAvailableByVariantIdFifo(
                variantId, ProductItemStatus.AVAILABLE);
        return items.stream()
                .limit(limit > 0 ? limit : 50)
                .map(pi -> {
                    String lotNumber = null;
                    if (pi.getStockLotId() != null) {
                        lotNumber = stockLotRepository.findById(pi.getStockLotId())
                                .map(StockLot::getLotNumber)
                                .orElse(null);
                    }
                    return InventoryDto.SerialFifoItem.builder()
                            .productItemId(pi.getId())
                            .serialNumber(pi.getSerialNumber())
                            .batchNumber(pi.getBatchNumber())
                            .lotNumber(lotNumber)
                            .shelfLocation(pi.getLocation())
                            .receivedAt(pi.getCreatedAt())
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<InventoryDto.SerialFifoItem> getLotSerials(Integer lotId) {
        StockLot lot = stockLotRepository.findById(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("StockLot", "id", lotId));
        return productItemRepository.findByStockLotId(lotId).stream()
                .map(pi -> InventoryDto.SerialFifoItem.builder()
                        .productItemId(pi.getId())
                        .serialNumber(pi.getSerialNumber())
                        .batchNumber(pi.getBatchNumber())
                        .lotNumber(lot.getLotNumber())
                        .shelfLocation(pi.getLocation())
                        .receivedAt(pi.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    public List<InventoryDto.InventoryStat> getInventoryStats(int lowStockThreshold) {
        return productVariantRepository.findLowStockVariants().stream()
                .map(v -> InventoryDto.InventoryStat.builder()
                        .variantId(v.getId())
                        .skuCode(v.getSkuCode())
                        .productName(v.getProduct() != null ? v.getProduct().getName() : null)
                        .variantName(v.getVariantName())
                        .stockQuantity(v.getStockQuantity())
                        .lowStockThreshold(v.getLowStockThreshold())
                        .lowStock(v.getStockQuantity() != null && v.getLowStockThreshold() != null
                                && v.getStockQuantity() <= v.getLowStockThreshold())
                        .build())
                .collect(Collectors.toList());
    }

    public List<InventoryDto.VariantAutocomplete> searchVariants(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }
        return productVariantRepository.searchVariants(keyword.trim()).stream()
                .map(v -> {
                    InventoryDto.VariantAutocomplete dto = new InventoryDto.VariantAutocomplete();
                    dto.setId(v.getId());
                    dto.setSkuCode(v.getSkuCode());
                    dto.setVariantName(v.getVariantName());
                    if (v.getProduct() != null) {
                        dto.setProductName(v.getProduct().getName());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public void importImeiFromExcel(MultipartFile file) {
        throw new BadRequestException("Tính năng import Excel tạm thời bị vô hiệu hóa.");
    }

    public List<InventoryDto.InventoryResponse> getInventoryTransactions() {
        List<InventoryTransaction> transactions = inventoryTransactionRepository.findAllByOrderByCreatedAtDesc();
        Set<Integer> variantIds = transactions.stream()
                .map(InventoryTransaction::getVariantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Integer, ProductVariant> variantMap = new HashMap<>();
        if (!variantIds.isEmpty()) {
            productVariantRepository.findAllByIdWithProduct(variantIds)
                    .forEach(v -> variantMap.put(v.getId(), v));
        }

        return transactions.stream()
                .map(tx -> {
                    String imei = null;
                    if (tx.getProductItemId() != null) {
                        imei = productItemRepository.findById(tx.getProductItemId())
                                .map(ProductItem::getImei)
                                .orElse(null);
                    }
                    String productName = null;
                    String variantName = null;
                    String skuCode = null;
                    if (tx.getVariantId() != null) {
                        ProductVariant variant = variantMap.get(tx.getVariantId());
                        if (variant != null) {
                            variantName = variant.getVariantName();
                            skuCode = variant.getSkuCode();
                            if (variant.getProduct() != null) {
                                productName = variant.getProduct().getName();
                            }
                        }
                    }
                    return InventoryDto.InventoryResponse.builder()
                            .id(tx.getId())
                            .transactionType(tx.getTransactionType().name())
                            .quantity(tx.getQuantity())
                            .referenceType(tx.getReferenceType())
                            .referenceId(tx.getReferenceId())
                            .reason(tx.getReason())
                            .createdAt(tx.getCreatedAt())
                            .variantId(tx.getVariantId())
                            .skuCode(skuCode)
                            .productName(productName)
                            .variantName(variantName)
                            .productItemId(tx.getProductItemId())
                            .imei(imei)
                            .userId(tx.getUserId())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
