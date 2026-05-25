package com.electro.catalog.repository;

import com.electro.catalog.entity.Producer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProducerRepository extends JpaRepository<Producer, Integer>, JpaSpecificationExecutor<Producer> {
    
    Optional<Producer> findByCode(String code);
    
    Optional<Producer> findByName(String name);
    
    boolean existsByCode(String code);
    
    boolean existsByName(String name);

    Page<Producer> findByNameContainingIgnoreCaseOrCodeContainingIgnoreCase(String name, String code, Pageable pageable);
    
    Page<Producer> findByIsActiveAndNameContainingIgnoreCaseOrIsActiveAndCodeContainingIgnoreCase(
            Boolean isActive1, String name, Boolean isActive2, String code, Pageable pageable);
}
