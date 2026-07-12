package com.electro.catalog.repository;

import com.electro.catalog.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Integer> {
    
    @Query("SELECT v FROM ProductVariant v " +
           "LEFT JOIN FETCH v.attributeValues av " +
           "LEFT JOIN FETCH av.attribute " +
           "WHERE v.product.productType.id = :categoryId AND v.isActive = true")
    List<ProductVariant> findByCategoryId(@Param("categoryId") Integer categoryId);

    @Query("SELECT DISTINCT v FROM ProductVariant v " +
           "JOIN FETCH v.product p " +
           "JOIN p.productType pt " +
           "WHERE v.isActive = true " +
           "AND (pt.id = :categoryId OR pt.parent.id = :categoryId)")
    List<ProductVariant> findActiveByCategoryWithProduct(@Param("categoryId") Integer categoryId);

    @Query("SELECT v FROM ProductVariant v " +
           "LEFT JOIN FETCH v.attributeValues av " +
           "LEFT JOIN FETCH av.attribute " +
           "WHERE v.product.id = :productId")
    List<ProductVariant> findByProductId(Integer productId);

    @Query("SELECT DISTINCT v FROM ProductVariant v " +
           "LEFT JOIN FETCH v.attributeValues av " +
           "LEFT JOIN FETCH av.attribute " +
           "WHERE v.product.id IN :productIds AND v.isActive = true")
    List<ProductVariant> findActiveByProductIds(@Param("productIds") Collection<Integer> productIds);

    @Query("SELECT v FROM ProductVariant v LEFT JOIN FETCH v.product WHERE v.id IN :ids")
    List<ProductVariant> findAllByIdWithProduct(@Param("ids") java.util.Collection<Integer> ids);

    @Query("SELECT v FROM ProductVariant v JOIN FETCH v.product p LEFT JOIN FETCH p.images WHERE v.id = :id")
    Optional<ProductVariant> findByIdWithProductAndImages(@Param("id") Integer id);

    java.util.Optional<ProductVariant> findBySkuCode(String skuCode);

    void deleteByProductId(Integer productId);

    // ═══════════════════════════════════════════════════════════════════════════
    // ██  PHASE 6: Low Stock Query                                            ██
    // ═══════════════════════════════════════════════════════════════════════════

    /** Sản phẩm tồn kho thấp — stock <= ngưỡng cảnh báo lowStockThreshold */
    @Query("SELECT v FROM ProductVariant v " +
           "JOIN FETCH v.product p " +
           "WHERE v.isActive = true AND v.stockQuantity <= v.lowStockThreshold " +
           "ORDER BY v.stockQuantity ASC")
    List<ProductVariant> findLowStockVariants();

    @Query("SELECT v FROM ProductVariant v " +
           "JOIN FETCH v.product p " +
           "WHERE v.isActive = true AND (LOWER(v.skuCode) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(v.variantName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<ProductVariant> searchVariants(@Param("keyword") String keyword);
}

