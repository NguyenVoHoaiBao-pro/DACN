package com.electro.user.service;

import com.electro.user.config.MailProperties;
import com.electro.user.dto.UserDto;
import com.electro.user.entity.PasswordResetToken;
import com.electro.user.entity.User;
import com.electro.user.exception.BadRequestException;
import com.electro.user.repository.PasswordResetTokenRepository;
import com.electro.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private static final int TOKEN_VALID_MINUTES = 60;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final MailProperties mailProperties;
    private final AuditLogService auditLogService;

    /**
     * Luôn trả message chung — không tiết lộ email có tồn tại hay không.
     */
    @Transactional
    public String requestPasswordReset(String email) {
        String normalized = email != null ? email.trim().toLowerCase() : "";
        userRepository.findByEmailIgnoreCase(normalized).ifPresent(user -> {
            tokenRepository.deleteByUser(user);
            String token = UUID.randomUUID().toString().replace("-", "");
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .token(token)
                    .user(user)
                    .expiryDate(LocalDateTime.now().plusMinutes(TOKEN_VALID_MINUTES))
                    .used(false)
                    .build();
            tokenRepository.save(resetToken);

            String resetLink = mailProperties.getFrontendBaseUrl().replaceAll("/$", "")
                    + "/reset-password?token=" + token;
            emailService.sendResetPasswordEmail(user.getEmail(), resetLink);
            auditLogService.log("PASSWORD_RESET_REQUEST", "User", user.getId().toString(),
                    "Reset link emailed");
            log.info("Password reset token issued for user id={}", user.getId());
        });

        return "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (cả mục Spam).";
    }

    @Transactional
    public String resetPassword(UserDto.ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp");
        }

        PasswordResetToken resetToken = tokenRepository.findByToken(request.getToken().trim())
                .orElseThrow(() -> new BadRequestException("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        if (resetToken.isUsed()) {
            throw new BadRequestException("Liên kết đã được sử dụng. Vui lòng yêu cầu gửi lại email.");
        }
        if (resetToken.isExpired()) {
            throw new BadRequestException("Liên kết đã hết hạn. Vui lòng yêu cầu gửi lại email.");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);

        auditLogService.log("PASSWORD_RESET_COMPLETE", "User", user.getId().toString(), "Password updated via email link");
        return "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.";
    }
}
