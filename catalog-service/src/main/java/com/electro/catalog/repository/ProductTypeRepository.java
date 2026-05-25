package com.electro.catalog.repository;

import com.electro.catalog.entity.ProductType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductTypeRepository extends JpaRepository<ProductType, Integer> {

    @Query("SELECT pt FROM ProductType pt WHERE pt.isActive = true")
    Page<ProductType> findAllActive(Pageable pageable);

    @Query("SELECT pt FROM ProductType pt WHERE pt.isActive = true ORDER BY pt.displayOrder ASC")
    List<ProductType> findAllActive();

    @Query("SELECT pt FROM ProductType pt WHERE pt.isActive = true AND pt.parent IS NULL ORDER BY pt.displayOrder ASC")
    List<ProductType> findRootCategories();

    Optional<ProductType> findByCode(String code);

    boolean existsByCode(String code);

    List<ProductType> findByParentId(Integer parentId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.productType.id = :productTypeId AND p.isActive = true")
    Long countProductsByProductTypeId(@Param("productTypeId") Integer productTypeId);

    @Query("SELECT pt FROM ProductType pt WHERE pt.isActive = true AND LOWER(pt.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<ProductType> searchByName(@Param("keyword") String keyword, Pageable pageable);
}
