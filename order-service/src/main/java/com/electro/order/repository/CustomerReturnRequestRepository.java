package com.electro.order.repository;

import com.electro.order.entity.CustomerReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerReturnRequestRepository extends JpaRepository<CustomerReturnRequest, Integer> {

    List<CustomerReturnRequest> findByUserIdOrderByCreatedAtDesc(Integer userId);

    List<CustomerReturnRequest> findByStatusOrderByCreatedAtDesc(CustomerReturnRequest.RequestStatus status);

    List<CustomerReturnRequest> findAllByOrderByCreatedAtDesc();

    Optional<CustomerReturnRequest> findFirstBySerialNumberAndStatusIn(
            String serialNumber, List<CustomerReturnRequest.RequestStatus> statuses);

    boolean existsBySerialNumberAndStatusIn(
            String serialNumber, List<CustomerReturnRequest.RequestStatus> statuses);

    List<CustomerReturnRequest> findByOrderIdOrderByCreatedAtDesc(Integer orderId);

    long countByStatus(CustomerReturnRequest.RequestStatus status);

    long countByStatusIn(java.util.Collection<CustomerReturnRequest.RequestStatus> statuses);
}
