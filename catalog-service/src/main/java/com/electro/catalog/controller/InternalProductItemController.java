package com.electro.catalog.controller;

import com.electro.catalog.dto.ProductItemDto;
import com.electro.catalog.entity.ProductItemStatus;
import com.electro.catalog.service.ProductItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products/internal/items")
public class InternalProductItemController {

    @Autowired
    private ProductItemService productItemService;

    @GetMapping("/by-code")
    public ProductItemDto.Response findByCode(@RequestParam("value") String value) {
        return productItemService.findByImeiOrSerial(value);
    }

    @GetMapping("/{id}")
    public ProductItemDto.Response findById(@PathVariable("id") Integer id) {
        return productItemService.findById(id);
    }

    @PutMapping("/{id}/reserve")
    public ProductItemDto.Response reserveItem(@PathVariable("id") Integer id) {
        return productItemService.reserveItem(id);
    }

    @PutMapping("/{id}/release")
    public void releaseItem(@PathVariable("id") Integer id) {
        productItemService.releaseItem(id);
    }

    @PutMapping("/activate-warranty")
    public ProductItemDto.ActivateWarrantyResponse activateWarranty(
            @RequestBody ProductItemDto.ActivateWarrantyRequest request) {
        return productItemService.activateWarranty(request.getItemIds());
    }

    @PutMapping("/{id}/status")
    public ProductItemDto.Response updateStatus(
            @PathVariable("id") Integer id,
            @RequestParam("status") ProductItemStatus status) {
        return productItemService.updateStatus(id, status);
    }
}
