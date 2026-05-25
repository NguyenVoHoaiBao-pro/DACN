package com.electro.catalog.service;

import com.electro.catalog.dto.BannerDto;
import com.electro.catalog.entity.Banner;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.BannerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class BannerService {

    private final BannerRepository bannerRepository;

    @Transactional(readOnly = true)
    public List<BannerDto.Response> getAll() {
        return bannerRepository.findAllByOrderByPriorityAscIdAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public BannerDto.Response create(BannerDto.Request request) {
        Banner banner = new Banner();
        applyRequest(banner, request);
        if (banner.getClickCount() == null) {
            banner.setClickCount(0L);
        }
        return toResponse(bannerRepository.save(banner));
    }

    public BannerDto.Response update(Integer id, BannerDto.Request request) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", "id", id));
        applyRequest(banner, request);
        return toResponse(bannerRepository.save(banner));
    }

    public BannerDto.Response toggleStatus(Integer id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner", "id", id));
        banner.setStatus("active".equalsIgnoreCase(banner.getStatus()) ? "inactive" : "active");
        return toResponse(bannerRepository.save(banner));
    }

    public void delete(Integer id) {
        if (!bannerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Banner", "id", id);
        }
        bannerRepository.deleteById(id);
    }

    private void applyRequest(Banner banner, BannerDto.Request request) {
        banner.setTitle(request.getTitle());
        banner.setSubtitle(request.getSubtitle());
        banner.setImageUrl(request.getImage());
        if (request.getPosition() != null) {
            banner.setPosition(request.getPosition());
        }
        if (request.getStatus() != null) {
            banner.setStatus(request.getStatus());
        }
        banner.setStartDate(request.getStartDate());
        banner.setEndDate(request.getEndDate());
        banner.setLink(request.getLink());
        if (request.getPriority() != null) {
            banner.setPriority(request.getPriority());
        }
    }

    private BannerDto.Response toResponse(Banner banner) {
        BannerDto.Response r = new BannerDto.Response();
        r.setId(banner.getId());
        r.setTitle(banner.getTitle());
        r.setSubtitle(banner.getSubtitle());
        r.setImage(banner.getImageUrl());
        r.setPosition(banner.getPosition());
        r.setStatus(banner.getStatus());
        r.setStartDate(banner.getStartDate());
        r.setEndDate(banner.getEndDate());
        r.setLink(banner.getLink());
        r.setPriority(banner.getPriority());
        r.setClickCount(banner.getClickCount());
        return r;
    }
}
