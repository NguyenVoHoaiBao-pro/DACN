package com.electro.chatbot.dto;

import lombok.Data;

@Data
public class ReviewResponseDto {
    private Integer id;
    private Integer productId;
    private Integer rating;
    private String title;
    private String content;
    private String pros;
    private String cons;
    private Boolean isApproved;
}
