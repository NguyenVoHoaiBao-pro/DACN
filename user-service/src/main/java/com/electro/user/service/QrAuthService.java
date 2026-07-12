package com.electro.user.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.electro.user.entity.QrAuthToken;
import com.electro.user.entity.User;
import com.electro.user.exception.BadRequestException;
import com.electro.user.exception.ResourceNotFoundException;
import com.electro.user.repository.QrAuthTokenRepository;
import com.electro.user.repository.UserRepository;

@Service
@Transactional
public class QrAuthService {

    private final QrAuthTokenRepository qrAuthTokenRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    public QrAuthService(QrAuthTokenRepository qrAuthTokenRepository,
            UserRepository userRepository,
            UserService userService) {
        this.qrAuthTokenRepository = qrAuthTokenRepository;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    public String generateToken() {
        QrAuthToken entity = new QrAuthToken();
        qrAuthTokenRepository.save(entity);
        return entity.getToken();
    }

    public Map<String, Object> getStatus(String token) {
        QrAuthToken qr = qrAuthTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid QR token"));

        expireIfNeeded(qr);

        if ("VERIFIED".equals(qr.getStatus()) && qr.getUser() != null) {
            Map<String, Object> auth = userService.buildAuthSuccessPayload(qr.getUser());
            auth.put("status", "VERIFIED");
            return auth;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("status", qr.getStatus());
        return response;
    }

    public Map<String, Object> verify(String token, Integer userId) {
        QrAuthToken qr = qrAuthTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid QR token"));

        expireIfNeeded(qr);

        if ("EXPIRED".equals(qr.getStatus())) {
            throw new BadRequestException("QR code has expired. Please scan a new code on PC.");
        }
        if (!"PENDING".equals(qr.getStatus())) {
            throw new BadRequestException("QR code is no longer valid");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        qr.setUser(user);
        qr.setStatus("VERIFIED");
        qrAuthTokenRepository.save(qr);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return response;
    }

    private void expireIfNeeded(QrAuthToken qr) {
        if (LocalDateTime.now().isAfter(qr.getExpiryDate()) && !"VERIFIED".equals(qr.getStatus())) {
            qr.setStatus("EXPIRED");
            qrAuthTokenRepository.save(qr);
        }
    }
}
