package com.electro.catalog.repository;

import com.electro.catalog.entity.ProductReturnSlip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductReturnSlipRepository extends JpaRepository<ProductReturnSlip, Integer> {

    List<ProductReturnSlip> findByStatusOrderByCreatedAtDesc(ProductReturnSlip.SlipStatus status);

    List<ProductReturnSlip> findAllByOrderByCreatedAtDesc();

    Optional<ProductReturnSlip> findFirstBySerialNumberAndStatus(
            String serialNumber, ProductReturnSlip.SlipStatus status);

    Optional<ProductReturnSlip> findBySlipCode(String slipCode);
}
