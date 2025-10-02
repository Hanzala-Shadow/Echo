package com.chatapp.service;

import com.chatapp.model.GroupMember;
import com.chatapp.model.Message;
import com.chatapp.model.MessageDelivery;
import com.chatapp.model.MediaMessage;
import com.chatapp.repository.GroupMemberRepository;
import com.chatapp.repository.MessageDeliveryRepository;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.UserRepository;
import com.chatapp.repository.MediaMessageRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import jakarta.transaction.Transactional;
import java.util.*;

@Service
public class ChatService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private GroupMemberRepository groupMemberRepository;

    @Autowired
    private MessageDeliveryRepository messageDeliveryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MediaMessageRepository mediaMessageRepository;

    @Autowired
    private ObjectMapper mapper;

    /**
     * Handle incoming WebSocket message
     * Payload:
     * { type: "message", sender_id, group_id, content?, media_id? }
     */
    @Transactional
    public void handleIncomingMessage(Map<String, Object> payload, Map<Long, WebSocketSession> onlineUsers) throws Exception {
        Long senderId = Long.valueOf(payload.get("sender_id").toString());
        Long groupId = payload.get("group_id") != null ? Long.valueOf(payload.get("group_id").toString()) : null;
        String content = payload.get("content") != null ? payload.get("content").toString() : null;

        if (groupId == null) return;

        // Build message
        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setGroupId(groupId);
        msg.setContent(content);

        // If media_id provided, link media
        if (payload.get("media_id") != null) {
            Long mediaId = Long.valueOf(payload.get("media_id").toString());
            MediaMessage mediaMessage = mediaMessageRepository.findById(mediaId).orElse(null);
            msg.setMediaMessage(mediaMessage);
        }

        // Save message
        messageRepository.save(msg);

        // Fetch group members
        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);

        for (GroupMember gm : members) {
            if (gm.getUserId().equals(senderId)) continue;

            Long recipientId = gm.getUserId();
            MessageDelivery delivery = new MessageDelivery(msg, userRepository.findById(recipientId).orElseThrow());

            boolean delivered = onlineUsers.containsKey(recipientId) && onlineUsers.get(recipientId).isOpen();
            delivery.setDelivered(delivered);
            messageDeliveryRepository.save(delivery);

            // Deliver if online
            if (delivered) {
                Map<String, Object> dto = buildMessagePayload(msg, true);
                WebSocketSession ws = onlineUsers.get(recipientId);
                ws.sendMessage(new TextMessage(mapper.writeValueAsString(dto)));
            }
        }
    }

    /**
     * Fetch undelivered messages for a user
     */
    @Transactional
    public List<MessageDelivery> getUndeliveredMessages(Long userId) {
        List<MessageDelivery> deliveries = messageDeliveryRepository.findByUserUserIdAndDeliveredFalse(userId);
        deliveries.forEach(d -> d.getMessage().getCreatedAt());
        return deliveries;
    }

    /**
     * Mark message as delivered
     */
    public void markAsDelivered(MessageDelivery delivery) {
        delivery.setDelivered(true);
        messageDeliveryRepository.save(delivery);
    }

    /**
     * Fetch message history for a group with pagination
     */
    public List<Map<String, Object>> getGroupMessageHistory(Long groupId, int limit, int offset) {
        Pageable pageable = PageRequest.of(offset / limit, limit);
        List<Message> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId, pageable);

        List<Map<String, Object>> dtoList = new ArrayList<>();
        for (Message m : messages) {
            dtoList.add(buildMessagePayload(m, true));
        }
        return dtoList;
    }

    // -----------------------------
    // Helpers
    // -----------------------------
    public Map<String, Object> buildMessagePayload(Message m, boolean delivered) {
        Map<String, Object> msgResponse = new HashMap<>();
        msgResponse.put("message_id", m.getMessageId());
        msgResponse.put("sender_id", m.getSenderId());
        msgResponse.put("group_id", m.getGroupId());
        msgResponse.put("content", m.getContent());
        msgResponse.put("created_at", m.getCreatedAt());
        msgResponse.put("delivered", delivered);

        if (m.getMediaMessage() != null) {
            MediaMessage media = m.getMediaMessage();
            Map<String, Object> mediaInfo = new HashMap<>();
            mediaInfo.put("media_id", media.getMediaId());
            mediaInfo.put("file_name", media.getFileName());
            mediaInfo.put("file_type", media.getFileType());
            mediaInfo.put("file_size", media.getFileSize());
            mediaInfo.put("file_path", media.getFilePath());
            mediaInfo.put("uploaded_at", media.getUploadedAt());
            msgResponse.put("media", mediaInfo);
        }

        return msgResponse;
    }
}
