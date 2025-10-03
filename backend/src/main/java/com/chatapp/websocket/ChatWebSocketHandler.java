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
    private ChatService chatService; // ✅ Use ChatService for payload building

    @Autowired
    private ObjectMapper mapper;

    // Map<userId, WebSocketSession>
    private final Map<Long, WebSocketSession> onlineUsers = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String token = Objects.requireNonNull(session.getUri().getQuery()).split("=")[1];
        Long userId;

        try {
            userId = jwtService.validateTokenAndGetUserId(token);
        } catch (Exception e) {
            System.out.println("WebSocket connection error: " + e.getMessage());
            e.printStackTrace();
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        User user = userRepository.findById(userId).orElseThrow();
        user.setOnlineStatus(true);
        userRepository.save(user);

        onlineUsers.put(userId, session);

        broadcastStatus(userId, true);

        // ✅ Use ChatService.buildMessagePayload instead of local copy
        List<MessageDelivery> undelivered = chatService.getUndeliveredMessages(userId);
        for (MessageDelivery delivery : undelivered) {
            Map<String, Object> payload = chatService.buildMessagePayload(delivery.getMessage(), true);
            session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
            chatService.markAsDelivered(delivery);
        }
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
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

            switch (closeStatus.getCode()) {
                case 1000: System.out.println("User " + userId + " disconnected normally (logout)."); break;
                case 1001: System.out.println("User " + userId + " disconnected (browser/tab closed)."); break;
                case 1011: System.out.println("User " + userId + " disconnected due to server error."); break;
                default:   System.out.println("User " + userId + " disconnected. Reason: " + closeStatus);
            }
        }
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    /** Broadcast user online/offline status */
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
