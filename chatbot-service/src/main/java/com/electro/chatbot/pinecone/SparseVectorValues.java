package com.electro.chatbot.pinecone;

import java.util.List;

public record SparseVectorValues(List<Long> indices, List<Float> values) {
}
