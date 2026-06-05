# Kịch bản bảo vệ: Chatbot RAG — bài toán, kỹ thuật, chứng minh bằng mã nguồn

Tài liệu giúp bạn **trình bày có logic** và **chỉ đúng đoạn code** để hội đồng thấy bạn **hiểu hệ thống**, không chỉ “ghép API”.

---

## Phần A — Bài toán (vì sao cần làm)

| Vấn đề thực tế | Hệ quả nếu không xử lý |
|----------------|-------------------------|
| LLM thuần không đọc DB catalog theo thời gian thực | Trả lời **bịa** giá, model, tồn kho |
| Chỉ tìm theo từ khóa (BM25/keyword) | Hỏi theo nghĩa (“máy học tập giá rẻ”) **không khớp** mô tả |
| Chỉ vector semantic | SKU, tên hãng viết đặc thù **dễ trượt** |
| Dữ liệu thay đổi | Vector store **lệch** so với catalog |
| Microservice | Cần **tách service**, **cổng vào thống nhất**, phân quyền ingest |

**Câu nói gọn cho hội đồng:**  
“Em không dùng LLM như một search engine. Em tách **truy xuất dữ liệu có kiểm chứng** (RAG) và **sinh ngôn ngữ có ràng buộc** (prompt + danh sách sản phẩm được phép).”

---

## Phần B — Kỹ thuật đã áp dụng và giải quyết được gì

| Kỹ thuật | Giải quyết bài toán gì | Chứng minh trong code (mở file + chỉ dòng) |
|----------|-------------------------|-------------------------------------------|
| **RAG (Retrieval-Augmented Generation)** | Câu trả lời **bám nguồn** mô tả sản phẩm đã index | `RagChatbotService.chatWithRag`: lấy `Document` rồi ghép `context`, gọi LLM — ```36:94:chatbot-service/src/main/java/com/electro/chatbot/service/RagChatbotService.java``` |
| **Hybrid retrieval (dense + sparse, 1 index)** | Vừa **ngữ nghĩa** vừa **từ khóa** trong **một** truy vấn Pinecone | `RagRetrievalService.hybridRetrieve` — ```75:105:chatbot-service/src/main/java/com/electro/chatbot/service/RagRetrievalService.java``` |
| **Alpha / hybrid score norm (theo Pinecone)** | Tránh sparse **áp đảo** dense; cân tỷ lệ semantic/lexical | `HybridScoreNormalizer.scaleDense` / `scaleSparse` — ```15:30:chatbot-service/src/main/java/com/electro/chatbot/pinecone/HybridScoreNormalizer.java``` |
| **L2 normalize dense** | Dot product trên vector đơn vị → ổn định so sánh | `HybridScoreNormalizer.l2Normalize` — ```32:45:chatbot-service/src/main/java/com/electro/chatbot/pinecone/HybridScoreNormalizer.java``` |
| **Rerank (cross-encoder qua API)** | Top-K rộng **chưa chắc** tốt nhất; rerank chọn top cuối cho LLM | `RagRetrievalService.rerank` + `PineconeRagClient.rerank` — ```108:133:chatbot-service/src/main/java/com/electro/chatbot/service/RagRetrievalService.java``` và ```263:290:chatbot-service/src/main/java/com/electro/chatbot/pinecone/PineconeRagClient.java``` |
| **Guardrail prompt (danh sách sản phẩm được phép)** | Giảm **hallucination** tên/giá ngoài catalog | System prompt + `ChatClient` — ```65:91:chatbot-service/src/main/java/com/electro/chatbot/service/RagChatbotService.java```; metadata tên — `extractAllowedProductNames` — ```106:126:chatbot-service/src/main/java/com/electro/chatbot/service/RagChatbotService.java``` |
| **Chunking (TokenTextSplitter)** | Tài liệu dài → embed/search **ổn định** | `ProductIngestionService` — ```88:89:chatbot-service/src/main/java/com/electro/chatbot/service/ProductIngestionService.java``` |
| **Ingest định kỳ + nền + thủ công** | Catalog đổi → vector **cập nhật** | `@Scheduled` — ```35:36:chatbot-service/src/main/java/com/electro/chatbot/service/ProductIngestionService.java```; startup nền — ```17:35:chatbot-service/src/main/java/com/electro/chatbot/config/StartupIngestionConfig.java```; API — ```81:104:chatbot-service/src/main/java/com/electro/chatbot/controller/ChatbotController.java``` |
| **API Gateway + Eureka** | Một cổng `:8080`, **cân bằng tải** tới instance chatbot | Route — ```90:94:api-gateway/src/main/resources/application.yml``` |
| **Phân quyền** | Chat **public**; ingest **admin** | `SecurityConfig` — ```28:37:chatbot-service/src/main/java/com/electro/chatbot/config/SecurityConfig.java```; Gateway public path — `JwtAuthenticationGlobalFilter` (danh sách `PUBLIC_PATHS` có `/api/chatbot/chat`) |
| **Trạng thái index (`rag-status`)** | Vận hành/ demo không “mù” | `ChatbotController.ragStatus` — ```36:68:chatbot-service/src/main/java/com/electro/chatbot/controller/ChatbotController.java``` |

**Nguồn lý thuyết ngoài repo (nói 1 câu khi hội đồng hỏi “theo tài liệu nào”):**  
[Pinecone Hybrid search](https://docs.pinecone.io/guides/search/hybrid-search) — mục normalize + alpha.

---

## Phần C — Data flow nói theo “từng bước + mở file nào”

### C1. Người dùng gửi câu hỏi

1. **Frontend** gọi `POST .../api/chatbot/chat` với body `{ message }`.  
   - File: `frontend/src/services/chatbotService.js` — ```87:95:frontend/src/services/chatbotService.js```  
2. **Base URL** mặc định là Gateway `8080`.  
   - ```5:8:frontend/src/services/chatbotService.js```

### C2. Gateway chuyển tiếp

3. Route `/api/chatbot/**` → `lb://chatbot-service`.  
   - ```90:94:api-gateway/src/main/resources/application.yml```

### C3. Controller nhận request

4. `ChatbotController.chat` kiểm tra rỗng, gọi service.  
   - ```70:79:chatbot-service/src/main/java/com/electro/chatbot/controller/ChatbotController.java```

### C4. Service RAG — kiểm tra index

5. Nếu index trống → **không gọi LLM**, trả hướng dẫn ingest.  
   - ```39:43:chatbot-service/src/main/java/com/electro/chatbot/service/RagChatbotService.java```  
6. Probe bằng `describe_index_stats` (nhẹ).  
   - `isIndexEmpty` — ```36:42:chatbot-service/src/main/java/com/electro/chatbot/service/RagRetrievalService.java```; `getNamespaceVectorCount` — ```88:113:chatbot-service/src/main/java/com/electro/chatbot/pinecone/PineconeRagClient.java```

### C5. Retrieval — hybrid + rerank

7. `retrieve` chọn hybrid hoặc dense-only.  
   - ```49:63:chatbot-service/src/main/java/com/electro/chatbot/service/RagRetrievalService.java```  
8. `hybridRetrieve`: dense query (NVIDIA) + sparse query (Pinecone embed) + scale α + `queryHybrid`.  
   - ```75:93:chatbot-service/src/main/java/com/electro/chatbot/service/RagRetrievalService.java```  
9. HTTP Pinecone: `embed` + `query` + `rerank`.  
   - Embed sparse: ```135:152:chatbot-service/src/main/java/com/electro/chatbot/pinecone/PineconeRagClient.java```  
   - Query: ```219:243:chatbot-service/src/main/java/com/electro/chatbot/pinecone/PineconeRagClient.java```  
   - Rerank: ```263:279:chatbot-service/src/main/java/com/electro/chatbot/pinecone/PineconeRagClient.java```

### C6. Sinh câu trả lời

10. Ghép context, system prompt, gọi `ChatClient` (NVIDIA).  
    - ```61:91:chatbot-service/src/main/java/com/electro/chatbot/service/RagChatbotService.java```

### C7. Ingest (khi hội đồng hỏi “dữ liệu vào đâu”)

11. Lấy sản phẩm trang từ catalog (Feign), build text, chunk, upsert hybrid.  
    - Vòng lặp + hybrid upsert: ```44:100:chatbot-service/src/main/java/com/electro/chatbot/service/ProductIngestionService.java```  
12. `upsertHybridChunks`: dense passage + sparse passage + upsert.  
    - ```154:183:chatbot-service/src/main/java/com/electro/chatbot/service/RagRetrievalService.java```  
    - HTTP upsert: ```179:216:chatbot-service/src/main/java/com/electro/chatbot/pinecone/PineconeRagClient.java```

### C8. Cấu hình model (khi hỏi “dùng model gì”)

13. `application.yml`: NVIDIA base URL + model chat/embedding; Pinecone; `rag.*`.  
    - ```12:44:chatbot-service/src/main/resources/application.yml```

---

## Phần D — Câu trả lời “chốt” nếu giảng viên nghi ngờ vibe code

**Câu hỏi:** “Em có hiểu hybrid không hay chỉ copy?”  
**Trả lời:** “Em hiểu hybrid là **một record** có cả dense và sparse; query gửi **cả hai**; Pinecone trả **một score** sau dot product. Em **scale vector query** theo α giống `hybrid_score_norm` trong docs Pinecone, code nằm ở `HybridScoreNormalizer` và được gọi trong `hybridRetrieve`.”

**Câu hỏi:** “Rerank để làm gì?”  
**Trả lời:** “Retrieval trả top-K rộng để **không bỏ sót**; rerank đọc **full text** từng ứng viên với câu hỏi để chọn top nhỏ **chắc liên quan** trước khi LLM đọc — giảm nhiễu và token.”

**Câu hỏi:** “Làm sao chống bịa sản phẩm?”  
**Trả lời:** “Em ràng buộc trong system prompt: **chỉ** các tên trong metadata retrieval và **chỉ** nội dung context; code lấy danh sách tên từ metadata trong `extractAllowedProductNames` (khoảng dòng 106–126 `RagChatbotService.java`).”

---

## Phần E — Slide gợi ý (5 bullet)

1. Bài toán: tư vấn sản phẩm **đúng dữ liệu catalog**, hỗ trợ hỏi theo nghĩa + từ khóa.  
2. Kiến trúc: React → **Gateway** → **chatbot-service** → NVIDIA + Pinecone.  
3. Kỹ thuật: **RAG + hybrid + rerank + chunking + ingest định kỳ**.  
4. Chống bịa: **guardrail prompt** + context chỉ từ retrieval.  
5. Minh chứng: mở các file đã trích dòng ở Phần B–C.

---

*Tệp song song ngắn gọn: `docs/CHATBOT_RAG_FLOW_ARTIFACT.md` (diagram + bảng mapping).*
