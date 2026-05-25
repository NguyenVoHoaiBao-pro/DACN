package com.electro.order.service;

import com.electro.order.dto.CouponDto;
import com.electro.order.entity.Coupon;
import com.electro.order.repository.CouponRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CouponServiceImpl implements CouponService {

    private final CouponRepository couponRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<CouponDto.Response> getAllCoupons(String keyword, Boolean isActive, Pageable pageable) {
        return couponRepository.searchCoupons(keyword, isActive, pageable).map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public CouponDto.Response getCouponById(Integer id) {
        return couponRepository.findById(id).map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + id));
    }

    @Override
    public CouponDto.Response createCoupon(CouponDto.CreateRequest request) {
        Coupon coupon = new Coupon();
        applyCreate(coupon, request);
        return toResponse(couponRepository.save(coupon));
    }

    @Override
    public CouponDto.Response updateCoupon(Integer id, CouponDto.UpdateRequest request) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + id));
        applyUpdate(coupon, request);
        return toResponse(couponRepository.save(coupon));
    }

    @Override
    public void deleteCoupon(Integer id) {
        couponRepository.deleteById(id);
    }

    @Override
    public CouponDto.Response toggleActive(Integer id) {
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found: " + id));
        coupon.setIsActive(!Boolean.TRUE.equals(coupon.getIsActive()));
        return toResponse(couponRepository.save(coupon));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CouponDto.Response> getActiveCoupons() {
        return couponRepository.findActiveCoupons(LocalDateTime.now()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private CouponDto.Response toResponse(Coupon c) {
        CouponDto.Response r = new CouponDto.Response();
        r.setId(c.getId());
        r.setCode(c.getCode());
        r.setName(c.getName());
        r.setDescription(c.getDescription());
        r.setDiscountType(c.getDiscountType() != null ? c.getDiscountType().name() : null);
        r.setDiscountValue(c.getDiscountValue());
        r.setMinOrderValue(c.getMinOrderValue());
        r.setMaxDiscountAmount(c.getMaxDiscountAmount());
        r.setUsageLimit(c.getUsageLimit());
        r.setUsedCount(c.getUsedCount());
        r.setDateStart(c.getDateStart());
        r.setDateEnd(c.getDateEnd());
        r.setIsActive(c.getIsActive());
        r.setCreatedAt(c.getCreatedAt());
        r.setUpdatedAt(c.getUpdatedAt());
        return r;
    }

    private void applyCreate(Coupon coupon, CouponDto.CreateRequest request) {
        coupon.setCode(request.getCode().trim().toUpperCase());
        coupon.setName(request.getName());
        coupon.setDescription(request.getDescription());
        coupon.setDiscountType(Coupon.DiscountType.valueOf(request.getDiscountType()));
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderValue(request.getMinOrderValue());
        coupon.setMaxDiscountAmount(request.getMaxDiscountAmount());
        coupon.setUsageLimit(request.getUsageLimit());
        coupon.setDateStart(request.getDateStart());
        coupon.setDateEnd(request.getDateEnd());
        coupon.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
    }

    private void applyUpdate(Coupon coupon, CouponDto.UpdateRequest request) {
        if (request.getCode() != null) {
            coupon.setCode(request.getCode().trim().toUpperCase());
        }
        if (request.getName() != null) {
            coupon.setName(request.getName());
        }
        if (request.getDescription() != null) {
            coupon.setDescription(request.getDescription());
        }
        if (request.getDiscountType() != null) {
            coupon.setDiscountType(Coupon.DiscountType.valueOf(request.getDiscountType()));
        }
        if (request.getDiscountValue() != null) {
            coupon.setDiscountValue(request.getDiscountValue());
        }
        if (request.getMinOrderValue() != null) {
            coupon.setMinOrderValue(request.getMinOrderValue());
        }
        if (request.getMaxDiscountAmount() != null) {
            coupon.setMaxDiscountAmount(request.getMaxDiscountAmount());
        }
        if (request.getUsageLimit() != null) {
            coupon.setUsageLimit(request.getUsageLimit());
        }
        if (request.getDateStart() != null) {
            coupon.setDateStart(request.getDateStart());
        }
        if (request.getDateEnd() != null) {
            coupon.setDateEnd(request.getDateEnd());
        }
        if (request.getIsActive() != null) {
            coupon.setIsActive(request.getIsActive());
        }
    }
}
