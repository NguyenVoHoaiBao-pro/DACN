package com.electro.user.repository;

import com.electro.user.entity.LiveChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LiveChatMessageRepository extends JpaRepository<LiveChatMessage, Long> {

    List<LiveChatMessage> findByConversationIdOrderByIdAsc(Long conversationId);

    List<LiveChatMessage> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long afterId);
}
