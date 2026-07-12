package com.electro.catalog.service;

import com.electro.catalog.client.OrderStatisticsClient;
import com.electro.catalog.dto.ProductDto;
import com.electro.catalog.entity.Product;
import com.electro.catalog.entity.ProductType;
import com.electro.catalog.entity.Producer;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.ProductRepository;
import com.electro.catalog.repository.ProductTypeRepository;
import com.electro.catalog.repository.ProducerRepository;
import com.electro.catalog.repository.ProductVariantRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductTypeRepository productTypeRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Autowired
    private com.electro.catalog.repository.AttributeValueRepository attributeValueRepository;

    @Autowired
    private com.electro.catalog.repository.ImageRepository imageRepository;

    @Autowired
    private com.electro.catalog.repository.ProductItemRepository productItemRepository;

    @Autowired
    private com.electro.catalog.repository.ProductSpecificationRepository productSpecificationRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private OrderStatisticsClient orderStatisticsClient;

    @org.springframework.beans.factory.annotation.Value("${app.server.url:http://localhost:8080}")
    private String serverUrl;

    @Cacheable(value = "productListPages", key = "'all:' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<ProductDto.Response> getAllProducts(Pageable pageable) {
        return mapProductPage(productRepository.findActiveProductsPage(pageable));
    }

    public ProductDto.Response getProductById(Long id) {
        Product product = productRepository.findById(id.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        Long soldQuantity = fetchSoldQuantity(product.getId());
        return mapToResponse(product, soldQuantity);
    }

    public ProductDto.Response getProductBySku(String sku) {
        com.electro.catalog.entity.ProductVariant variant = productVariantRepository.findBySkuCode(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "sku", sku));

        Product product = variant.getProduct();
        if (product == null
                || !Boolean.TRUE.equals(product.getIsActive())
                || !Boolean.TRUE.equals(variant.getIsActive())) {
            throw new ResourceNotFoundException("Product", "sku", sku);
        }
        return mapToResponse(product);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.Response createProduct(ProductDto.CreateRequest createRequest) {
        ProductType productType = productTypeRepository.findById(createRequest.getProductTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductType", "id", createRequest.getProductTypeId()));
        
        Producer producer = producerRepository.findById(createRequest.getProducerId())
                .orElseThrow(() -> new ResourceNotFoundException("Producer", "id", createRequest.getProducerId()));

        Product product = new Product();
        product.setName(createRequest.getName());
        if (createRequest.getPrice() != null) {
            product.setBasePrice(java.math.BigDecimal.valueOf(createRequest.getPrice()));
        }
        product.setDescription(createRequest.getDetail());
        product.setIsActive(true); // Active
        product.setProductType(productType);
        product.setProducer(producer);
        if (createRequest.getIsFeatured() != null) {
            product.setIsFeatured(createRequest.getIsFeatured());
        }
        
        // Create a default variant to hold the initial quantity and price
        java.util.List<com.electro.catalog.entity.ProductVariant> variants = new java.util.ArrayList<>();
        com.electro.catalog.entity.ProductVariant variant = new com.electro.catalog.entity.ProductVariant();
        variant.setProduct(product);
        variant.setVariantName("Default");
        variant.setSkuCode("SKU-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        variant.setPrice(product.getBasePrice() != null ? product.getBasePrice() : java.math.BigDecimal.ZERO);
        variant.setStockQuantity(createRequest.getQuantity() != null ? createRequest.getQuantity() : 0);
        variant.setIsDefault(true);
        variant.setIsActive(true);
        variants.add(variant);
        product.setVariants(variants);

        Product savedProduct = productRepository.save(product);
        return mapToResponse(savedProduct);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.Response updateProduct(Long id, ProductDto.UpdateRequest updateRequest) {
        Product product = productRepository.findById(id.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        if (updateRequest.getName() != null) {
            product.setName(updateRequest.getName());
        }
        if (updateRequest.getPrice() != null) {
            product.setBasePrice(java.math.BigDecimal.valueOf(updateRequest.getPrice()));
            if (product.getVariants() != null) {
                product.getVariants().stream()
                        .filter(v -> v.getIsDefault() != null && v.getIsDefault())
                        .findFirst()
                        .ifPresent(v -> v.setPrice(java.math.BigDecimal.valueOf(updateRequest.getPrice())));
            }
        }
        if (updateRequest.getQuantity() != null) {
            if (product.getVariants() != null) {
                product.getVariants().stream()
                        .filter(v -> v.getIsDefault() != null && v.getIsDefault())
                        .findFirst()
                        .ifPresent(v -> v.setStockQuantity(updateRequest.getQuantity()));
            }
        }
        if (updateRequest.getStatus() != null) {
             product.setIsActive("1".equals(updateRequest.getStatus()) || "Active".equalsIgnoreCase(updateRequest.getStatus()));
        }
        if (updateRequest.getDetail() != null) {
            product.setDescription(updateRequest.getDetail());
        }
        if (updateRequest.getProductTypeId() != null) {
            ProductType productType = productTypeRepository.findById(updateRequest.getProductTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("ProductType", "id", updateRequest.getProductTypeId()));
            product.setProductType(productType);
        }
        if (updateRequest.getProducerId() != null) {
            Producer producer = producerRepository.findById(updateRequest.getProducerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producer", "id", updateRequest.getProducerId()));
            product.setProducer(producer);
        }
        
        if (updateRequest.getIsFeatured() != null) {
            product.setIsFeatured(updateRequest.getIsFeatured());
        }

        Product updatedProduct = productRepository.save(product);
        return mapToResponse(updatedProduct);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        product.setIsActive(false); // Set as inactive
        productRepository.save(product);
    }

    public Page<ProductDto.Response> getFeaturedProducts(Pageable pageable) {
        return mapProductPage(productRepository.findFeaturedProductsPage(pageable));
    }

    public Page<ProductDto.Response> getBestSellingProducts(Pageable pageable) {
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();
        int fetchLimit = Math.max((page + 1) * size * 2, 100);

        List<Map<String, Object>> topRows;
        long totalSoldProducts;
        try {
            topRows = orderStatisticsClient.getTopProductsByProduct(fetchLimit);
            Map<String, Long> countResponse = orderStatisticsClient.getSoldProductsCount();
            totalSoldProducts = countResponse != null && countResponse.get("count") != null
                    ? countResponse.get("count") : 0L;
        } catch (Exception e) {
            return Page.empty(pageable);
        }

        if (topRows == null || topRows.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Integer> orderedIds = new ArrayList<>();
        Map<Integer, Long> soldByProduct = new LinkedHashMap<>();
        for (Map<String, Object> row : topRows) {
            Integer productId = toInt(row.get("productId"));
            Long quantitySold = toLong(row.get("quantitySold"));
            if (productId != null && !soldByProduct.containsKey(productId)) {
                orderedIds.add(productId);
                soldByProduct.put(productId, quantitySold != null ? quantitySold : 0L);
            }
        }

        Map<Integer, Product> productMap = productRepository.findActiveProductsByIds(orderedIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a, HashMap::new));

        List<Integer> activeIds = orderedIds.stream().filter(productMap::containsKey).toList();
        Map<Integer, List<com.electro.catalog.entity.ProductVariant>> variantsByProduct =
                groupVariantsByProductId(productVariantRepository.findActiveByProductIds(activeIds));
        Map<Integer, List<com.electro.catalog.entity.Image>> imagesByProduct =
                groupImagesByProductId(imageRepository.findByProductIdIn(activeIds));

        List<ProductDto.Response> ranked = orderedIds.stream()
                .filter(productMap::containsKey)
                .map(id -> mapToResponse(
                        productMap.get(id),
                        variantsByProduct.getOrDefault(id, List.of()),
                        imagesByProduct.getOrDefault(id, List.of()),
                        soldByProduct.get(id)))
                .collect(Collectors.toList());

        int fromIndex = page * size;
        if (fromIndex >= ranked.size()) {
            return new PageImpl<>(List.of(), pageable, totalSoldProducts);
        }
        int toIndex = Math.min(fromIndex + size, ranked.size());
        List<ProductDto.Response> pageContent = ranked.subList(fromIndex, toIndex);
        return new PageImpl<>(pageContent, pageable, totalSoldProducts);
    }

    public Page<ProductDto.Response> searchProducts(ProductDto.SearchRequest searchRequest) {
        Sort sort = createSort(searchRequest.getSortBy(), searchRequest.getSortDir());
        Pageable pageable = PageRequest.of(searchRequest.getPage(), searchRequest.getSize(), sort);

        org.springframework.data.jpa.domain.Specification<Product> spec =
                com.electro.catalog.repository.ProductSearchSpecification.buildSearchSpec(searchRequest);
        return mapProductPage(productRepository.findAll(spec, pageable));
    }

    public List<ProductDto.AutocompleteItem> suggestProducts(String keyword, Integer productTypeId, int limit) {
        if (keyword == null || keyword.trim().length() < 2) {
            return List.of();
        }
        int capped = Math.min(Math.max(limit, 1), 20);
        ProductDto.SearchRequest searchRequest = new ProductDto.SearchRequest();
        searchRequest.setKeyword(keyword.trim());
        searchRequest.setProductTypeId(productTypeId);
        searchRequest.setPage(0);
        searchRequest.setSize(capped);
        searchRequest.setSortBy("name");
        searchRequest.setSortDir("asc");

        return searchProducts(searchRequest).getContent().stream()
                .map(this::mapToAutocompleteItem)
                .collect(java.util.stream.Collectors.toList());
    }

    private ProductDto.AutocompleteItem mapToAutocompleteItem(ProductDto.Response product) {
        String imageUrl = null;
        if (product.getImages() != null && !product.getImages().isEmpty()) {
            imageUrl = product.getImages().get(0).getLinkImage();
        }
        String categoryName = product.getProductType() != null ? product.getProductType().getName() : null;
        return new ProductDto.AutocompleteItem(
                product.getId(),
                product.getName(),
                product.getPrice(),
                imageUrl,
                categoryName);
    }

    public Page<ProductDto.Response> getProductsByCategory(Long categoryId, Pageable pageable) {
        return mapProductPage(productRepository.findByProductTypeIdAndIsActiveTrue(categoryId.intValue(), pageable));
    }

    public List<ProductDto.VariantDto> getVariantsByProductId(Long productId) {
        // Verify product exists
        productRepository.findById(productId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        return productVariantRepository.findByProductId(productId.intValue())
                .stream()
                .filter(v -> v.getIsActive() != null && v.getIsActive()) // Bắt buộc lọc để Public API không lộ variant đã ngưng bán
                .map(this::mapVariantToDto)
                .collect(java.util.stream.Collectors.toList());
    }

    private ProductDto.VariantDto mapVariantToDto(com.electro.catalog.entity.ProductVariant variant) {
        return mapVariantToDto(variant, java.util.Collections.emptyMap());
    }

    private ProductDto.VariantDto mapVariantToDto(
            com.electro.catalog.entity.ProductVariant variant,
            java.util.Map<Integer, Integer> availableByVariantId) {
        ProductDto.VariantDto vDto = new ProductDto.VariantDto();
        vDto.setId(variant.getId());
        if (variant.getProduct() != null) {
            vDto.setProductId(variant.getProduct().getId());
            vDto.setProductName(variant.getProduct().getName());
        }
        vDto.setSkuCode(variant.getSkuCode());
        vDto.setVariantName(variant.getVariantName());
        vDto.setPrice(variant.getPrice() != null ? variant.getPrice().doubleValue() : 0.0);
        vDto.setOriginalPrice(variant.getOriginalPrice() != null ? variant.getOriginalPrice().doubleValue() : null);
        vDto.setStockQuantity(variant.getStockQuantity());
        vDto.setAvailableQuantity(availableByVariantId.getOrDefault(variant.getId(), 0));
        vDto.setIsActive(variant.getIsActive());
        vDto.setIsDefault(variant.getIsDefault());

        if (variant.getAttributeValues() != null) {
            java.util.List<ProductDto.AttributeValueResponse> attrValues = new java.util.ArrayList<>();
            for (var attr : variant.getAttributeValues()) {
                ProductDto.AttributeValueResponse avResponse = new ProductDto.AttributeValueResponse();
                avResponse.setId(attr.getId());
                if (attr.getAttribute() != null) {
                    avResponse.setAttributeName(attr.getAttribute().getName());
                }
                avResponse.setValue(attr.getValue());
                attrValues.add(avResponse);
            }
            vDto.setAttributeValues(attrValues);
        }
        return vDto;
    }

    private java.util.Map<Integer, Integer> loadAvailableCounts(java.util.List<Integer> variantIds) {
        if (variantIds == null || variantIds.isEmpty()) {
            return java.util.Collections.emptyMap();
        }
        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();
        for (Object[] row : productItemRepository.countAvailableByVariantIds(
                variantIds, com.electro.catalog.entity.ProductItemStatus.AVAILABLE)) {
            map.put((Integer) row[0], ((Number) row[1]).intValue());
        }
        return map;
    }

    private java.util.List<ProductDto.SpecificationResponse> mapSpecifications(Integer productId) {
        return productSpecificationRepository.findByProductId(productId).stream()
                .map(ps -> {
                    ProductDto.SpecificationResponse spec = new ProductDto.SpecificationResponse();
                    if (ps.getSpecification() != null) {
                        spec.setCategoryName(ps.getSpecification().getCategoryName());
                        spec.setName(ps.getSpecification().getName());
                        spec.setCode(ps.getSpecification().getCode());
                        spec.setUnit(ps.getSpecification().getUnit());
                    }
                    spec.setValue(ps.getValue());
                    return spec;
                })
                .sorted(java.util.Comparator.comparing(
                        s -> s.getCategoryName() != null ? s.getCategoryName() : "",
                        java.util.Comparator.naturalOrder()))
                .toList();
    }

    private String resolveWarrantyPolicy(java.util.List<ProductDto.SpecificationResponse> specs) {
        if (specs != null) {
            for (ProductDto.SpecificationResponse spec : specs) {
                if ("WARRANTY".equalsIgnoreCase(spec.getCode()) && spec.getValue() != null && !spec.getValue().isBlank()) {
                    return spec.getValue();
                }
            }
        }
        return "12 tháng (chính sách mặc định)";
    }

    public Page<ProductDto.Response> getProductsByBrand(String brand, Pageable pageable) {
        // Converting brand string to producer ID for now
        // This is a temporary solution until proper brand management is implemented
        try {
            Integer producerId = Integer.parseInt(brand);
            List<Product> products = productRepository.findByProducerId(producerId);
            return mapProductPage(productRepository.findActiveProductsPage(pageable));
        } catch (NumberFormatException e) {
            return mapProductPage(productRepository.findActiveProductsPage(pageable));
        }
    }

    public List<String> getAllBrands() {
        return productRepository.findAllProducerNames();
    }

    public void updateStock(Long productId, Integer quantity) {
        Product product = productRepository.findById(productId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
            com.electro.catalog.entity.ProductVariant defaultVariant = product.getVariants().stream()
                    .filter(v -> v.getIsDefault() != null && v.getIsDefault())
                    .findFirst()
                    .orElse(product.getVariants().get(0));

            if (defaultVariant.getStockQuantity() < quantity) {
                throw new BadRequestException("Insufficient stock. Available: " + defaultVariant.getStockQuantity());
            }

            defaultVariant.setStockQuantity(defaultVariant.getStockQuantity() - quantity);
            productRepository.save(product);
        } else {
            throw new BadRequestException("Product has no variants. Cannot update stock.");
        }
    }

    private Page<ProductDto.Response> mapProductPage(Page<Product> page) {
        if (page.isEmpty()) {
            return new PageImpl<>(List.of(), page.getPageable(), page.getTotalElements());
        }

        List<Integer> productIds = page.getContent().stream().map(Product::getId).toList();
        Map<Integer, List<com.electro.catalog.entity.ProductVariant>> variantsByProduct =
                groupVariantsByProductId(productVariantRepository.findActiveByProductIds(productIds));
        Map<Integer, List<com.electro.catalog.entity.Image>> imagesByProduct =
                groupImagesByProductId(imageRepository.findByProductIdIn(productIds));

        List<ProductDto.Response> content = page.getContent().stream()
                .map(product -> mapToResponse(
                        product,
                        variantsByProduct.getOrDefault(product.getId(), List.of()),
                        imagesByProduct.getOrDefault(product.getId(), List.of()),
                        null))
                .toList();
        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }

    private Map<Integer, List<com.electro.catalog.entity.ProductVariant>> groupVariantsByProductId(
            List<com.electro.catalog.entity.ProductVariant> variants) {
        if (variants == null || variants.isEmpty()) {
            return Map.of();
        }
        return variants.stream()
                .collect(Collectors.groupingBy(v -> v.getProduct().getId()));
    }

    private Map<Integer, List<com.electro.catalog.entity.Image>> groupImagesByProductId(
            List<com.electro.catalog.entity.Image> images) {
        if (images == null || images.isEmpty()) {
            return Map.of();
        }
        return images.stream()
                .collect(Collectors.groupingBy(img -> img.getProduct().getId()));
    }

    private ProductDto.Response mapToResponse(Product product) {
        return mapToResponse(product, null);
    }

    private ProductDto.Response mapToResponse(Product product, Long soldQuantity) {
        return mapToResponse(product, null, null, soldQuantity);
    }

    private ProductDto.Response mapToResponse(
            Product product,
            List<com.electro.catalog.entity.ProductVariant> preloadedVariants,
            List<com.electro.catalog.entity.Image> preloadedImages,
            Long soldQuantity) {
        ProductDto.Response response = modelMapper.map(product, ProductDto.Response.class);
        
        response.setPrice(product.getBasePrice() != null ? product.getBasePrice().doubleValue() : 0.0);
        response.setDetail(product.getDescription());
        response.setStatus(product.getIsActive() != null && product.getIsActive() ? "1" : "0");
        response.setActive(product.getIsActive() != null && product.getIsActive() ? 1 : 0);
        response.setImportDate(product.getCreatedAt() != null ? product.getCreatedAt().toLocalDate() : null);
        
        response.setSoldQuantity(soldQuantity != null ? soldQuantity.intValue() : 0);
        
        java.util.List<com.electro.catalog.entity.ProductVariant> variantSource =
                preloadedVariants != null ? preloadedVariants : product.getVariants();
        java.util.List<com.electro.catalog.entity.Image> imageSource =
                preloadedImages != null ? preloadedImages : product.getImages();

        // Lọc chỉ lấy variant đang active (Public API không hiển thị variant đã bị vô hiệu hóa)
        java.util.Set<Integer> activeVariantIds = new java.util.HashSet<>();
        if (variantSource != null && !variantSource.isEmpty()) {
            for (var variant : variantSource) {
                if (variant.getIsActive() != null && variant.getIsActive()) {
                    activeVariantIds.add(variant.getId());
                }
            }
        }

        int totalQuantity = 0;
        if (variantSource != null && !variantSource.isEmpty()) {
            totalQuantity = variantSource.stream()
                    .filter(v -> v.getIsActive() != null && v.getIsActive())
                    .mapToInt(v -> v.getStockQuantity() != null ? v.getStockQuantity() : 0)
                    .sum();
        }
        response.setQuantity(totalQuantity);

        // Calculate average rating and review count
        // This would be implemented when Review functionality is added
        response.setAverageRating(0.0);
        response.setReviewCount(0);
        
        // Map images: CHỈ trả ảnh chung (variant_id = null) hoặc ảnh thuộc variant ACTIVE
        if (imageSource != null && !imageSource.isEmpty()) {
            java.util.List<ProductDto.ImageDto> imgs = new java.util.ArrayList<>();
            for (var img : imageSource) {
                Integer imgVariantId = img.getVariant() != null ? img.getVariant().getId() : null;
                
                // Chỉ trả ảnh nếu: (1) ảnh chung (variant_id = null) hoặc (2) variant đang active
                if (imgVariantId == null || activeVariantIds.contains(imgVariantId)) {
                    ProductDto.ImageDto imgDto = new ProductDto.ImageDto();
                    imgDto.setId(img.getId());
                    imgDto.setLinkImage(resolveImageLink(img));
                    imgDto.setVariantId(imgVariantId);
                    imgs.add(imgDto);
                }
            }
            response.setImages(imgs);
        }
        
        // Map variants — CHỈ trả variant ACTIVE cho Public API
        if (variantSource != null && !variantSource.isEmpty()) {
            java.util.List<ProductDto.VariantDto> variantDtos = new java.util.ArrayList<>();
            for (var variant : variantSource) {
                // Lọc variant inactive — khách hàng KHÔNG thấy variant đã ngưng bán
                if (variant.getIsActive() == null || !variant.getIsActive()) {
                    continue;
                }
                ProductDto.VariantDto vDto = new ProductDto.VariantDto();
                vDto.setId(variant.getId());
                vDto.setProductId(product.getId());
                vDto.setProductName(product.getName());
                vDto.setSkuCode(variant.getSkuCode());
                vDto.setVariantName(variant.getVariantName());
                vDto.setPrice(variant.getPrice() != null ? variant.getPrice().doubleValue() : 0.0);
                vDto.setOriginalPrice(variant.getOriginalPrice() != null ? variant.getOriginalPrice().doubleValue() : null);
                vDto.setStockQuantity(variant.getStockQuantity());
                vDto.setIsActive(variant.getIsActive());
                vDto.setIsDefault(variant.getIsDefault());
                
                // Map structured attribute values (Color, Storage, etc.)
                if (variant.getAttributeValues() != null) {
                    java.util.List<ProductDto.AttributeValueResponse> attrValues = new java.util.ArrayList<>();
                    for (var attr : variant.getAttributeValues()) {
                        ProductDto.AttributeValueResponse avResponse = new ProductDto.AttributeValueResponse();
                        avResponse.setId(attr.getId());
                        if (attr.getAttribute() != null) {
                            avResponse.setAttributeName(attr.getAttribute().getName());
                        }
                        avResponse.setValue(attr.getValue());
                        attrValues.add(avResponse);
                    }
                    vDto.setAttributeValues(attrValues);
                }
                
                variantDtos.add(vDto);
            }
            response.setVariants(variantDtos);
            
            // Group attributes for selection UI (Options) — chỉ từ variant active
            java.util.Map<String, java.util.Set<String>> groupedOptions = new java.util.HashMap<>();
            for (var vDto : variantDtos) {
                if (vDto.getAttributeValues() != null) {
                    for (var attr : vDto.getAttributeValues()) {
                        groupedOptions.computeIfAbsent(attr.getAttributeName(), k -> new java.util.LinkedHashSet<>())
                                      .add(attr.getValue());
                    }
                }
            }
            
            java.util.List<ProductDto.ProductOptionDto> options = new java.util.ArrayList<>();
            groupedOptions.forEach((name, values) -> {
                options.add(new ProductDto.ProductOptionDto(name, new java.util.ArrayList<>(values)));
            });
            response.setOptions(options);
        }
        
        return response;
    }

    private Sort createSort(String sortBy, String sortDir) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? 
                                 Sort.Direction.DESC : Sort.Direction.ASC;
        
        return switch (sortBy.toLowerCase()) {
            case "price" -> Sort.by(direction, "basePrice");
            case "importdate" -> Sort.by(direction, "createdAt");
            case "name" -> Sort.by(direction, "name");
            default -> Sort.by(direction, "name");
        };
    }

    // --- ADMIN METHODS STUBS ---
    // TODO: These methods were referenced by AdminProductController but were missing.
    // They need proper implementation!
    
    public Page<ProductDto.AdminProductListResponse> adminGetAllProducts(String keyword, Boolean isActive, Integer productTypeId, Integer producerId, Pageable pageable) {
        Page<Product> products = productRepository.adminSearchProducts(keyword, isActive, productTypeId, producerId, pageable);
        return products.map(product -> {
            ProductDto.AdminProductListResponse response = modelMapper.map(product, ProductDto.AdminProductListResponse.class);
            response.setBasePrice(product.getBasePrice() != null ? product.getBasePrice().doubleValue() : 0.0);
            response.setStatus(product.getIsActive() != null && product.getIsActive() ? "ACTIVE" : "INACTIVE");
            response.setCreatedAt(product.getCreatedAt() != null ? product.getCreatedAt().toLocalDate() : null);
            
            if (product.getImages() != null && !product.getImages().isEmpty()) {
                com.electro.catalog.entity.Image primaryImage = product.getImages().stream()
                        .filter(img -> img.getIsPrimary() != null && img.getIsPrimary())
                        .findFirst()
                        .orElse(product.getImages().get(0));
                response.setImageUrl(resolveImageLink(primaryImage));
            }
            
            int totalQuantity = 0;
            int totalAvailable = 0;
            if (product.getVariants() != null) {
                java.util.List<Integer> variantIds = product.getVariants().stream()
                        .map(com.electro.catalog.entity.ProductVariant::getId)
                        .toList();
                java.util.Map<Integer, Integer> availableMap = loadAvailableCounts(variantIds);
                for (var v : product.getVariants()) {
                    totalQuantity += v.getStockQuantity() != null ? v.getStockQuantity() : 0;
                    if (Boolean.TRUE.equals(v.getIsActive())) {
                        totalAvailable += availableMap.getOrDefault(v.getId(), 0);
                    }
                }
            }
            response.setTotalQuantity(totalQuantity);
            response.setTotalAvailableQuantity(totalAvailable);
            return response;
        });
    }

    public ProductDto.AdminProductResponse adminGetProductById(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        ProductDto.AdminProductResponse response = modelMapper.map(product, ProductDto.AdminProductResponse.class);
        response.setBasePrice(product.getBasePrice() != null ? product.getBasePrice().doubleValue() : 0.0);
        response.setStatus(product.getIsActive() != null && product.getIsActive() ? "ACTIVE" : "INACTIVE");
        response.setCreatedAt(product.getCreatedAt() != null ? product.getCreatedAt().toLocalDate() : null);
        response.setRequiresImei(product.getRequiresImei());

        java.util.List<ProductDto.SpecificationResponse> specs = mapSpecifications(id);
        response.setSpecifications(specs);
        response.setWarrantyPolicy(resolveWarrantyPolicy(specs));

        if (product.getImages() != null && !product.getImages().isEmpty()) {
            java.util.List<ProductDto.ImageDto> imgs = new java.util.ArrayList<>();
            for (var img : product.getImages()) {
                ProductDto.ImageDto imgDto = new ProductDto.ImageDto();
                imgDto.setId(img.getId());
                imgDto.setLinkImage(resolveImageLink(img));
                imgDto.setVariantId(img.getVariant() != null ? img.getVariant().getId() : null);
                imgs.add(imgDto);
            }
            response.setImages(imgs);
        }

        java.util.List<com.electro.catalog.entity.ProductVariant> variants =
                productVariantRepository.findByProductId(id);
        if (variants != null && !variants.isEmpty()) {
            java.util.List<Integer> variantIds = variants.stream()
                    .map(com.electro.catalog.entity.ProductVariant::getId)
                    .toList();
            java.util.Map<Integer, Integer> availableMap = loadAvailableCounts(variantIds);
            java.util.List<ProductDto.VariantDto> variantDtos = new java.util.ArrayList<>();
            for (var variant : variants) {
                variantDtos.add(mapVariantToDto(variant, availableMap));
            }
            response.setVariants(variantDtos);
        }

        return response;
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminCreateProduct(ProductDto.AdminCreateRequest request) {
        ProductType productType = productTypeRepository.findById(request.getProductTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("ProductType", "id", request.getProductTypeId()));
        Producer producer = producerRepository.findById(request.getProducerId())
                .orElseThrow(() -> new ResourceNotFoundException("Producer", "id", request.getProducerId()));

        Product product = new Product();
        product.setName(request.getName());
        product.setBasePrice(java.math.BigDecimal.valueOf(request.getPrice()));
        product.setDescription(request.getDetail());
        product.setIsActive("ACTIVE".equalsIgnoreCase(request.getStatus()));
        product.setProductType(productType);
        product.setProducer(producer);
        if (request.getIsFeatured() != null) {
            product.setIsFeatured(request.getIsFeatured());
        }
        
        java.util.List<com.electro.catalog.entity.ProductVariant> variants = new java.util.ArrayList<>();
        com.electro.catalog.entity.ProductVariant variant = new com.electro.catalog.entity.ProductVariant();
        variant.setProduct(product);
        variant.setVariantName("Mặc định");
        variant.setSkuCode("SKU-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        variant.setPrice(product.getBasePrice() != null ? product.getBasePrice() : java.math.BigDecimal.ZERO);
        variant.setStockQuantity(request.getQuantity() != null ? request.getQuantity() : 0);
        variant.setIsDefault(true);
        variant.setIsActive(true);
        variants.add(variant);
        product.setVariants(variants);

        Product savedProduct = productRepository.save(product);
        return adminGetProductById(savedProduct.getId());
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminUpdateProduct(Integer id, ProductDto.AdminUpdateRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        if (request.getName() != null) product.setName(request.getName());
        if (request.getPrice() != null) product.setBasePrice(java.math.BigDecimal.valueOf(request.getPrice()));
        if (request.getDetail() != null) product.setDescription(request.getDetail());
        if (request.getStatus() != null) product.setIsActive("ACTIVE".equalsIgnoreCase(request.getStatus()));
        if (request.getIsFeatured() != null) product.setIsFeatured(request.getIsFeatured());
        
        if (request.getProductTypeId() != null) {
            ProductType productType = productTypeRepository.findById(request.getProductTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("ProductType", "id", request.getProductTypeId()));
            product.setProductType(productType);
        }
        if (request.getProducerId() != null) {
            Producer producer = producerRepository.findById(request.getProducerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producer", "id", request.getProducerId()));
            product.setProducer(producer);
        }
        Product savedProduct = productRepository.save(product);
        return adminGetProductById(savedProduct.getId());
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public void adminDeleteProduct(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        product.setIsActive(false);
        productRepository.save(product);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminToggleStatus(Integer id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        product.setIsActive(product.getIsActive() == null || !product.getIsActive());
        productRepository.save(product);
        return adminGetProductById(id);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminAddVariant(Integer id, ProductDto.AdminVariantRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        com.electro.catalog.entity.ProductVariant variant = new com.electro.catalog.entity.ProductVariant();
        variant.setProduct(product);
        if (request.getSkuCode() != null) variant.setSkuCode(request.getSkuCode());
        if (request.getVariantName() != null) variant.setVariantName(request.getVariantName());
        if (request.getPrice() != null) variant.setPrice(java.math.BigDecimal.valueOf(request.getPrice()));
        if (request.getOriginalPrice() != null) variant.setOriginalPrice(java.math.BigDecimal.valueOf(request.getOriginalPrice()));
        variant.setStockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0);
        variant.setIsDefault(request.getIsDefault() != null ? request.getIsDefault() : false);
        variant.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        
        if (request.getAttributeValueIds() != null && !request.getAttributeValueIds().isEmpty()) {
            java.util.List<com.electro.catalog.entity.AttributeValue> attributes = attributeValueRepository.findAllById(request.getAttributeValueIds());
            variant.setAttributeValues(attributes);
        }
        
        productVariantRepository.save(variant);
        return adminGetProductById(id);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminUpdateVariant(Integer productId, Integer variantId, ProductDto.AdminVariantRequest request) {
        com.electro.catalog.entity.ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Variant", "id", variantId));
        if (request.getSkuCode() != null) variant.setSkuCode(request.getSkuCode());
        if (request.getVariantName() != null) variant.setVariantName(request.getVariantName());
        if (request.getPrice() != null) variant.setPrice(java.math.BigDecimal.valueOf(request.getPrice()));
        if (request.getOriginalPrice() != null) variant.setOriginalPrice(java.math.BigDecimal.valueOf(request.getOriginalPrice()));
        if (request.getStockQuantity() != null) variant.setStockQuantity(request.getStockQuantity());
        if (request.getIsDefault() != null) variant.setIsDefault(request.getIsDefault());
        if (request.getIsActive() != null) variant.setIsActive(request.getIsActive());
        
        if (request.getAttributeValueIds() != null) {
            java.util.List<com.electro.catalog.entity.AttributeValue> attributes = attributeValueRepository.findAllById(request.getAttributeValueIds());
            variant.setAttributeValues(attributes);
        }
        
        productVariantRepository.save(variant);
        return adminGetProductById(productId);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminDeleteVariant(Integer productId, Integer variantId) {
        com.electro.catalog.entity.ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Variant", "id", variantId));
        
        // Soft Delete: Vô hiệu hóa variant thay vì xóa cứng
        // Lý do: Bảo toàn lịch sử đơn hàng, bảo hành, giao dịch kho
        variant.setIsActive(false);
        productVariantRepository.save(variant);
        return adminGetProductById(productId);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminAddImage(Integer id, ProductDto.AdminImageRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        com.electro.catalog.entity.Image image = new com.electro.catalog.entity.Image();
        image.setProduct(product);
        if (request.getVariantId() != null) {
            com.electro.catalog.entity.ProductVariant variant = productVariantRepository.findById(request.getVariantId())
                    .orElse(null);
            image.setVariant(variant);
        }
        image.setImageUrl(request.getLinkImage());
        image.setIsPrimary(request.getIsDefault() != null ? request.getIsDefault() : false);
        
        product.getImages().add(image);
        productRepository.save(product);
        return adminGetProductById(id);
    }

    @CacheEvict(value = "productListPages", allEntries = true)
    public ProductDto.AdminProductResponse adminDeleteImage(Integer productId, Integer imageId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        com.electro.catalog.entity.Image imageToDelete = null;
        if (product.getImages() != null) {
            for (com.electro.catalog.entity.Image img : product.getImages()) {
                if (img.getId().equals(imageId)) {
                    imageToDelete = img;
                    break;
                }
            }
        }

        if (imageToDelete == null) {
            throw new ResourceNotFoundException("Image", "id", imageId);
        }

        product.getImages().remove(imageToDelete);
        imageRepository.delete(imageToDelete);

        return adminGetProductById(productId);
    }

    public java.util.Map<String, Object> adminGetProductStats() {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("totalActive", productRepository.countByIsActive(true));
        stats.put("totalInactive", productRepository.countByIsActive(false));
        stats.put("totalProducts", productRepository.count());
        return stats;
    }

    private String resolveImageLink(com.electro.catalog.entity.Image img) {
        if (img == null) {
            return null;
        }
        String stored = img.getImageUrl();
        if (stored != null && !stored.isBlank()) {
            return stored.trim();
        }
        return serverUrl + "/img/" + img.getId();
    }

    private Long fetchSoldQuantity(Integer productId) {
        try {
            Map<String, Long> quantities = orderStatisticsClient.getSoldQuantities(List.of(productId));
            if (quantities == null || quantities.isEmpty()) {
                return 0L;
            }
            Long qty = quantities.get(String.valueOf(productId));
            if (qty == null) {
                qty = quantities.get(productId.toString());
            }
            return qty != null ? qty : 0L;
        } catch (Exception e) {
            return 0L;
        }
    }

    private Integer toInt(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }
}
