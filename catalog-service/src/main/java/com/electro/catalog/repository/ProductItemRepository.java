package com.electro.catalog.repository;

import com.electro.catalog.entity.ProductItem;
import com.electro.catalog.entity.ProductItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductItemRepository extends JpaRepository<ProductItem, Integer> {

    Optional<ProductItem> findByImeiOrSerialNumber(String imei, String serialNumber);

    @Query("SELECT pi FROM ProductItem pi "
            + "JOIN FETCH pi.variant v "
            + "JOIN FETCH v.product p "
            + "WHERE pi.imei = :code OR pi.serialNumber = :code")
    Optional<ProductItem> findDetailedByImeiOrSerial(@Param("code") String code);

    long countByVariant_IdAndStatus(Integer variantId, ProductItemStatus status);

    @Query("SELECT pi.variant.id, COUNT(pi) FROM ProductItem pi "
            + "WHERE pi.variant.id IN :variantIds AND pi.status = :status "
            + "GROUP BY pi.variant.id")
    List<Object[]> countAvailableByVariantIds(
            @Param("variantIds") Collection<Integer> variantIds,
            @Param("status") ProductItemStatus status);
}
