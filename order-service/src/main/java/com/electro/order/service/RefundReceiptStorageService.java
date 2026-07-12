package com.electro.order.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class RefundReceiptStorageService {

    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp", "image/jpg");

    private final Path uploadDir;

    public RefundReceiptStorageService(
            @Value("${refund.receipt-upload-dir:uploads/refund-receipts}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public String store(Integer refundId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File biên lai trống");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Chỉ chấp nhận ảnh JPG/PNG/WEBP");
        }
        Files.createDirectories(uploadDir);
        String ext = switch (contentType.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
        String filename = "RF" + refundId + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
        Path target = uploadDir.resolve(filename);
        Files.copy(file.getInputStream(), target);
        return "/api/admin/refunds/receipts/" + filename;
    }

    public Path resolve(String filename) {
        Path resolved = uploadDir.resolve(filename).normalize();
        if (!resolved.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Invalid path");
        }
        return resolved;
    }
}
