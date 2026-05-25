package com.electro.cart.controller;

import com.electro.cart.dto.CartDto;
import com.electro.cart.entity.Cart;
import com.electro.cart.entity.CartItem;
import com.electro.cart.repository.CartItemRepository;
import com.electro.cart.repository.CartRepository;
import com.electro.cart.client.CatalogClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/carts/internal")
public class InternalCartController {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private CatalogClient catalogClient;

    @GetMapping("/{userId}")
    public CartDto.CartResponse getCartByUserId(@PathVariable("userId") Integer userId) {
        Cart cart = cartRepository.findByUserId(userId).orElseGet(() -> {
            Cart newCart = new Cart();
            newCart.setUserId(userId);
            return cartRepository.save(newCart);
        });
        return mapToCartResponse(cart);
    }

    @DeleteMapping("/{userId}/clear")
    @Transactional
    public void clearCartByUserId(@PathVariable("userId") Integer userId) {
        cartItemRepository.deleteAllByUserId(userId);
    }

    private CartDto.CartResponse mapToCartResponse(Cart cart) {
        List<CartItem> items = cart.getCartItems();
        List<CartDto.CartItemResponse> itemResponses = new ArrayList<>();
        double totalAmount = 0.0;

        if (items != null) {
            for (CartItem item : items) {
                CartDto.CartItemResponse ir = new CartDto.CartItemResponse();
                ir.setId(item.getId());
                ir.setQuantity(item.getQuantity());

                CartDto.CartVariantDto variant = catalogClient.getVariantForCart(item.getVariantId());

                double unitPrice = 0.0;
                if (item.getUnitPrice() != null) {
                    unitPrice = item.getUnitPrice().doubleValue();
                } else if (variant != null && variant.getPrice() != null) {
                    unitPrice = variant.getPrice();
                }
                ir.setUnitPrice(unitPrice);
                ir.setSubtotal(Math.round(unitPrice * item.getQuantity() * 100.0) / 100.0);

                if (variant != null) {
                    ir.setVariant(variant);
                }
                itemResponses.add(ir);
                totalAmount += ir.getSubtotal();
            }
        }

        CartDto.CartResponse response = new CartDto.CartResponse();
        response.setId(cart.getId());
        response.setItems(itemResponses);
        response.setTotalItems(itemResponses.size());
        response.setTotalAmount(Math.round(totalAmount * 100.0) / 100.0);
        return response;
    }
}
