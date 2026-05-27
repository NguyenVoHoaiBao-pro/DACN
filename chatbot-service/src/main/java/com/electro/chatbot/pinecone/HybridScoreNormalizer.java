package com.electro.chatbot.pinecone;

import java.util.ArrayList;
import java.util.List;

/**
 * Convex combination at query time: combined = alpha * dense + (1 - alpha) * sparse
 * (Pinecone scales query vectors before dotproduct).
 */
public final class HybridScoreNormalizer {

    private HybridScoreNormalizer() {
    }

    public static List<Float> scaleDense(List<Float> dense, double alpha) {
        List<Float> scaled = new ArrayList<>(dense.size());
        for (Float v : dense) {
            scaled.add((float) (v * alpha));
        }
        return scaled;
    }

    public static SparseVectorValues scaleSparse(SparseVectorValues sparse, double alpha) {
        double sparseWeight = 1.0 - alpha;
        List<Float> scaledValues = new ArrayList<>(sparse.values().size());
        for (Float v : sparse.values()) {
            scaledValues.add((float) (v * sparseWeight));
        }
        return new SparseVectorValues(sparse.indices(), scaledValues);
    }

    public static List<Float> l2Normalize(List<Float> vector) {
        double sumSq = 0.0;
        for (Float v : vector) {
            sumSq += v * v;
        }
        double norm = Math.sqrt(sumSq);
        if (norm < 1e-12) {
            return vector;
        }
        List<Float> normalized = new ArrayList<>(vector.size());
        for (Float v : vector) {
            normalized.add((float) (v / norm));
        }
        return normalized;
    }
}
