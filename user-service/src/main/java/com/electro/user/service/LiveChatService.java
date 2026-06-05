package com.electro.user.service;

import com.electro.user.dto.LiveChatDto;
import com.electro.user.entity.LiveChatConversation;
import com.electro.user.entity.LiveChatMessage;
import com.electro.user.entity.User;
import com.electro.user.exception.BadRequestException;
import com.electro.user.exception.ResourceNotFoundException;
import com.electro.user.repository.LiveChatConversationRepository;
import com.electro.user.repository.LiveChatMessageRepository;
import com.electro.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LiveChatService {

    private final LiveChatConversationRepository conversationRepository;
    private final LiveChatMessageRepository messageRepository;
    private final SalesAutoAssignService salesAutoAssignService;
    private final UserRepository userRepository;

    @Transactional
    public LiveChatDto.StartSessionResponse startGuestSession(LiveChatDto.StartSessionRequest request) {
        return startSession(request, null);
    }

    @Transactional
    public LiveChatDto.StartSessionResponse startCustomerSession(LiveChatDto.StartSessionRequest request, User customer) {
        return startSession(request, customer);
    }

    private LiveChatDto.StartSessionResponse startSession(LiveChatDto.StartSessionRequest request, User customer) {
        if (request == null) {
            request = new LiveChatDto.StartSessionRequest();
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        LiveChatConversation conv = LiveChatConversation.builder()
                .sessionToken(token)
                .channel(LiveChatConversation.Channel.WEB)
                .status(LiveChatConversation.Status.OPEN)
                .unreadForSales(0)
                .build();

        if (customer != null) {
            conv.setCustomerUserId(customer.getId());
            conv.setGuestName(StringUtils.hasText(customer.getName()) ? customer.getName().trim() : customer.getUsername());
            conv.setGuestEmail(customer.getEmail());
            conv.setGuestPhone(customer.getPhone());
        } else {
            conv.setGuestName(StringUtils.hasText(request.getGuestName())
                    ? request.getGuestName().trim() : "Khách web (chưa đăng nhập)");
            conv.setGuestPhone(request.getGuestPhone());
            conv.setGuestEmail(request.getGuestEmail());
        }

        Optional<Integer> salesId = salesAutoAssignService.nextSalesUserId();
        if (salesId.isPresent()) {
            conv.setAssignedSalesUserId(salesId.get());
            conv.setStatus(LiveChatConversation.Status.ASSIGNED);
        }

        conv = conversationRepository.save(conv);

        if (StringUtils.hasText(request.getInitialMessage())) {
            appendMessage(conv, LiveChatMessage.SenderType.CUSTOMER, null, request.getInitialMessage().trim());
            conv = conversationRepository.findById(conv.getId()).orElse(conv);
        } else {
            appendMessage(conv, LiveChatMessage.SenderType.SYSTEM, null,
                    "Xin chào! Bạn đã được kết nối hàng đợi tư vấn. Nhân viên sẽ phản hồi trong giây lát.");
            conv = conversationRepository.findById(conv.getId()).orElse(conv);
        }

        return toStartResponse(conv);
    }

    @Transactional
    public LiveChatDto.MessageResponse guestSend(String sessionToken, LiveChatDto.SendMessageRequest request) {
        if (!StringUtils.hasText(request.getBody())) {
            throw new BadRequestException("Nội dung tin nhắn không được để trống");
        }
        LiveChatConversation conv = getByToken(sessionToken);
        if (conv.getStatus() == LiveChatConversation.Status.CLOSED) {
            throw new BadRequestException("Cuộc hội thoại đã đóng");
        }
        return toMessage(appendMessage(conv, LiveChatMessage.SenderType.CUSTOMER, conv.getCustomerUserId(),
                request.getBody().trim()));
    }

    @Transactional(readOnly = true)
    public List<LiveChatDto.MessageResponse> guestMessages(String sessionToken, Long afterId) {
        LiveChatConversation conv = getByToken(sessionToken);
        List<LiveChatMessage> messages = afterId != null && afterId > 0
                ? messageRepository.findByConversationIdAndIdGreaterThanOrderByIdAsc(conv.getId(), afterId)
                : messageRepository.findByConversationIdOrderByIdAsc(conv.getId());
        return messages.stream().map(this::toMessage).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LiveChatDto.ConversationSummary> adminInbox(Integer salesUserId, boolean mineOnly) {
        return conversationRepository.findInbox(mineOnly, salesUserId).stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Transactional
    public LiveChatDto.ConversationDetail adminDetail(Long conversationId, Integer viewerUserId) {
        LiveChatConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("LiveChatConversation", "id", conversationId));
        if (viewerUserId != null && conv.getAssignedSalesUserId() != null
                && !conv.getAssignedSalesUserId().equals(viewerUserId)) {
            // Sales vẫn xem được inbox chung; chỉ reset unread khi đúng người phụ trách
        }
        if (viewerUserId != null && conv.getAssignedSalesUserId() != null
                && conv.getAssignedSalesUserId().equals(viewerUserId)) {
            conv.setUnreadForSales(0);
            conversationRepository.save(conv);
        }
        List<LiveChatDto.MessageResponse> messages = messageRepository
                .findByConversationIdOrderByIdAsc(conv.getId()).stream()
                .map(this::toMessage)
                .collect(Collectors.toList());
        return new LiveChatDto.ConversationDetail(toSummary(conv), messages);
    }

    @Transactional
    public LiveChatDto.MessageResponse salesReply(Long conversationId, Integer salesUserId, String body) {
        if (!StringUtils.hasText(body)) {
            throw new BadRequestException("Nội dung tin nhắn không được để trống");
        }
        LiveChatConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("LiveChatConversation", "id", conversationId));
        if (conv.getAssignedSalesUserId() == null) {
            conv.setAssignedSalesUserId(salesUserId);
            conv.setStatus(LiveChatConversation.Status.ASSIGNED);
        }
        return toMessage(appendMessage(conv, LiveChatMessage.SenderType.SALES, salesUserId, body.trim()));
    }

    private LiveChatMessage appendMessage(LiveChatConversation conv, LiveChatMessage.SenderType type,
                                          Integer senderUserId, String body) {
        Integer resolvedSender = senderUserId;
        if (type == LiveChatMessage.SenderType.CUSTOMER && conv.getCustomerUserId() != null) {
            resolvedSender = conv.getCustomerUserId();
        }
        LiveChatMessage msg = LiveChatMessage.builder()
                .conversationId(conv.getId())
                .senderType(type)
                .senderUserId(resolvedSender)
                .body(body)
                .build();
        msg = messageRepository.save(msg);
        conv.setLastMessageAt(msg.getCreatedAt());
        if (type == LiveChatMessage.SenderType.CUSTOMER) {
            conv.setUnreadForSales(conv.getUnreadForSales() + 1);
        }
        conversationRepository.save(conv);
        return msg;
    }

    private LiveChatConversation getByToken(String token) {
        return conversationRepository.findBySessionToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("LiveChatConversation", "sessionToken", token));
    }

    private LiveChatDto.StartSessionResponse toStartResponse(LiveChatConversation conv) {
        LiveChatDto.StartSessionResponse r = new LiveChatDto.StartSessionResponse();
        r.setSessionToken(conv.getSessionToken());
        r.setConversationId(conv.getId());
        r.setAssignedSalesUserId(conv.getAssignedSalesUserId());
        salesAutoAssignService.resolveSalesName(conv.getAssignedSalesUserId())
                .ifPresent(r::setAssignedSalesName);
        return r;
    }

    private LiveChatDto.ConversationSummary toSummary(LiveChatConversation conv) {
        LiveChatDto.ConversationSummary s = new LiveChatDto.ConversationSummary();
        s.setId(conv.getId());
        s.setSessionToken(conv.getSessionToken());
        s.setChannel(conv.getChannel().name());
        s.setGuestName(conv.getGuestName());
        s.setGuestPhone(conv.getGuestPhone());
        s.setGuestEmail(conv.getGuestEmail());
        s.setCustomerUserId(conv.getCustomerUserId());
        s.setGuestDisplayLabel(buildGuestDisplayLabel(conv));
        s.setStatus(conv.getStatus().name());
        s.setAssignedSalesUserId(conv.getAssignedSalesUserId());
        salesAutoAssignService.resolveSalesName(conv.getAssignedSalesUserId()).ifPresent(s::setAssignedSalesName);
        s.setUnreadForSales(conv.getUnreadForSales());
        s.setLastMessageAt(conv.getLastMessageAt());
        messageRepository.findByConversationIdOrderByIdAsc(conv.getId()).stream()
                .reduce((a, b) -> b)
                .ifPresent(m -> s.setLastPreview(truncate(m.getBody(), 80)));
        return s;
    }

    private LiveChatDto.MessageResponse toMessage(LiveChatMessage m) {
        LiveChatDto.MessageResponse r = new LiveChatDto.MessageResponse();
        r.setId(m.getId());
        r.setSenderType(m.getSenderType().name());
        r.setSenderUserId(m.getSenderUserId());
        r.setBody(m.getBody());
        r.setCreatedAt(m.getCreatedAt());
        if (m.getSenderUserId() != null) {
            userRepository.findById(m.getSenderUserId()).ifPresent(u -> r.setSenderName(u.getName()));
        } else if (m.getSenderType() == LiveChatMessage.SenderType.CUSTOMER) {
            conversationRepository.findById(m.getConversationId()).ifPresent(conv -> {
                if (conv.getCustomerUserId() != null && conv.getGuestName() != null) {
                    r.setSenderName(conv.getGuestName());
                } else if (StringUtils.hasText(conv.getGuestName())) {
                    r.setSenderName(conv.getGuestName());
                } else {
                    r.setSenderName("Khách web");
                }
            });
            if (r.getSenderName() == null) {
                r.setSenderName("Khách web");
            }
        } else if (m.getSenderType() == LiveChatMessage.SenderType.SYSTEM) {
            r.setSenderName("Hệ thống");
        }
        return r;
    }

    private String buildGuestDisplayLabel(LiveChatConversation conv) {
        StringBuilder sb = new StringBuilder();
        if (conv.getCustomerUserId() != null) {
            sb.append(StringUtils.hasText(conv.getGuestName()) ? conv.getGuestName() : "Khách");
            sb.append(" · KH#").append(conv.getCustomerUserId());
        } else {
            sb.append(StringUtils.hasText(conv.getGuestName()) ? conv.getGuestName() : "Khách web");
        }
        if (StringUtils.hasText(conv.getGuestPhone())) {
            sb.append(" · ").append(conv.getGuestPhone());
        }
        if (StringUtils.hasText(conv.getGuestEmail())) {
            sb.append(" · ").append(conv.getGuestEmail());
        }
        return sb.toString();
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
