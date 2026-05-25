package com.electro.user.service;

import com.electro.user.client.CatalogClient;
import com.electro.user.dto.WishlistDto;
import com.electro.user.entity.User;
import com.electro.user.entity.Wishlist;
import com.electro.user.exception.BadRequestException;
import com.electro.user.exception.ResourceNotFoundException;
import com.electro.user.repository.UserRepository;
import com.electro.user.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final CatalogClient catalogClient;

    @Transactional(readOnly = true)
    public Page<WishlistDto.Response> getUserWishlist(String username, Pageable pageable) {
        User user = findUser(username);
        return wishlistRepository.findByUserId(user.getId(), pageable).map(this::mapToResponse);
    }

    public WishlistDto.Response addToWishlist(String username, WishlistDto.Request request) {
        User user = findUser(username);
        try {
            catalogClient.getProductById(request.getProductId());
        } catch (Exception e) {
            throw new ResourceNotFoundException("Product", "id", request.getProductId());
        }

        if (request.getVariantId() != null) {
            try {
                catalogClient.getVariantById(request.getVariantId());
            } catch (Exception e) {
                throw new ResourceNotFoundException("ProductVariant", "id", request.getVariantId());
            }
        }

        Optional<Wishlist> existing = request.getVariantId() != null
                ? wishlistRepository.findByUserIdAndProductIdAndVariantId(
                        user.getId(), request.getProductId(), request.getVariantId())
                : wishlistRepository.findByUserIdAndProductIdAndVariantIdIsNull(
                        user.getId(), request.getProductId());

        if (existing.isPresent()) {
            throw new BadRequestException("Product is already in the wishlist.");
        }

        Wishlist wishlist = new Wishlist();
        wishlist.setUserId(user.getId());
        wishlist.setProductId(request.getProductId());
        wishlist.setVariantId(request.getVariantId());
        return mapToResponse(wishlistRepository.save(wishlist));
    }

    public void removeFromWishlist(String username, Integer productId) {
        User user = findUser(username);
        Wishlist wishlist = wishlistRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("Wishlist", "productId", productId));
        wishlistRepository.delete(wishlist);
    }

    public void removeWishlistItem(String username, Integer id) {
        User user = findUser(username);
        Wishlist wishlist = wishlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Wishlist", "id", id));
        if (!wishlist.getUserId().equals(user.getId())) {
            throw new BadRequestException("You don't have permission to remove this item");
        }
        wishlistRepository.delete(wishlist);
    }

    public boolean checkWishlistStatus(String username, Integer productId) {
        User user = findUser(username);
        return wishlistRepository.existsByUserIdAndProductId(user.getId(), productId);
    }

    public void clearWishlist(String username) {
        User user = findUser(username);
        wishlistRepository.deleteByUserId(user.getId());
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }

    private WishlistDto.Response mapToResponse(Wishlist wishlist) {
        WishlistDto.Response response = new WishlistDto.Response();
        response.setId(wishlist.getId());
        response.setCreatedAt(wishlist.getCreatedAt());

        try {
            CatalogClient.ProductResponse product = catalogClient.getProductById(wishlist.getProductId());
            WishlistDto.ProductSummary p = new WishlistDto.ProductSummary();
            p.setId(product.getId());
            p.setName(product.getName());
            response.setProduct(p);
        } catch (Exception ignored) {
        }

        if (wishlist.getVariantId() != null) {
            try {
                CatalogClient.VariantResponse variant = catalogClient.getVariantById(wishlist.getVariantId());
                WishlistDto.VariantSummary v = new WishlistDto.VariantSummary();
                v.setId(variant.getId());
                v.setVariantName(variant.getVariantName());
                v.setSkuCode(variant.getSkuCode());
                if (variant.getPrice() != null) {
                    v.setPrice(variant.getPrice().doubleValue());
                }
                v.setImageUrl(variant.getImageUrl());
                response.setVariant(v);
            } catch (Exception ignored) {
            }
        }
        return response;
    }
}
