package com.electro.user.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.mail")
public class MailProperties {
    private String from;
    private String fromName = "Electro Store";
    private String frontendBaseUrl = "http://localhost:5173";
}
