package com.electro.catalog.config;

import com.electro.catalog.entity.BlogPost;
import com.electro.catalog.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/** Seed mẫu khi bảng blog_posts trống (dev/demo). */
@Component
@RequiredArgsConstructor
public class BlogPostSampleLoader implements ApplicationRunner {

    private final BlogPostRepository blogPostRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (blogPostRepository.count() > 0) {
            return;
        }
        save("Top 5 tai nghe Anker 2026", "Danh sách tai nghe đáng mua nhất trong tầm giá.",
                "KhangAdmin", "Top List", "published", LocalDate.now().minusDays(3), 12500L,
                "tai-nghe,anker,review");
        save("Hướng dẫn chọn sạc PD cho iPhone", "Giải thích chuẩn sạc PD và công suất phù hợp.",
                "Electro Team", "Guide", "published", LocalDate.now().minusDays(7), 8200L,
                "sac,iphone,huong-dan");
        save("So sánh Hub USB-C 7-in-1", "Bảng so sánh tính năng và giá các hub phổ biến.",
                "KhangAdmin", "Comparison", "draft", null, 0L, "hub,usb-c");
        save("Công nghệ GaN trong adapter", "Vì sao adapter GaN nhỏ gọn hơn adapter thường.",
                "Electro Team", "Technology", "scheduled", LocalDate.now().plusDays(5), 1200L,
                "gan,cong-nghe");
        save("Review Adapter Anker 30W Nano 3", "Trải nghiệm thực tế sau 2 tuần sử dụng.",
                "KhangAdmin", "Review", "published", LocalDate.now().minusDays(1), 5600L,
                "review,anker,adapter");
    }

    private void save(String title, String excerpt, String author, String category, String status,
                      LocalDate publishDate, Long views, String tags) {
        BlogPost p = new BlogPost();
        p.setTitle(title);
        p.setExcerpt(excerpt);
        p.setAuthor(author);
        p.setCategory(category);
        p.setStatus(status);
        p.setPublishDate(publishDate);
        p.setViews(views);
        p.setTags(tags);
        blogPostRepository.save(p);
    }
}
