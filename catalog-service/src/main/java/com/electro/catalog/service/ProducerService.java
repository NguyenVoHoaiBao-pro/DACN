package com.electro.catalog.service;

import com.electro.catalog.dto.ProducerDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProducerService {
    Page<ProducerDto.Response> getAllProducers(Pageable pageable, String keyword, Boolean isActive);
    
    List<ProducerDto.SlimResponse> getAllProducersSlim(Boolean isActive);
    
    ProducerDto.Response getProducerById(Integer id);
    
    ProducerDto.Response createProducer(ProducerDto.Request request);
    
    ProducerDto.Response updateProducer(Integer id, ProducerDto.Request request);
    
    void deleteProducer(Integer id);
    
    ProducerDto.Response toggleStatus(Integer id);
}

