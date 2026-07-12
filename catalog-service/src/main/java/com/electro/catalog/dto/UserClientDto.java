package com.electro.catalog.dto;

import lombok.Data;

public class UserClientDto {

    @Data
    public static class Response {
        private Integer id;
        private String username;
    }
}
