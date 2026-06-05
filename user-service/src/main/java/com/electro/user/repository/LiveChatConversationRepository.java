package com.electro.user.repository;

import com.electro.user.entity.LiveChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LiveChatConversationRepository extends JpaRepository<LiveChatConversation, Long> {

    Optional<LiveChatConversation> findBySessionToken(String sessionToken);

    @Query("SELECT c FROM LiveChatConversation c WHERE c.status <> 'CLOSED' "
            + "AND (:assignedOnly = false OR c.assignedSalesUserId = :salesUserId) "
            + "ORDER BY c.lastMessageAt DESC, c.updatedAt DESC")
    List<LiveChatConversation> findInbox(
            @Param("assignedOnly") boolean assignedOnly,
            @Param("salesUserId") Integer salesUserId);
}
