package com.electro.catalog.service;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.entity.PurchaseOrder;
import com.electro.catalog.entity.PurchaseOrderItem;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.PurchaseOrderRepository;
import com.electro.catalog.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;

    public List<PurchaseOrder> getAll() {
        return purchaseOrderRepository.findAll();
    }

    public PurchaseOrder getById(Integer id) {
        return purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
    }

    @Transactional
    public PurchaseOrder create(InventoryDto.PurchaseOrderRequest request) {
        supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", request.getSupplierId()));

        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        po.setSupplierId(request.getSupplierId());
        po.setCreatedByUserId(request.getCreatedByUserId());
        po.setNotes(request.getNotes());
        po.setExpectedDate(request.getExpectedDate());
        po.setStatus(PurchaseOrder.PurchaseOrderStatus.PENDING);

        List<PurchaseOrderItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (InventoryDto.PurchaseOrderItemRequest itemReq : request.getItems()) {
            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(po);
            item.setVariantId(itemReq.getVariantId());
            item.setQuantityOrdered(itemReq.getQuantityOrdered());
            item.setUnitCost(itemReq.getUnitCost());
            item.setTotalCost(itemReq.getUnitCost().multiply(BigDecimal.valueOf(itemReq.getQuantityOrdered())));
            item.setNotes(itemReq.getNotes());
            items.add(item);
            total = total.add(item.getTotalCost());
        }
        po.setItems(items);
        po.setTotalAmount(total);
        return purchaseOrderRepository.save(po);
    }
}
