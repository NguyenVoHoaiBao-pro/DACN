package com.electro.chatbot.config;

import com.electro.chatbot.service.ProductIngestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class StartupIngestionConfig implements CommandLineRunner {

    private final ProductIngestionService productIngestionService;

    @Override
    public void run(String... args) {
        log.info("Chatbot service đã khởi động thành công. Sẽ thực hiện nạp mồi dữ liệu Pinecone trong nền...");

        // Chạy bất đồng bộ để KHÔNG chặn hoặc crash tiến trình khởi động Spring Boot.
        // Nếu Pinecone/NVIDIA chưa sẵn sàng, service vẫn UP bình thường,
        // và dữ liệu sẽ được đồng bộ lại qua scheduled job hoặc POST /api/chatbot/ingest.
        new Thread(() -> {
            try {
                // Đợi 35 giây cho Eureka lấy xong registry
                Thread.sleep(35_000);
                log.info("Bắt đầu nạp mồi dữ liệu sản phẩm vào Pinecone...");
                productIngestionService.ingestAllProducts();
                log.info("Hoàn tất nạp mồi dữ liệu vào Pinecone.");
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            } catch (Exception ex) {
                log.warn("Không thể nạp mồi dữ liệu lúc khởi động (sẽ tự động thử lại theo lịch Scheduled): {}", ex.getMessage());
            }
        }, "chromadb-seed-thread").start();
    }
}
