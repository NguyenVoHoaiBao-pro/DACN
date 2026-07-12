package com.electro.catalog.repository;

import com.electro.catalog.entity.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ImageRepository extends JpaRepository<Image, Integer> {

    List<Image> findByProductId(Integer productId);

    @Query("SELECT i FROM Image i LEFT JOIN FETCH i.variant WHERE i.product.id IN :productIds")
    List<Image> findByProductIdIn(@Param("productIds") Collection<Integer> productIds);

    void deleteByProductId(Integer productId);
}
