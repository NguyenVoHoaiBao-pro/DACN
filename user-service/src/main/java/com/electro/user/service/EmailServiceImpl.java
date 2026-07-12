package com.electro.user.service;

import com.electro.user.config.MailProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    @Override
    public void sendResetPasswordEmail(String toEmail, String resetLink) {
        String subject = "Đặt lại mật khẩu — Electro Store";
        String html = """
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
                  <h2 style="color:#1e293b;margin-bottom:8px">Đặt lại mật khẩu</h2>
                  <p style="color:#475569;line-height:1.6">
                    Bạn vừa yêu cầu đặt lại mật khẩu tài khoản Electro Store.
                    Nhấn nút bên dưới trong vòng <strong>60 phút</strong> để tạo mật khẩu mới.
                  </p>
                  <p style="margin:28px 0">
                    <a href="%s" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                      Đặt lại mật khẩu
                    </a>
                  </p>
                  <p style="color:#94a3b8;font-size:13px;line-height:1.5">
                    Nếu bạn không yêu cầu, hãy bỏ qua email này.<br/>
                    Liên kết: <a href="%s">%s</a>
                  </p>
                </div>
                """.formatted(resetLink, resetLink, resetLink);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            try {
                helper.setFrom(mailProperties.getFrom(), mailProperties.getFromName());
            } catch (java.io.UnsupportedEncodingException e) {
                helper.setFrom(mailProperties.getFrom());
            }
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Password reset email sent to {}", maskEmail(toEmail));
        } catch (MessagingException e) {
            log.error("Failed to send reset email to {}: {}", maskEmail(toEmail), e.getMessage());
            throw new IllegalStateException("Không gửi được email. Kiểm tra cấu hình SMTP (MAIL_* trong .env).", e);
        }
    }

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String masked = local.length() <= 2 ? "**" : local.substring(0, 2) + "***";
        return masked + email.substring(at);
    }
}
