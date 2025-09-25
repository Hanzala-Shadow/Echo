package com.chatapp.websocket;

import com.chatapp.model.MessageDelivery;
import com.chatapp.model.User;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.ChatService;
import com.chatapp.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler implements WebSocketHandler {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatService chatService;

    @Autowired
    private ObjectMapper mapper;

    // Map<userId, WebSocketSession>
    private final Map<Long, WebSocketSession> onlineUsers = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // JWT from query param: ws://host/ws/messages?token=JWT
        String token = Objects.requireNonNull(session.getUri().getQuery()).split("=")[1];
        Long userId;

        try {
            userId = jwtService.validateTokenAndGetUserId(token);
        } catch (Exception e) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        // Mark user online
        User user = userRepository.findById(userId).orElseThrow();
        user.setOnlineStatus(true);
        userRepository.save(user);

        onlineUsers.put(userId, session);

        // Broadcast online status
        broadcastStatus(userId, true);

        // Send undelivered messages
        List<MessageDelivery> undelivered = chatService.getUndeliveredMessages(userId);
        for (MessageDelivery delivery : undelivered) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("message_id", delivery.getMessage().getMessageId());
            payload.put("sender_id", delivery.getMessage().getSenderId());
            payload.put("group_id", delivery.getMessage().getGroupId());
            payload.put("content", delivery.getMessage().getContent());
            payload.put("created_at", delivery.getMessage().getCreatedAt()); // LocalDateTime supported now
            payload.put("delivered", true);

            session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
            chatService.markAsDelivered(delivery);
        }
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        // Use TypeReference to ensure proper Map<String, Object> deserialization
        Map<String, Object> payload = mapper.readValue(
                message.getPayload().toString(),
                new TypeReference<Map<String, Object>>() {}
        );

        if ("message".equals(payload.get("type"))) {
            chatService.handleIncomingMessage(payload, onlineUsers);
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        session.close(CloseStatus.SERVER_ERROR);
    }

    @Override
public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
    Long userId = onlineUsers.entrySet().stream()
            .filter(e -> e.getValue().equals(session))
            .map(Map.Entry::getKey)
            .findFirst()
            .orElse(null);

    if (userId != null) {
        onlineUsers.remove(userId);

        User user = userRepository.findById(userId).orElseThrow();
        user.setOnlineStatus(false);
        userRepository.save(user);

        broadcastStatus(userId, false);

        // Log reason for debugging
        switch (closeStatus.getCode()) {
            case 1000: // NORMAL
                System.out.println("User " + userId + " disconnected normally (logout).");
                break;
            case 1001: // GOING_AWAY
                System.out.println("User " + userId + " disconnected (browser closed/tab closed).");
                break;
            case 1011: // SERVER_ERROR
                System.out.println("User " + userId + " disconnected due to server error.");
                break;
            default:
                System.out.println("User " + userId + " disconnected. Reason: " + closeStatus);
        }
    }
}

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    private void broadcastStatus(Long userId, boolean online) throws Exception {
        Map<String, Object> status = new HashMap<>();
        status.put("type", "status_update");
        status.put("user_id", userId);
        status.put("online_status", online);
        String msg = mapper.writeValueAsString(status);

        for (WebSocketSession s : onlineUsers.values()) {
            if (s.isOpen()) s.sendMessage(new TextMessage(msg));
        }
    }

    public void disconnectUser(Long userId) throws Exception {
         WebSocketSession session = onlineUsers.get(userId);
         if (session != null && session.isOpen()) {
            session.close(CloseStatus.NORMAL);
        }
    }

}
