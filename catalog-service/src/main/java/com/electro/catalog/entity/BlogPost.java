package com.electro.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "blog_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BlogPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String excerpt;

    @Column(length = 100)
    private String author;

    @Column(length = 80)
    private String category;

    @Column(length = 20)
    private String status = "draft";

    @Column(name = "publish_date")
    private LocalDate publishDate;

    private Long views = 0L;

    @Column(length = 1000)
    private String thumbnail;

    @Column(length = 500)
    private String tags;
}
