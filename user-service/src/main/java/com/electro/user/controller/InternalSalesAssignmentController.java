package com.electro.user.controller;

import com.electro.user.service.SalesAutoAssignService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/internal/sales-assignment")
@RequiredArgsConstructor
public class InternalSalesAssignmentController {

    private final SalesAutoAssignService salesAutoAssignService;

    @GetMapping("/users")
    public List<Map<String, Object>> activeSalesUsers() {
        return salesAutoAssignService.listActiveSalesUsers().stream()
                .map(u -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("id", u.getId());
                    row.put("name", u.getName());
                    row.put("email", u.getEmail());
                    return row;
                })
                .collect(Collectors.toList());
    }

    @GetMapping("/next")
    public Map<String, Object> nextAssignee() {
        Map<String, Object> body = new HashMap<>();
        salesAutoAssignService.nextSalesUserId().ifPresentOrElse(
                id -> {
                    body.put("salesUserId", id);
                    salesAutoAssignService.resolveSalesName(id).ifPresent(n -> body.put("salesUserName", n));
                },
                () -> body.put("salesUserId", null));
        return body;
    }
}
