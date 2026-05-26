package com.electro.chatbot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = {"com.electro.chatbot", "com.electro.shared"})
@EnableDiscoveryClient
@EnableFeignClients
@EnableScheduling
public class ChatbotServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatbotServiceApplication.class, args);
    }

}
