package com.electro.catalog.service;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.entity.*;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.InventoryTransactionRepository;
import com.electro.catalog.repository.ProductItemRepository;
import com.electro.catalog.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductVariantRepository productVariantRepository;
    private final ProductItemRepository productItemRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @Transactional
    public void importStock(InventoryDto.ImportStockRequest request) {
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
            inventoryTransactionRepository.save(tx);
        }
    }

    @Transactional
    public void returnStock(InventoryDto.ReturnStockRequest request) {
        ProductItem productItem = productItemRepository
                .findByImeiOrSerialNumber(request.getImei().trim(), request.getImei().trim())
                .orElseThrow(() -> new ResourceNotFoundException("ProductItem", "imei", request.getImei()));

        boolean wasDefective = Boolean.TRUE.equals(request.getIsDefective());
        if (wasDefective) {
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

        InventoryTransaction tx = new InventoryTransaction();
        tx.setTransactionType(wasDefective
                ? InventoryTransaction.TransactionType.ADJUSTMENT
                : InventoryTransaction.TransactionType.RETURN);
        tx.setQuantity(1);
        tx.setVariantId(productItem.getVariant() != null ? productItem.getVariant().getId() : null);
        tx.setProductItemId(productItem.getId());
        tx.setReason("Hàng trả lại: " + (request.getReason() != null ? request.getReason() : ""));
        inventoryTransactionRepository.save(tx);
    }

    @Transactional
    public void addImeiToProduct(InventoryDto.ImeiRequest request) {
        ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductVariant", "id", request.getVariantId()));

        List<ProductItem> itemsToSave = new ArrayList<>();
        for (String imei : request.getImeis()) {
            String code = imei == null ? "" : imei.trim();
            if (code.isEmpty()) {
                continue;
            }
            if (productItemRepository.findByImeiOrSerialNumber(code, code).isPresent()) {
                throw new BadRequestException("IMEI " + code + " đã tồn tại trong hệ thống");
            }
            ProductItem item = new ProductItem();
            item.setImei(code);
            item.setSerialNumber(code);
            item.setVariant(variant);
            item.setStatus(ProductItemStatus.AVAILABLE);
            itemsToSave.add(item);
        }

        productItemRepository.saveAll(itemsToSave);

        int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
        variant.setStockQuantity(current + itemsToSave.size());
        productVariantRepository.save(variant);

        InventoryTransaction tx = new InventoryTransaction();
        tx.setTransactionType(InventoryTransaction.TransactionType.IMPORT);
        tx.setQuantity(itemsToSave.size());
        tx.setVariantId(variant.getId());
        tx.setReason(request.getNote() != null && !request.getNote().isBlank()
                ? request.getNote()
                : "Nhập hàng theo lô IMEI: " + request.getBatchNumber());
        inventoryTransactionRepository.save(tx);
    }

    public List<InventoryDto.InventoryStat> getInventoryStats(int lowStockThreshold) {
        return productVariantRepository.findLowStockVariants().stream()
                .map(v -> InventoryDto.InventoryStat.builder()
                        .variantId(v.getId())
                        .skuCode(v.getSkuCode())
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
        return inventoryTransactionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(tx -> {
                    String imei = null;
                    if (tx.getProductItemId() != null) {
                        imei = productItemRepository.findById(tx.getProductItemId())
                                .map(ProductItem::getImei)
                                .orElse(null);
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
                            .productItemId(tx.getProductItemId())
                            .imei(imei)
                            .userId(tx.getUserId())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
