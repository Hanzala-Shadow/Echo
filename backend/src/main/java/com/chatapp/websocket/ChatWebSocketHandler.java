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
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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

    // Executor and queue for smooth broadcasting
    private final ExecutorService broadcastExecutor = Executors.newCachedThreadPool();
    private final ConcurrentLinkedQueue<StatusUpdate> statusUpdateQueue = new ConcurrentLinkedQueue<>();

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

        // Send current online users list to the newly connected user
        sendCurrentOnlineUsers(session, userId);

        // Notify others that this user is now online
        broadcastStatus(userId, true);

        // Deliver undelivered messages
        List<MessageDelivery> undelivered = chatService.getUndeliveredMessages(userId);
        for (MessageDelivery delivery : undelivered) {
            Map<String, Object> payload = chatService.buildMessagePayload(delivery.getMessage(), true);
            session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
            chatService.markAsDelivered(delivery);
        }
    }

    /** Send the current online users to a newly connected client */
    private void sendCurrentOnlineUsers(WebSocketSession session, Long currentUserId) throws Exception {
        // Send current user status first
        Map<String, Object> currentUserStatus = new HashMap<>();
        currentUserStatus.put("type", "status_update");
        currentUserStatus.put("user_id", currentUserId);
        currentUserStatus.put("online_status", true);

        User currentUser = userRepository.findById(currentUserId).orElse(null);
        if (currentUser != null) {
            currentUserStatus.put("username", currentUser.getUsername());
        }

        session.sendMessage(new TextMessage(mapper.writeValueAsString(currentUserStatus)));

        // Send all other online users
        for (Long onlineUserId : onlineUsers.keySet()) {
            if (onlineUserId.equals(currentUserId)) continue;

            User onlineUser = userRepository.findById(onlineUserId).orElse(null);
            if (onlineUser == null) continue;

            Map<String, Object> status = new HashMap<>();
            status.put("type", "status_update");
            status.put("user_id", onlineUserId);
            status.put("online_status", true);
            status.put("username", onlineUser.getUsername());

            session.sendMessage(new TextMessage(mapper.writeValueAsString(status)));
        }
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        Map<String, Object> payload = mapper.readValue(
                message.getPayload().toString(),
                new TypeReference<Map<String, Object>>() {}
        );

        String messageType = (String) payload.get("type");

        switch (messageType) {
            case "message":
                chatService.handleIncomingMessage(payload, onlineUsers);
                break;

            case "typing_start":
            case "typing_stop":
                handleTypingIndicator(payload);
                break;

            case "user_joined":
                handleUserJoined(payload);
                break;

            case "user_left":
                handleUserLeft(payload);
                break;

            default:
                System.out.println("Unknown message type: " + messageType);
        }
    }

    private void handleTypingIndicator(Map<String, Object> payload) throws Exception {
        Long groupId = Long.valueOf(payload.get("group_id").toString());
        Long userId = Long.valueOf(payload.get("user_id").toString());
        String type = (String) payload.get("type");

        Map<String, Object> broadcastPayload = new HashMap<>();
        broadcastPayload.put("type", type);
        broadcastPayload.put("group_id", groupId);
        broadcastPayload.put("user_id", userId);

        broadcastToAll(broadcastPayload, userId);
    }

    private void handleUserJoined(Map<String, Object> payload) {
        System.out.println("User joined group: " + payload);
    }

    private void handleUserLeft(Map<String, Object> payload) {
        System.out.println("User left group: " + payload);
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

            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                user.setOnlineStatus(false);
                userRepository.save(user);
            }

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
    private void broadcastStatus(Long userId, boolean online) {
        statusUpdateQueue.offer(new StatusUpdate(userId, online));
        broadcastExecutor.submit(this::processStatusUpdates);
    }

    private void processStatusUpdates() {
        try {
            StatusUpdate update;
            while ((update = statusUpdateQueue.poll()) != null) {
                Map<String, Object> status = new HashMap<>();
                status.put("type", "status_update");
                status.put("user_id", update.userId);
                status.put("online_status", update.online);

                User user = userRepository.findById(update.userId).orElse(null);
                if (user != null) {
                    status.put("username", user.getUsername());
                }

                String msg = mapper.writeValueAsString(status);
                for (WebSocketSession s : onlineUsers.values()) {
                    if (s.isOpen()) s.sendMessage(new TextMessage(msg));
                }
            }
        } catch (Exception e) {
            System.out.println("Error processing status updates: " + e.getMessage());
        }
    }

    private void broadcastToAll(Map<String, Object> payload, Long senderId) throws Exception {
        String message = mapper.writeValueAsString(payload);
        TextMessage textMessage = new TextMessage(message);
        for (Map.Entry<Long, WebSocketSession> entry : onlineUsers.entrySet()) {
            if (!entry.getKey().equals(senderId) && entry.getValue().isOpen()) {
                entry.getValue().sendMessage(textMessage);
            }
        }
    }

    public void disconnectUser(Long userId) throws Exception {
        WebSocketSession session = onlineUsers.get(userId);
        if (session != null && session.isOpen()) {
            session.close(CloseStatus.NORMAL);
        }
    }

    public void forceOfflineStatus(Long userId) throws Exception {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            user.setOnlineStatus(false);
            userRepository.save(user);
            broadcastStatus(userId, false);
        }
    }

    /** Helper record for queued status updates */
    private static class StatusUpdate {
        final Long userId;
        final boolean online;
        StatusUpdate(Long userId, boolean online) {
            this.userId = userId;
            this.online = online;
        }
    }
}
