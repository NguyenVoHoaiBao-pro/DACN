package com.electro.catalog.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    public void log(String action, String entityType, String entityId, String message) {
        log.info("[AUDIT] {} {}#{} - {}", action, entityType, entityId, message);
    }
}
