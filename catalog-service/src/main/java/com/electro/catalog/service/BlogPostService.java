package com.electro.catalog.service;

import com.electro.catalog.dto.BlogPostDto;
import com.electro.catalog.entity.BlogPost;
import com.electro.catalog.exception.ResourceNotFoundException;
import com.electro.catalog.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class BlogPostService {

    private final BlogPostRepository blogPostRepository;

    @Transactional(readOnly = true)
    public Page<BlogPostDto.Response> search(String keyword, String status, String category, Pageable pageable) {
        String kw = (keyword != null && keyword.isBlank()) ? null : keyword;
        String st = ("all".equalsIgnoreCase(status) || status == null || status.isBlank()) ? null : status;
        String cat = ("all".equalsIgnoreCase(category) || category == null || category.isBlank()) ? null : category;
        return blogPostRepository.search(kw, st, cat, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public BlogPostDto.Response getById(Integer id) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BlogPost", "id", id));
        return toResponse(post);
    }

    public BlogPostDto.Response create(BlogPostDto.Request request) {
        BlogPost post = new BlogPost();
        applyRequest(post, request);
        if (post.getViews() == null) {
            post.setViews(0L);
        }
        return toResponse(blogPostRepository.save(post));
    }

    public BlogPostDto.Response update(Integer id, BlogPostDto.Request request) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BlogPost", "id", id));
        applyRequest(post, request);
        return toResponse(blogPostRepository.save(post));
    }

    public void delete(Integer id) {
        if (!blogPostRepository.existsById(id)) {
            throw new ResourceNotFoundException("BlogPost", "id", id);
        }
        blogPostRepository.deleteById(id);
    }

    private void applyRequest(BlogPost post, BlogPostDto.Request request) {
        post.setTitle(request.getTitle());
        post.setExcerpt(request.getExcerpt());
        post.setAuthor(request.getAuthor());
        post.setCategory(request.getCategory());
        if (request.getStatus() != null) {
            post.setStatus(request.getStatus());
        }
        post.setPublishDate(request.getPublishDate());
        post.setThumbnail(request.getThumbnail());
        post.setTags(BlogPostDto.tagsToString(request.getTags()));
    }

    private BlogPostDto.Response toResponse(BlogPost post) {
        BlogPostDto.Response r = new BlogPostDto.Response();
        r.setId(post.getId());
        r.setTitle(post.getTitle());
        r.setExcerpt(post.getExcerpt());
        r.setAuthor(post.getAuthor());
        r.setCategory(post.getCategory());
        r.setStatus(post.getStatus());
        r.setPublishDate(post.getPublishDate());
        r.setViews(post.getViews());
        r.setThumbnail(post.getThumbnail());
        r.setTags(BlogPostDto.tagsFromString(post.getTags()));
        return r;
    }
}
