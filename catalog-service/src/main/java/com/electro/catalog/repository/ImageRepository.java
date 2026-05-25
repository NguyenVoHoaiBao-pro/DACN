package com.electro.catalog.repository;

import com.electro.catalog.entity.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImageRepository extends JpaRepository<Image, Integer> {

    List<Image> findByProductId(Integer productId);

    void deleteByProductId(Integer productId);
}
