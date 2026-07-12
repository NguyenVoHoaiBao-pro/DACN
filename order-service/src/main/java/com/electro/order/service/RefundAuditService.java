package com.electro.order.service;

import com.electro.order.entity.RefundAuditLog;
import com.electro.order.repository.RefundAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RefundAuditService {

    private final RefundAuditLogRepository auditLogRepository;

    @Transactional
    public void log(Integer refundId, String refundCode, RefundAuditLog.Action action, String detail) {
        logAs(currentUsername(), currentRole(), refundId, refundCode, action, detail);
    }

    @Transactional
    public void logAs(String actorUsername, String actorRole, Integer refundId, String refundCode,
                      RefundAuditLog.Action action, String detail) {
        RefundAuditLog entry = RefundAuditLog.builder()
                .refundId(refundId)
                .refundCode(refundCode)
                .action(action)
                .actorUsername(actorUsername != null ? actorUsername : "system")
                .actorRole(actorRole)
                .detail(detail)
                .build();
        auditLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<RefundAuditLog> listByRefundId(Integer refundId) {
        return auditLogRepository.findByRefundIdOrderByCreatedAtAsc(refundId);
    }

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private String currentRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return null;
        }
        List<String> authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        for (String authority : authorities) {
            if (authority.startsWith("ROLE_")) {
                return truncateRole(authority.substring(5));
            }
        }
        return authorities.isEmpty() ? null : truncateRole(authorities.get(0));
    }

    private static String truncateRole(String role) {
        if (role == null || role.length() <= 50) {
            return role;
        }
        return role.substring(0, 50);
    }
}
