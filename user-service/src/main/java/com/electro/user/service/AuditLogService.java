package com.electro.user.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class AuditLogService {
    public void log(String action, String entityName, String entityId, String details) {
        log.info("AUDIT action={} entity={} id={} details={}", action, entityName, entityId, details);
    }
}
