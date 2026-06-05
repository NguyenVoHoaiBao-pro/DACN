package com.electro.user.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sales_assign_cursor")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SalesAssignCursor {

    @Id
    private Integer id = 1;

    @Column(name = "last_index", nullable = false)
    private Integer lastIndex = -1;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
