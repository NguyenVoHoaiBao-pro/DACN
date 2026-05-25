package com.electro.catalog.service;

import com.electro.catalog.dto.InventoryDto;
import com.electro.catalog.entity.Supplier;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<InventoryDto.SupplierResponse> getAll() {
        return supplierRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public InventoryDto.SupplierResponse getById(Integer id) {
        return toResponse(getEntity(id));
    }

    @Transactional
    public InventoryDto.SupplierResponse create(InventoryDto.SupplierRequest request) {
        if (request.getCode() != null && supplierRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã nhà cung cấp đã tồn tại: " + request.getCode());
        }
        Supplier supplier = new Supplier();
        mapRequest(request, supplier);
        return toResponse(supplierRepository.save(supplier));
    }

    @Transactional
    public InventoryDto.SupplierResponse update(Integer id, InventoryDto.SupplierRequest request) {
        Supplier supplier = getEntity(id);
        if (request.getCode() != null && !request.getCode().equals(supplier.getCode())
                && supplierRepository.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã nhà cung cấp đã tồn tại: " + request.getCode());
        }
        mapRequest(request, supplier);
        return toResponse(supplierRepository.save(supplier));
    }

    private Supplier getEntity(Integer id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", id));
    }

    private void mapRequest(InventoryDto.SupplierRequest request, Supplier supplier) {
        supplier.setName(request.getName());
        supplier.setCode(request.getCode());
        supplier.setContactPerson(request.getContactPerson());
        supplier.setPhone(request.getPhone());
        supplier.setEmail(request.getEmail());
        supplier.setAddress(request.getAddress());
        supplier.setTaxCode(request.getTaxCode());
        if (request.getIsActive() != null) {
            supplier.setIsActive(request.getIsActive());
        }
    }

    private InventoryDto.SupplierResponse toResponse(Supplier supplier) {
        InventoryDto.SupplierResponse r = new InventoryDto.SupplierResponse();
        r.setId(supplier.getId());
        r.setName(supplier.getName());
        r.setCode(supplier.getCode());
        r.setContactPerson(supplier.getContactPerson());
        r.setPhone(supplier.getPhone());
        r.setEmail(supplier.getEmail());
        r.setAddress(supplier.getAddress());
        r.setTaxCode(supplier.getTaxCode());
        r.setIsActive(supplier.getIsActive());
        return r;
    }
}
