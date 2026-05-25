package com.electro.review.dto;

import lombok.Data;

public class UserClientDto {

    @Data
    public static class UserResponse {
        private Integer id;
        private String username;
        private String name;
        private String email;
    }
}
