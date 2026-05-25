package com.electro.catalog.repository;

import com.electro.catalog.entity.ProductSpecification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductSpecificationRepository extends JpaRepository<ProductSpecification, Integer> {

    List<ProductSpecification> findByProductId(Integer productId);

    void deleteByProductId(Integer productId);
}

