package com.chatapp.service;

import com.chatapp.model.GroupMember;
import com.chatapp.model.Message;
import com.chatapp.model.MessageDelivery;
import com.chatapp.repository.GroupMemberRepository;
import com.chatapp.repository.MessageDeliveryRepository;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.UserRepository;

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
    private ObjectMapper mapper;

    /**
     * Handle incoming WebSocket message
     * Payload: {type: "message", sender_id, group_id, content}
     */
    @Transactional
    public void handleIncomingMessage(Map<String, Object> payload, Map<Long, WebSocketSession> onlineUsers) throws Exception {
        Long senderId = Long.valueOf(payload.get("sender_id").toString());
        Long groupId = payload.get("group_id") != null ? Long.valueOf(payload.get("group_id").toString()) : null;
        String content = payload.get("content").toString();

        if (groupId == null) return;

        // Save message
        Message msg = new Message();
        msg.setSenderId(senderId);
        msg.setGroupId(groupId);
        msg.setContent(content);
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
                // Force initialization of lazy-loaded message fields
                Message m = delivery.getMessage();
                m.getCreatedAt(); // ensures LocalDateTime is loaded

                Map<String, Object> msgResponse = new HashMap<>();
                msgResponse.put("message_id", m.getMessageId());
                msgResponse.put("sender_id", m.getSenderId());
                msgResponse.put("group_id", m.getGroupId());
                msgResponse.put("content", m.getContent());
                msgResponse.put("created_at", m.getCreatedAt());
                msgResponse.put("delivered", true);

                WebSocketSession ws = onlineUsers.get(recipientId);
                ws.sendMessage(new TextMessage(mapper.writeValueAsString(msgResponse)));
            }
        }
    }

    /**
     * Fetch undelivered messages for a user
     */
    @Transactional
    public List<MessageDelivery> getUndeliveredMessages(Long userId) {
        List<MessageDelivery> deliveries = messageDeliveryRepository.findByUserUserIdAndDeliveredFalse(userId);

        // Force initialization of lazy-loaded Message objects
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
    public List<Message> getGroupMessageHistory(Long groupId, int limit, int offset) {
        Pageable pageable = PageRequest.of(offset / limit, limit);
        return messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId, pageable);
    }
}
