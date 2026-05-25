package com.electro.cart.service;

import com.electro.cart.dto.CartDto;
import com.electro.cart.entity.Cart;
import com.electro.cart.entity.CartItem;

import com.electro.cart.exception.BadRequestException;
import com.electro.cart.exception.ResourceNotFoundException;
import com.electro.cart.repository.CartItemRepository;
import com.electro.cart.repository.CartRepository;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CartService {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private com.electro.cart.client.CatalogClient catalogClient;

    @Autowired
    private com.electro.cart.client.UserClient userClient;

    @Value("${app.server.url:http://localhost:8080}")
    private String serverUrl;

    // ─── GET CART ────────────────────────────────────────────────────────────────
    public CartDto.CartResponse getCart(String username) {
        com.electro.cart.client.UserClient.UserResponse user = findUser(username);
        Cart cart = getOrCreateCart(user);
        return mapToCartResponse(cart);
    }

    // ─── ADD ITEM ────────────────────────────────────────────────────────────────
    public CartDto.CartResponse addItem(String username, CartDto.AddItemRequest request) {
        com.electro.cart.client.UserClient.UserResponse user = findUser(username);
        Cart cart = getOrCreateCart(user);

        CartDto.CartVariantDto variant = catalogClient.getVariantForCart(request.getVariantId());
        if (variant == null) {
            throw new ResourceNotFoundException("ProductVariant", "id", request.getVariantId());
        }

        if (!Boolean.TRUE.equals(variant.getIsActive())) {
            throw new BadRequestException("Product variant is no longer available");
        }

        // Check if variant already in cart → increment quantity
        var existingItem = cartItemRepository.findByUserIdAndVariantId(user.getId(), variant.getId());

        if (existingItem.isPresent()) {
            CartItem item = existingItem.get();
            int newQty = item.getQuantity() + request.getQuantity();
            validateStock(variant, newQty);
            item.setQuantity(newQty);
            item.setUnitPrice(BigDecimal.valueOf(variant.getPrice()));
            cartItemRepository.save(item);
        } else {
            validateStock(variant, request.getQuantity());
            CartItem item = new CartItem();
            item.setCart(cart);
            item.setVariantId(variant.getId());
            item.setQuantity(request.getQuantity());
            item.setUnitPrice(BigDecimal.valueOf(variant.getPrice()));
            cartItemRepository.save(item);
        }

        // Reload cart to get updated items
        Cart updatedCart = cartRepository.findById(cart.getId()).orElse(cart);
        return mapToCartResponse(updatedCart);
    }

    // ─── UPDATE ITEM ─────────────────────────────────────────────────────────────
    public CartDto.CartResponse updateItem(String username, Integer cartItemId, CartDto.UpdateItemRequest request) {
        com.electro.cart.client.UserClient.UserResponse user = findUser(username);
        CartItem item = getCartItemWithOwnerCheck(cartItemId, user.getId());

        CartDto.CartVariantDto variant = catalogClient.getVariantForCart(item.getVariantId());
        validateStock(variant, request.getQuantity());
        item.setQuantity(request.getQuantity());
        item.setUnitPrice(BigDecimal.valueOf(variant.getPrice()));
        cartItemRepository.save(item);

        Cart cart = cartRepository.findByUserId(user.getId()).orElseThrow();
        return mapToCartResponse(cart);
    }

    // ─── REMOVE ITEM ─────────────────────────────────────────────────────────────
    public CartDto.CartResponse removeItem(String username, Integer cartItemId) {
        com.electro.cart.client.UserClient.UserResponse user = findUser(username);
        CartItem item = getCartItemWithOwnerCheck(cartItemId, user.getId());

        // Xóa item khỏi collection của cart trước (tránh Hibernate cache cũ)
        Cart cart = cartRepository.findByUserId(user.getId()).orElseThrow();
        cart.getCartItems().remove(item);
        cartItemRepository.delete(item);
        cartItemRepository.flush();

        return mapToCartResponse(cart);
    }

    // ─── CLEAR CART ──────────────────────────────────────────────────────────────
    public void clearCart(String username) {
        com.electro.cart.client.UserClient.UserResponse user = findUser(username);
        cartItemRepository.deleteAllByUserId(user.getId());
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────────
    private com.electro.cart.client.UserClient.UserResponse findUser(String username) {
        return userClient.getUserByUsername(username);
    }

    private Cart getOrCreateCart(com.electro.cart.client.UserClient.UserResponse user) {
        return cartRepository.findByUserId(user.getId()).orElseGet(() -> {
            Cart cart = new Cart();
            cart.setUserId(user.getId());
            return cartRepository.save(cart);
        });
    }

    private CartItem getCartItemWithOwnerCheck(Integer cartItemId, Integer userId) {
        CartItem item = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new ResourceNotFoundException("CartItem", "id", cartItemId));
        if (!item.getCart().getUserId().equals(userId)) {
            throw new ResourceNotFoundException("CartItem", "id", cartItemId);
        }
        return item;
    }

    private void validateStock(CartDto.CartVariantDto variant, int requestedQty) {
        if (variant.getStockQuantity() != null && requestedQty > variant.getStockQuantity()) {
            throw new BadRequestException(
                    "Insufficient stock. Available: " + variant.getStockQuantity() + ", requested: " + requestedQty);
        }
    }

    private CartDto.CartResponse mapToCartResponse(Cart cart) {
        List<CartItem> items = cart.getCartItems();
        List<CartDto.CartItemResponse> itemResponses = new ArrayList<>();
        double totalAmount = 0.0;

        if (items != null) {
            for (CartItem item : items) {
                CartDto.CartItemResponse ir = mapToCartItemResponse(item);
                itemResponses.add(ir);
                if (ir.getSubtotal() != null) {
                    totalAmount += ir.getSubtotal();
                }
            }
        }

        CartDto.CartResponse response = new CartDto.CartResponse();
        response.setId(cart.getId());
        response.setItems(itemResponses);
        response.setTotalItems(itemResponses.size());
        response.setTotalAmount(Math.round(totalAmount * 100.0) / 100.0);
        return response;
    }

    private CartDto.CartItemResponse mapToCartItemResponse(CartItem item) {
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
        return ir;
    }


}



