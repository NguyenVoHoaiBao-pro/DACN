package com.electro.user.service;

public interface EmailService {
    void sendResetPasswordEmail(String toEmail, String resetLink);
}

