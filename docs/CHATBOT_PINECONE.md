# Chatbot RAG — Pinecone (Phase 2: Hybrid + Rerank)

## Kiến trúc retrieval

```
Câu hỏi
  → Dense embed (NVIDIA nv-embed-v1, 4096)
  → Sparse embed (Pinecone pinecone-sparse-english-v0)
  → Hybrid query Pinecone (alpha, topK=40)
  → Rerank (bge-reranker-v2-m3, topN=4)
  → LLM (meta/llama-3.1-8b-instruct)
```

Tài liệu Pinecone: [Hybrid search](https://docs.pinecone.io/guides/search/hybrid-search), [Rerank](https://docs.pinecone.io/guides/search/rerank-results).

## Cấu hình `.env`

```env
PINECONE_API_KEY=pcsk-...
PINECONE_INDEX_NAME=electro-store-products
PINECONE_NAMESPACE=

NVIDIA_API_KEY=nvapi-...
NVIDIA_EMBEDDING_MODEL=nvidia/nv-embed-v1

# Phase 2 (tùy chọn — mặc định trong application.yml)
RAG_HYBRID_ENABLED=true
RAG_HYBRID_ALPHA=0.75
RAG_RETRIEVAL_TOP_K=40
RAG_RERANK_ENABLED=true
RAG_RERANK_MODEL=bge-reranker-v2-m3
RAG_TOP_K=4
```

## Index Pinecone cho Hybrid (bắt buộc)

Hybrid **single index** cần:

| Thuộc tính | Giá trị |
|------------|---------|
| Name | `electro-store-products` |
| Dimensions | **4096** |
| Metric | **dotproduct** (không dùng cosine) |
| Vectors | Dense (NVIDIA) + sparse (Pinecone inference) mỗi chunk |

```powershell
.\scripts\Setup-PineconeHybridIndex.ps1
.\scripts\Reingest-Chatbot.ps1
```

## Tắt hybrid / rerank (chỉ dense)

```env
RAG_HYBRID_ENABLED=false
RAG_RERANK_ENABLED=false
```

Khi đó ingest/query dùng Spring AI `VectorStore` (cosine index cũ vẫn chạy được).

## Lưu ý

- Sparse model `pinecone-sparse-english-v0` tối ưu tiếng Anh; vẫn hỗ trợ khớp tên SP, mã, thương hiệu.
- `alpha=0.75`: thiên dense (ngữ nghĩa); giảm nếu cần khớp keyword mạnh hơn.
- Sau khi đổi index metric → **phải ingest lại**.
