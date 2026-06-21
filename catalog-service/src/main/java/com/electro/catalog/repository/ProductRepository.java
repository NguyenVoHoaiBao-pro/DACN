package com.electro.catalog.repository;

import com.electro.catalog.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {
    
    // Find by isActive field (Boolean in entity)
    List<Product> findByIsActive(Boolean isActive);

    @Query("SELECT p FROM Product p WHERE p.isActive = true")
    List<Product> findByIsActiveTrue();

    @Query("SELECT p FROM Product p "
            + "JOIN FETCH p.productType "
            + "JOIN FETCH p.producer "
            + "WHERE p.isActive = true")
    List<Product> findActiveWithTypeAndProducer();

    @Query(value = "SELECT p FROM Product p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN FETCH p.productType " +
            "JOIN FETCH p.producer " +
            "WHERE p.isActive = true",
            countQuery = "SELECT COUNT(p) FROM Product p WHERE p.isActive = true")
    Page<Product> findActiveProductsPage(Pageable pageable);
    
    List<Product> findByProductTypeIdAndIsActive(Integer productTypeId, Boolean isActive);
    
    List<Product> findByProducerIdAndIsActive(Integer producerId, Boolean isActive);
    
    @Query("SELECT p FROM Product p WHERE p.isActive = true AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Product> findByKeywordAndActive(@Param("keyword") String keyword);
    
    @Query("SELECT p FROM Product p WHERE p.isActive = true AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Product> searchProducts(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE " +
           "LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Product> findByKeyword(@Param("keyword") String keyword);
    
    @Query("SELECT p FROM Product p WHERE p.productType.id = :productTypeId AND p.isActive = true")
    List<Product> findByProductTypeIdAndIsActiveTrue(@Param("productTypeId") Integer productTypeId);
    
    @Query("SELECT p FROM Product p WHERE p.productType.id = :productTypeId AND p.isActive = true")
    Page<Product> findByProductTypeIdAndIsActiveTrue(@Param("productTypeId") Integer productTypeId, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE p.producer.id = :producerId AND p.isActive = true")
    List<Product> findByProducerId(@Param("producerId") Integer producerId);
    
    @Query("SELECT p FROM Product p WHERE p.basePrice BETWEEN :minPrice AND :maxPrice AND p.isActive = true")
    List<Product> findByPriceBetween(@Param("minPrice") Double minPrice, @Param("maxPrice") Double maxPrice);
    
    @Query("SELECT p FROM Product p WHERE p.basePrice BETWEEN :minPrice AND :maxPrice AND p.isActive = true")
    Page<Product> findByPriceBetween(@Param("minPrice") Double minPrice, @Param("maxPrice") Double maxPrice, Pageable pageable);
    
    @Query("SELECT DISTINCT p.producer.name FROM Product p WHERE p.isActive = true")
    List<String> findAllProducerNames();
    
    // Featured products: products manually items marked isFeatured = true
    @Query(value = "SELECT p FROM Product p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN FETCH p.productType " +
            "JOIN FETCH p.producer " +
            "WHERE p.isActive = true AND p.isFeatured = true",
            countQuery = "SELECT COUNT(p) FROM Product p WHERE p.isActive = true AND p.isFeatured = true")
    Page<Product> findFeaturedProductsPage(Pageable pageable);

    // Best sellers: newest active products (sold count lives in order-service)
    @Query(value = "SELECT p FROM Product p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN FETCH p.productType " +
            "JOIN FETCH p.producer " +
            "WHERE p.isActive = true " +
            "ORDER BY p.createdAt DESC",
            countQuery = "SELECT COUNT(p) FROM Product p WHERE p.isActive = true")
    Page<Product> findBestSellingProductsPage(Pageable pageable);

    // ══════════ Admin queries ══════════

    /** Lấy tất cả sản phẩm (kể cả inactive) kèm fetch join */
    @Query(value = "SELECT p FROM Product p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN FETCH p.productType " +
            "JOIN FETCH p.producer",
            countQuery = "SELECT COUNT(p) FROM Product p")
    Page<Product> findAllProducts(Pageable pageable);

    /** Tìm kiếm sản phẩm (admin / Sales) — name, description hoặc SKU biến thể */
    @Query(value = "SELECT DISTINCT p FROM Product p " +
            "LEFT JOIN FETCH p.images " +
            "JOIN FETCH p.productType " +
            "JOIN FETCH p.producer " +
            "LEFT JOIN p.variants v " +
            "WHERE (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "       OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "       OR LOWER(v.skuCode) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:isActive IS NULL OR p.isActive = :isActive) " +
            "AND (:productTypeId IS NULL OR p.productType.id = :productTypeId) " +
            "AND (:producerId IS NULL OR p.producer.id = :producerId)",
            countQuery = "SELECT COUNT(DISTINCT p) FROM Product p " +
            "LEFT JOIN p.variants v " +
            "WHERE (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "       OR LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "       OR LOWER(v.skuCode) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:isActive IS NULL OR p.isActive = :isActive) " +
            "AND (:productTypeId IS NULL OR p.productType.id = :productTypeId) " +
            "AND (:producerId IS NULL OR p.producer.id = :producerId)")
    Page<Product> adminSearchProducts(
            @Param("keyword") String keyword,
            @Param("isActive") Boolean isActive,
            @Param("productTypeId") Integer productTypeId,
            @Param("producerId") Integer producerId,
            Pageable pageable);

    /** Đếm sản phẩm theo trạng thái */
    long countByIsActive(Boolean isActive);
}
