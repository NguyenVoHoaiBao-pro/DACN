package com.electro.catalog.service;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.dto.PurchaseOrderDto;
import com.electro.catalog.entity.ProductItem;
import com.electro.catalog.entity.ProductVariant;
import com.electro.catalog.entity.PurchaseOrder;
import com.electro.catalog.entity.PurchaseOrderItem;
import com.electro.catalog.entity.StockLot;
import com.electro.catalog.entity.Supplier;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.ProductVariantRepository;
import com.electro.catalog.repository.ProductItemRepository;
import com.electro.catalog.repository.PurchaseOrderRepository;
import com.electro.catalog.repository.StockLotRepository;
import com.electro.catalog.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private static final List<PurchaseOrder.PurchaseOrderStatus> WAREHOUSE_QUEUE_STATUSES = List.of(
            PurchaseOrder.PurchaseOrderStatus.IN_TRANSIT,
            PurchaseOrder.PurchaseOrderStatus.APPROVED,
            PurchaseOrder.PurchaseOrderStatus.RECEIVING,
            PurchaseOrder.PurchaseOrderStatus.RECEIVED
    );

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StockLotRepository stockLotRepository;
    private final ProductItemRepository productItemRepository;
    private final InventoryService inventoryService;

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

    public List<PurchaseOrderDto.ListItem> listPendingApproval() {
        List<PurchaseOrder> orders = purchaseOrderRepository.findByStatusOrderByOrderDateDesc(
                PurchaseOrder.PurchaseOrderStatus.PENDING);
        Map<Integer, String> supplierNames = loadSupplierNames(orders);
        return orders.stream()
                .map(po -> toListItem(po, supplierNames.get(po.getSupplierId())))
                .collect(Collectors.toList());
    }

    public List<PurchaseOrderDto.ListItem> listAdminAll() {
        List<PurchaseOrder> orders = purchaseOrderRepository.findByStatusInWithItems(List.of(
                PurchaseOrder.PurchaseOrderStatus.DRAFT,
                PurchaseOrder.PurchaseOrderStatus.PENDING,
                PurchaseOrder.PurchaseOrderStatus.APPROVED,
                PurchaseOrder.PurchaseOrderStatus.IN_TRANSIT,
                PurchaseOrder.PurchaseOrderStatus.RECEIVING,
                PurchaseOrder.PurchaseOrderStatus.RECEIVED,
                PurchaseOrder.PurchaseOrderStatus.COMPLETED,
                PurchaseOrder.PurchaseOrderStatus.CANCELLED
        ));
        Map<Integer, String> supplierNames = loadSupplierNames(orders);
        return orders.stream()
                .map(po -> toListItem(po, supplierNames.get(po.getSupplierId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public PurchaseOrderDto.Detail approve(Integer id, PurchaseOrderDto.ApproveRequest request) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
        if (po.getStatus() != PurchaseOrder.PurchaseOrderStatus.PENDING) {
            throw new BadRequestException("Chỉ duyệt được đơn PO ở trạng thái Chờ duyệt.");
        }
        po.setApprovedByUserId(request != null ? request.getApprovedByUserId() : null);
        po.setApprovedAt(LocalDateTime.now());
        // Duyệt = sẵn sàng xuống kho (Đang vận chuyển / Chờ nhập kho)
        po.setStatus(PurchaseOrder.PurchaseOrderStatus.IN_TRANSIT);
        if (request != null && request.getNotes() != null && !request.getNotes().isBlank()) {
            po.setNotes((po.getNotes() != null ? po.getNotes() + "\n" : "") + "[Duyệt] " + request.getNotes().trim());
        }
        purchaseOrderRepository.save(po);
        return getAdminDetail(id);
    }

    @Transactional
    public PurchaseOrderDto.Detail reject(Integer id, PurchaseOrderDto.RejectRequest request) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
        if (po.getStatus() != PurchaseOrder.PurchaseOrderStatus.PENDING) {
            throw new BadRequestException("Chỉ từ chối được đơn PO ở trạng thái Chờ duyệt.");
        }
        po.setStatus(PurchaseOrder.PurchaseOrderStatus.CANCELLED);
        if (request != null && request.getReason() != null) {
            po.setNotes((po.getNotes() != null ? po.getNotes() + "\n" : "") + "[Từ chối] " + request.getReason().trim());
        }
        purchaseOrderRepository.save(po);
        return getAdminDetail(id);
    }

    @Transactional
    public PurchaseOrderDto.Detail markInTransit(Integer id) {
        PurchaseOrder po = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
        if (po.getStatus() != PurchaseOrder.PurchaseOrderStatus.APPROVED) {
            throw new BadRequestException("Chỉ chuyển Đang vận chuyển từ trạng thái Đã duyệt.");
        }
        po.setStatus(PurchaseOrder.PurchaseOrderStatus.IN_TRANSIT);
        purchaseOrderRepository.save(po);
        return getAdminDetail(id);
    }

    public PurchaseOrderDto.Detail getAdminDetail(Integer id) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
        Supplier supplier = supplierRepository.findById(po.getSupplierId()).orElse(null);
        Map<Integer, ProductVariant> variants = loadVariants(po.getItems());
        List<PurchaseOrderDto.ItemDetail> items = po.getItems().stream()
                .map(item -> toItemDetail(item, variants.get(item.getVariantId())))
                .collect(Collectors.toList());
        List<PurchaseOrderDto.StockLotSummary> lots = stockLotRepository
                .findByPurchaseOrderIdOrderByReceiveWaveAsc(po.getId()).stream()
                .map(this::toLotSummary)
                .collect(Collectors.toList());
        return PurchaseOrderDto.Detail.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .supplierId(po.getSupplierId())
                .supplierName(supplier != null ? supplier.getName() : "N/A")
                .expectedDate(po.getExpectedDate())
                .status(po.getStatus().name())
                .statusLabel(statusLabel(po.getStatus()))
                .notes(po.getNotes())
                .items(items)
                .stockLots(lots)
                .build();
    }

    public List<PurchaseOrderDto.StockLotSummary> listOpenLots(Integer poId) {
        return stockLotRepository.findByPurchaseOrderIdOrderByReceiveWaveAsc(poId).stream()
                .filter(l -> l.getStatus() == StockLot.StockLotStatus.OPEN)
                .map(this::toLotSummary)
                .collect(Collectors.toList());
    }

    public List<PurchaseOrderDto.ListItem> listForImeiEntry() {
        List<PurchaseOrder> orders = purchaseOrderRepository.findWarehouseQueue(
                List.of(PurchaseOrder.PurchaseOrderStatus.RECEIVED), "");
        Map<Integer, String> supplierNames = loadSupplierNames(orders);
        return orders.stream()
                .map(po -> toListItem(po, supplierNames.get(po.getSupplierId())))
                .collect(Collectors.toList());
    }

    public List<PurchaseOrderDto.ListItem> listWarehouseQueue(String keyword) {
        String kw = keyword != null ? keyword.trim() : "";
        List<PurchaseOrder> orders = purchaseOrderRepository.findWarehouseQueue(WAREHOUSE_QUEUE_STATUSES, kw);
        Map<Integer, String> supplierNames = loadSupplierNames(orders);

        return orders.stream()
                .map(po -> toListItem(po, supplierNames.get(po.getSupplierId())))
                .collect(Collectors.toList());
    }

    public PurchaseOrderDto.Detail getWarehouseDetail(Integer id) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
        assertWarehouseAccessible(po);

        Supplier supplier = supplierRepository.findById(po.getSupplierId()).orElse(null);
        Map<Integer, ProductVariant> variants = loadVariants(po.getItems());

        List<PurchaseOrderDto.ItemDetail> items = po.getItems().stream()
                .map(item -> toItemDetail(item, variants.get(item.getVariantId())))
                .collect(Collectors.toList());

        List<PurchaseOrderDto.StockLotSummary> lots = stockLotRepository
                .findByPurchaseOrderIdOrderByReceiveWaveAsc(po.getId()).stream()
                .map(this::toLotSummary)
                .collect(Collectors.toList());

        return PurchaseOrderDto.Detail.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .supplierId(po.getSupplierId())
                .supplierName(supplier != null ? supplier.getName() : "N/A")
                .expectedDate(po.getExpectedDate())
                .status(po.getStatus().name())
                .statusLabel(statusLabel(po.getStatus()))
                .notes(po.getNotes())
                .items(items)
                .stockLots(lots)
                .build();
    }

    @Transactional
    public PurchaseOrderDto.Detail startReceiving(Integer id) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));

        if (!canStartReceiving(po)) {
            throw new BadRequestException("Đơn PO không ở trạng thái chờ nhập kho hoặc đã nhận đủ đợt.");
        }

        if (po.getStatus() != PurchaseOrder.PurchaseOrderStatus.RECEIVING) {
            po.setStatus(PurchaseOrder.PurchaseOrderStatus.RECEIVING);
            purchaseOrderRepository.save(po);
        }
        return getWarehouseDetail(id);
    }

    private boolean canStartReceiving(PurchaseOrder po) {
        if (EnumSet.of(
                PurchaseOrder.PurchaseOrderStatus.IN_TRANSIT,
                PurchaseOrder.PurchaseOrderStatus.APPROVED,
                PurchaseOrder.PurchaseOrderStatus.RECEIVING
        ).contains(po.getStatus())) {
            return true;
        }
        if (po.getStatus() == PurchaseOrder.PurchaseOrderStatus.RECEIVED && hasPartialDeliveryRemaining(po)) {
            return true;
        }
        return false;
    }

    private boolean hasPartialDeliveryRemaining(PurchaseOrder po) {
        if (po.getItems() == null) {
            return false;
        }
        return po.getItems().stream().anyMatch(item -> {
            int ordered = item.getQuantityOrdered();
            int received = item.getQuantityReceived() != null ? item.getQuantityReceived() : 0;
            return received < ordered;
        });
    }

    public PurchaseOrderDto.DiscrepancyPreview previewReceive(Integer id, PurchaseOrderDto.ConfirmReceiveRequest request) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));
        assertWarehouseAccessible(po);

        Map<Integer, PurchaseOrderDto.ReceiveItemCount> countMap = request.getItems().stream()
                .collect(Collectors.toMap(PurchaseOrderDto.ReceiveItemCount::getItemId, c -> c));

        int totalOrdered = 0;
        int totalReceived = 0;
        int totalDamaged = 0;
        int shortage = 0;
        int surplus = 0;
        List<PurchaseOrderDto.ItemDiscrepancy> itemRows = new ArrayList<>();

        Map<Integer, ProductVariant> variants = loadVariants(po.getItems());

        for (PurchaseOrderItem item : po.getItems()) {
            PurchaseOrderDto.ReceiveItemCount count = countMap.get(item.getId());
            if (count == null) {
                throw new BadRequestException("Thiếu số liệu kiểm đếm cho dòng sản phẩm #" + item.getId());
            }
            if (count.getQuantityDamaged() > count.getQuantityReceived()) {
                throw new BadRequestException("Số lượng lỗi không được lớn hơn số lượng thực nhận.");
            }

            int ordered = item.getQuantityOrdered();
            int prevReceived = item.getQuantityReceived() != null ? item.getQuantityReceived() : 0;
            int remainingOrdered = Math.max(0, ordered - prevReceived);
            int received = count.getQuantityReceived();
            int damaged = count.getQuantityDamaged();
            int good = received - damaged;
            int physical = received;
            int itemShortage = Math.max(0, remainingOrdered - physical);
            int itemSurplus = Math.max(0, physical - remainingOrdered);

            totalOrdered += ordered;
            totalReceived += good;
            totalDamaged += damaged;
            shortage += itemShortage;
            surplus += itemSurplus;

            ProductVariant variant = variants.get(item.getVariantId());
            String productName = variant != null && variant.getProduct() != null
                    ? variant.getProduct().getName()
                    : "Sản phẩm #" + item.getVariantId();

            itemRows.add(PurchaseOrderDto.ItemDiscrepancy.builder()
                    .itemId(item.getId())
                    .productName(productName)
                    .quantityOrdered(ordered)
                    .quantityReceived(received)
                    .quantityDamaged(damaged)
                    .shortage(itemShortage)
                    .surplus(itemSurplus)
                    .build());
        }

        boolean exactMatch = shortage == 0 && surplus == 0 && totalDamaged == 0;

        return PurchaseOrderDto.DiscrepancyPreview.builder()
                .exactMatch(exactMatch)
                .hasDiscrepancy(!exactMatch)
                .totalOrdered(totalOrdered)
                .totalReceived(totalReceived)
                .totalDamaged(totalDamaged)
                .shortage(shortage)
                .surplus(surplus)
                .items(itemRows)
                .build();
    }

    @Transactional
    public PurchaseOrderDto.ConfirmReceiveResponse confirmReceive(Integer id, PurchaseOrderDto.ConfirmReceiveRequest request) {
        PurchaseOrder po = purchaseOrderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("PurchaseOrder", "id", id));

        if (!canStartReceiving(po)) {
            throw new BadRequestException("Đơn PO không thể xác nhận nhập kho ở trạng thái hiện tại.");
        }

        PurchaseOrderDto.DiscrepancyPreview preview = previewReceive(id, request);
        if (preview.isHasDiscrepancy()) {
            if (request.getDiscrepancyReason() == null || request.getDiscrepancyReason().isBlank()) {
                throw new BadRequestException("Vui lòng nhập lý do sai lệch khi số lượng không khớp hoặc có hàng lỗi.");
            }
        }

        Map<Integer, PurchaseOrderDto.ReceiveItemCount> countMap = request.getItems().stream()
                .collect(Collectors.toMap(PurchaseOrderDto.ReceiveItemCount::getItemId, c -> c));

        List<InventoryDto.ImportStockItem> stockItems = new ArrayList<>();
        Supplier supplier = supplierRepository.findById(po.getSupplierId()).orElse(null);
        String supplierName = supplier != null ? supplier.getName() : "NCC";
        Map<Integer, ProductVariant> variants = loadVariants(po.getItems());
        int waveGoodTotal = 0;

        for (PurchaseOrderItem item : po.getItems()) {
            PurchaseOrderDto.ReceiveItemCount count = countMap.get(item.getId());
            int waveReceived = count.getQuantityReceived();
            int waveDamaged = count.getQuantityDamaged();
            int good = waveReceived - waveDamaged;
            waveGoodTotal += good;

            int prevReceived = item.getQuantityReceived() != null ? item.getQuantityReceived() : 0;
            int prevDamaged = item.getQuantityDamaged() != null ? item.getQuantityDamaged() : 0;
            item.setQuantityReceived(prevReceived + waveReceived);
            item.setQuantityDamaged(prevDamaged + waveDamaged);

            ProductVariant variant = variants.get(item.getVariantId());
            boolean requiresSerial = variant == null || !Boolean.FALSE.equals(variant.getRequiresSerial());
            if (good > 0 && !requiresSerial) {
                InventoryDto.ImportStockItem stockItem = new InventoryDto.ImportStockItem();
                stockItem.setVariantId(item.getVariantId());
                stockItem.setQuantity(good);
                stockItems.add(stockItem);
            }
        }

        if (!stockItems.isEmpty()) {
            if (request.getReceivedByUserId() == null) {
                throw new BadRequestException(
                        "Thiếu thông tin nhân viên nhập kho. Vui lòng đăng nhập lại và thử lại.");
            }
            InventoryDto.ImportStockRequest importRequest = new InventoryDto.ImportStockRequest();
            importRequest.setItems(stockItems);
            importRequest.setSupplier(supplierName);
            importRequest.setUserId(request.getReceivedByUserId());
            importRequest.setNote("Nhập kho từ PO " + po.getPoNumber()
                    + (preview.isHasDiscrepancy() ? " (có sai lệch)" : ""));
            importRequest.setReferenceType("PURCHASE_ORDER");
            importRequest.setReferenceId(po.getId());
            inventoryService.importStock(importRequest);
        }

        int wave = stockLotRepository.findTopByPurchaseOrderIdOrderByReceiveWaveDesc(po.getId())
                .map(l -> l.getReceiveWave() + 1)
                .orElse(1);
        String lotNumber = "LOT-" + po.getPoNumber() + "-" + wave;
        StockLot lot = StockLot.builder()
                .lotNumber(lotNumber)
                .purchaseOrderId(po.getId())
                .receiveWave(wave)
                .status(StockLot.StockLotStatus.OPEN)
                .receivedAt(LocalDateTime.now())
                .receivedByUserId(request.getReceivedByUserId())
                .expectedQuantity(waveGoodTotal)
                .notes("Đợt giao " + wave + " — PO " + po.getPoNumber())
                .build();
        stockLotRepository.save(lot);

        po.setStatus(PurchaseOrder.PurchaseOrderStatus.RECEIVED);
        po.setReceivedDate(LocalDateTime.now());
        po.setReceivedByUserId(request.getReceivedByUserId());
        if (preview.isHasDiscrepancy()) {
            po.setDiscrepancyReason(request.getDiscrepancyReason().trim());
            po.setDiscrepancyEvidence(request.getDiscrepancyEvidence());
        } else {
            po.setDiscrepancyReason(null);
            po.setDiscrepancyEvidence(null);
        }
        purchaseOrderRepository.save(po);

        String message = preview.isExactMatch()
                ? "Nhập kho thành công — số lượng trùng khớp hoàn toàn."
                : "Nhập kho thành công — đã ghi nhận sai lệch.";

        return PurchaseOrderDto.ConfirmReceiveResponse.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .status(po.getStatus().name())
                .statusLabel(statusLabel(po.getStatus()))
                .hasDiscrepancy(preview.isHasDiscrepancy())
                .message(message)
                .totalGoodReceived(preview.getTotalReceived())
                .totalDamaged(preview.getTotalDamaged())
                .totalShortage(preview.getShortage())
                .totalSurplus(preview.getSurplus())
                .stockLotId(lot.getId())
                .lotNumber(lot.getLotNumber())
                .receiveWave(lot.getReceiveWave())
                .build();
    }

    @Transactional
    public PurchaseOrderDto.StockLotSummary flagLotRecall(Integer lotId, String reason) {
        StockLot lot = stockLotRepository.findById(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("StockLot", "id", lotId));
        lot.setStatus(StockLot.StockLotStatus.RECALL);
        if (reason != null && !reason.isBlank()) {
            lot.setNotes((lot.getNotes() != null ? lot.getNotes() + " | " : "") + "RECALL: " + reason);
        }
        stockLotRepository.save(lot);
        return toLotSummary(lot);
    }

    public List<PurchaseOrderDto.StockLotSummary> findLotBySerial(String serial) {
        ProductItem item = productItemRepository.findBySerialNumber(serial.trim())
                .or(() -> productItemRepository.findByImeiOrSerialNumber(serial.trim(), serial.trim()))
                .orElseThrow(() -> new ResourceNotFoundException("ProductItem", "serial", serial));
        if (item.getStockLotId() == null) {
            throw new BadRequestException("Serial này chưa gắn mã lô hàng.");
        }
        StockLot lot = stockLotRepository.findById(item.getStockLotId())
                .orElseThrow(() -> new ResourceNotFoundException("StockLot", "id", item.getStockLotId()));
        List<ProductItem> sameLot = productItemRepository.findByStockLotId(lot.getId());
        PurchaseOrderDto.StockLotSummary summary = toLotSummary(lot);
        summary.setItemsScanned(sameLot.size());
        return List.of(summary);
    }

    private PurchaseOrderDto.StockLotSummary toLotSummary(StockLot lot) {
        long scanned = productItemRepository.countByStockLotId(lot.getId());
        return PurchaseOrderDto.StockLotSummary.builder()
                .id(lot.getId())
                .lotNumber(lot.getLotNumber())
                .receiveWave(lot.getReceiveWave())
                .status(lot.getStatus().name())
                .receivedAt(lot.getReceivedAt())
                .itemsScanned((int) scanned)
                .itemsRequired(lot.getExpectedQuantity())
                .build();
    }

    private void assertWarehouseAccessible(PurchaseOrder po) {
        if (!WAREHOUSE_QUEUE_STATUSES.contains(po.getStatus())) {
            throw new BadRequestException("Đơn PO không thuộc hàng đợi nhập kho.");
        }
    }

    private Map<Integer, String> loadSupplierNames(List<PurchaseOrder> orders) {
        List<Integer> ids = orders.stream().map(PurchaseOrder::getSupplierId).distinct().collect(Collectors.toList());
        Map<Integer, String> map = new HashMap<>();
        if (!ids.isEmpty()) {
            supplierRepository.findAllById(ids).forEach(s -> map.put(s.getId(), s.getName()));
        }
        return map;
    }

    private Map<Integer, ProductVariant> loadVariants(List<PurchaseOrderItem> items) {
        List<Integer> variantIds = items.stream().map(PurchaseOrderItem::getVariantId).distinct().collect(Collectors.toList());
        Map<Integer, ProductVariant> map = new HashMap<>();
        if (!variantIds.isEmpty()) {
            productVariantRepository.findAllByIdWithProduct(variantIds).forEach(v -> map.put(v.getId(), v));
        }
        return map;
    }

    private PurchaseOrderDto.ListItem toListItem(PurchaseOrder po, String supplierName) {
        List<PurchaseOrderItem> items = po.getItems() != null ? po.getItems() : List.of();
        int totalQty = items.stream().mapToInt(PurchaseOrderItem::getQuantityOrdered).sum();

        return PurchaseOrderDto.ListItem.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .supplierName(supplierName != null ? supplierName : "N/A")
                .expectedDate(po.getExpectedDate())
                .status(po.getStatus().name())
                .statusLabel(statusLabel(po.getStatus()))
                .totalItemsOrdered(items.size())
                .totalQuantityOrdered(totalQty)
                .receivedDate(po.getReceivedDate())
                .build();
    }

    private PurchaseOrderDto.ItemDetail toItemDetail(PurchaseOrderItem item, ProductVariant variant) {
        String productName = variant != null && variant.getProduct() != null
                ? variant.getProduct().getName()
                : null;
        int received = item.getQuantityReceived() != null ? item.getQuantityReceived() : 0;
        int damaged = item.getQuantityDamaged() != null ? item.getQuantityDamaged() : 0;
        int scanned = item.getQuantityImeiScanned() != null ? item.getQuantityImeiScanned() : 0;
        int imeiRequired = Math.max(0, received - damaged);
        int remaining = Math.max(0, imeiRequired - scanned);
        return PurchaseOrderDto.ItemDetail.builder()
                .id(item.getId())
                .variantId(item.getVariantId())
                .skuCode(variant != null ? variant.getSkuCode() : null)
                .productName(productName)
                .variantName(variant != null ? variant.getVariantName() : null)
                .quantityOrdered(item.getQuantityOrdered())
                .quantityReceived(received)
                .quantityDamaged(damaged)
                .quantityImeiScanned(scanned)
                .quantityImeiRequired(imeiRequired)
                .quantityImeiRemaining(remaining)
                .notes(item.getNotes())
                .build();
    }

    private String statusLabel(PurchaseOrder.PurchaseOrderStatus status) {
        return switch (status) {
            case IN_TRANSIT -> "Đang vận chuyển / Chờ nhập kho";
            case APPROVED -> "Chờ nhập kho";
            case RECEIVING -> "Đang kiểm đếm";
            case RECEIVED -> "Đã nhập kho";
            case COMPLETED -> "Hoàn tất";
            case PENDING -> "Chờ duyệt";
            case DRAFT -> "Nháp";
            case CANCELLED -> "Đã hủy";
        };
    }
}
