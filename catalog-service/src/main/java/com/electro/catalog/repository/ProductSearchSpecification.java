package com.electro.catalog.repository;

import com.electro.catalog.dto.ProductDto;
import com.electro.catalog.entity.Product;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public final class ProductSearchSpecification {

    private ProductSearchSpecification() {
    }

    public static Specification<Product> buildSearchSpec(ProductDto.SearchRequest request) {
        return (root, query, cb) -> {
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                root.fetch("productType", JoinType.INNER);
                root.fetch("producer", JoinType.INNER);
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("isActive")));

            if (request.getKeyword() != null && !request.getKeyword().isBlank()) {
                String pattern = "%" + request.getKeyword().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                ));
            }
            if (request.getProductTypeId() != null) {
                predicates.add(cb.equal(root.get("productType").get("id"), request.getProductTypeId()));
            }
            if (request.getProducerId() != null) {
                predicates.add(cb.equal(root.get("producer").get("id"), request.getProducerId()));
            }
            if (request.getMinPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("basePrice"), request.getMinPrice()));
            }
            if (request.getMaxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("basePrice"), request.getMaxPrice()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
