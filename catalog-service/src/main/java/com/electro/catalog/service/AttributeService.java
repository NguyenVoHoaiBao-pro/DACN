package com.electro.catalog.service;

import com.electro.catalog.dto.AttributeDto;
import com.electro.catalog.dto.AttributeValueDto;
import com.electro.catalog.entity.Attribute;
import com.electro.catalog.entity.AttributeValue;
import com.electro.catalog.exception.BadRequestException;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.AttributeRepository;
import com.electro.catalog.repository.AttributeValueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttributeService {

    @Autowired
    private AttributeRepository attributeRepository;

    @Autowired
    private AttributeValueRepository attributeValueRepository;

    // Attributes
    public List<AttributeDto.Response> getAllAttributes() {
        return attributeRepository.findAll()
                .stream()
                .map(this::mapToAttributeResponse)
                .collect(Collectors.toList());
    }

    public AttributeDto.Response getAttributeById(Integer id) {
        Attribute attribute = attributeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attribute", "id", id));
        return mapToAttributeResponse(attribute);
    }

    public AttributeDto.Response createAttribute(AttributeDto.CreateRequest request) {
        if (attributeRepository.findByName(request.getName()).isPresent()) {
            throw new BadRequestException("Attribute name already exists");
        }
        Attribute attribute = new Attribute();
        attribute.setName(request.getName());
        return mapToAttributeResponse(attributeRepository.save(attribute));
    }

    public AttributeDto.Response updateAttribute(Integer id, AttributeDto.UpdateRequest request) {
        Attribute attribute = attributeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attribute", "id", id));

        if (!attribute.getName().equals(request.getName()) && 
            attributeRepository.findByName(request.getName()).isPresent()) {
            throw new BadRequestException("Attribute name already exists");
        }
        
        attribute.setName(request.getName());
        return mapToAttributeResponse(attributeRepository.save(attribute));
    }

    public void deleteAttribute(Integer id) {
        Attribute attribute = attributeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attribute", "id", id));
        attributeRepository.delete(attribute);
    }

    // Attribute Values
    public List<AttributeValueDto.Response> getAllAttributeValues() {
        return attributeValueRepository.findAll()
                .stream()
                .map(this::mapToAttributeValueResponse)
                .collect(Collectors.toList());
    }

    public List<AttributeValueDto.Response> getAttributeValuesByAttributeId(Integer attributeId) {
        return attributeValueRepository.findByAttribute_Id(attributeId)
                .stream()
                .map(this::mapToAttributeValueResponse)
                .collect(Collectors.toList());
    }

    public AttributeValueDto.Response createAttributeValue(AttributeValueDto.CreateRequest request) {
        Attribute attribute = attributeRepository.findById(request.getAttributeId())
                .orElseThrow(() -> new ResourceNotFoundException("Attribute", "id", request.getAttributeId()));

        AttributeValue attributeValue = new AttributeValue();
        attributeValue.setAttribute(attribute);
        attributeValue.setValue(request.getValue());

        return mapToAttributeValueResponse(attributeValueRepository.save(attributeValue));
    }

    public AttributeValueDto.Response updateAttributeValue(Integer id, AttributeValueDto.CreateRequest request) {
        AttributeValue attributeValue = attributeValueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AttributeValue", "id", id));

        Attribute attribute = attributeRepository.findById(request.getAttributeId())
                .orElseThrow(() -> new ResourceNotFoundException("Attribute", "id", request.getAttributeId()));

        attributeValue.setAttribute(attribute);
        attributeValue.setValue(request.getValue());

        return mapToAttributeValueResponse(attributeValueRepository.save(attributeValue));
    }

    public void deleteAttributeValue(Integer id) {
        AttributeValue attributeValue = attributeValueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AttributeValue", "id", id));
        attributeValueRepository.delete(attributeValue);
    }

    // Mapping Methods
    private AttributeDto.Response mapToAttributeResponse(Attribute attribute) {
        return new AttributeDto.Response(attribute.getId(), attribute.getName());
    }

    private AttributeValueDto.Response mapToAttributeValueResponse(AttributeValue attributeValue) {
        return new AttributeValueDto.Response(
                attributeValue.getId(),
                attributeValue.getAttribute() != null ? attributeValue.getAttribute().getName() : null,
                attributeValue.getValue()
        );
    }
}

