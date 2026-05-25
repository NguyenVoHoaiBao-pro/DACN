package com.electro.catalog.repository;

import com.electro.catalog.entity.ProductItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductItemRepository extends JpaRepository<ProductItem, Integer> {

    Optional<ProductItem> findByImeiOrSerialNumber(String imei, String serialNumber);
}
