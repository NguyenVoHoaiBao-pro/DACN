package com.electro.catalog.service;

import com.electro.catalog.dto.ProductItemDto;
import com.electro.catalog.entity.ProductItem;
import com.electro.catalog.entity.ProductItemStatus;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.entity.ProductVariant;
import com.electro.catalog.repository.ProductItemRepository;
import com.electro.catalog.repository.ProductVariantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ProductItemService {

    @Autowired
    private ProductItemRepository productItemRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Transactional(readOnly = true)
    public ProductItemDto.Response findByImeiOrSerial(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            throw new BadRequestException("IMEI/Serial không được để trống");
        }
        return productItemRepository.findByImeiOrSerialNumber(trimmed, trimmed)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy máy với IMEI/Serial: " + trimmed));
    }

    @Transactional(readOnly = true)
    public ProductItemDto.Response findById(Integer id) {
        return toResponse(getItem(id));
    }

    public ProductItemDto.Response reserveItem(Integer id) {
        ProductItem item = getItem(id);
        if (item.getStatus() != ProductItemStatus.AVAILABLE) {
            throw new BadRequestException(
                    "IMEI/Serial không khả dụng. Trạng thái hiện tại: " + item.getStatus());
        }
        item.setStatus(ProductItemStatus.RESERVED);
        item.setReservedAt(LocalDateTime.now());
        productItemRepository.save(item);

        ProductVariant variant = item.getVariant();
        if (variant != null) {
            int current = variant.getStockQuantity() != null ? variant.getStockQuantity() : 0;
            if (current > 0) {
                variant.setStockQuantity(current - 1);
                productVariantRepository.save(variant);
            }
        }
        return toResponse(item);
    }

    public void releaseItem(Integer id) {
        ProductItem item = getItem(id);
        if (item.getStatus() != ProductItemStatus.RESERVED) {
            return;
        }
        item.setStatus(ProductItemStatus.AVAILABLE);
        item.setReservedAt(null);
        productItemRepository.save(item);
    }

    public ProductItemDto.ActivateWarrantyResponse activateWarranty(List<Integer> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            ProductItemDto.ActivateWarrantyResponse empty = new ProductItemDto.ActivateWarrantyResponse();
            empty.setActivatedCount(0);
            return empty;
        }

        LocalDate today = LocalDate.now();
        int activated = 0;
        for (Integer id : itemIds) {
            ProductItem item = getItem(id);
            if (item.getStatus() == ProductItemStatus.RESERVED || item.getStatus() == ProductItemStatus.SOLD) {
                item.setStatus(ProductItemStatus.SOLD);
                item.setWarrantyStartDate(today);
                if (item.getSoldAt() == null) {
                    item.setSoldAt(LocalDateTime.now());
                }
                productItemRepository.save(item);
                activated++;
            }
        }

        ProductItemDto.ActivateWarrantyResponse response = new ProductItemDto.ActivateWarrantyResponse();
        response.setActivatedCount(activated);
        return response;
    }

    public ProductItemDto.Response updateStatus(Integer id, ProductItemStatus status) {
        ProductItem item = getItem(id);
        item.setStatus(status);
        return toResponse(productItemRepository.save(item));
    }

    private ProductItem getItem(Integer id) {
        return productItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ProductItem id=" + id));
    }

    private ProductItemDto.Response toResponse(ProductItem item) {
        ProductItemDto.Response res = new ProductItemDto.Response();
        res.setId(item.getId());
        res.setVariantId(item.getVariant() != null ? item.getVariant().getId() : null);
        res.setImei(item.getImei());
        res.setSerialNumber(item.getSerialNumber());
        res.setStatus(item.getStatus());
        res.setReservedAt(item.getReservedAt());
        res.setSoldAt(item.getSoldAt());
        res.setWarrantyStartDate(item.getWarrantyStartDate());
        res.setWarrantyMonths(item.getWarrantyMonths());
        return res;
    }
}
