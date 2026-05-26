package com.electro.chatbot.dto;

import lombok.Data;
import java.util.List;

@Data
public class CustomPageResponse<T> {
    private List<T> content;
    private int number;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;
}
