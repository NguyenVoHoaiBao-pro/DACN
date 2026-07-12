package com.electro.catalog.repository;

import com.electro.catalog.entity.StockLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockLotRepository extends JpaRepository<StockLot, Integer> {

    List<StockLot> findByPurchaseOrderIdOrderByReceiveWaveAsc(Integer purchaseOrderId);

    Optional<StockLot> findTopByPurchaseOrderIdOrderByReceiveWaveDesc(Integer purchaseOrderId);

    Optional<StockLot> findByLotNumber(String lotNumber);

    List<StockLot> findByStatusOrderByReceivedAtAsc(StockLot.StockLotStatus status);
}
