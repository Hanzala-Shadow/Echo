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
    private ChatService chatService; // ✅ Use ChatService for payload building

    @Autowired
    private ObjectMapper mapper;

    // Map<userId, WebSocketSession>
    private final Map<Long, WebSocketSession> onlineUsers = new ConcurrentHashMap<>();
    
    // Map to track file transfers
    private final Map<String, FileTransferInfo> fileTransfers = new ConcurrentHashMap<>();

    // Use a dedicated thread pool for broadcasting to avoid blocking
    private final ExecutorService broadcastExecutor = Executors.newCachedThreadPool();
    
    // Queue for status updates to ensure ordered processing
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
        
        // Broadcast status update to all other users
        broadcastStatus(userId, true);

        // ✅ Use ChatService.buildMessagePayload instead of local copy
        List<MessageDelivery> undelivered = chatService.getUndeliveredMessages(userId);
        for (MessageDelivery delivery : undelivered) {
            Map<String, Object> payload = chatService.buildMessagePayload(delivery.getMessage(), true);
            session.sendMessage(new TextMessage(mapper.writeValueAsString(payload)));
            chatService.markAsDelivered(delivery);
        }
    }
    
    /** Send current online users list to a newly connected user */
    private void sendCurrentOnlineUsers(WebSocketSession session, Long currentUserId) throws Exception {
        // Send status update for the current user first
        Map<String, Object> currentUserStatus = new HashMap<>();
        currentUserStatus.put("type", "status_update");
        currentUserStatus.put("user_id", currentUserId);
        currentUserStatus.put("online_status", true);
        
        User currentUser = userRepository.findById(currentUserId).orElse(null);
        if (currentUser != null) {
            currentUserStatus.put("user_name", currentUser.getUsername());
            currentUserStatus.put("username", currentUser.getUsername());
        }
        
        String currentUserMsg = mapper.writeValueAsString(currentUserStatus);
        session.sendMessage(new TextMessage(currentUserMsg));
        
        // Send status updates for all other currently connected users
        for (Map.Entry<Long, WebSocketSession> entry : onlineUsers.entrySet()) {
            Long onlineUserId = entry.getKey();
            WebSocketSession onlineSession = entry.getValue();
            
            // Skip the current user and any closed sessions
            if (onlineUserId.equals(currentUserId) || !onlineSession.isOpen()) {
                continue;
            }
            
            // Send status update for each online user
            Map<String, Object> status = new HashMap<>();
            status.put("type", "status_update");
            status.put("user_id", onlineUserId);
            status.put("online_status", true); // They're online by definition
            
            // Add user details
            User user = userRepository.findById(onlineUserId).orElse(null);
            if (user != null) {
                status.put("user_name", user.getUsername());
                status.put("username", user.getUsername());
            }
            
            String msg = mapper.writeValueAsString(status);
            session.sendMessage(new TextMessage(msg));
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
            case "file_start":
                handleFileStart(session, payload);
                break;
            case "file_chunk":
                handleFileChunk(session, payload);
                break;
            case "file_end":
                handleFileEnd(session, payload);
                break;
            case "file_cancel":
                handleFileCancel(session, payload);
                break;
            case "user_joined":
                handleUserJoined(session, payload);
                break;
            case "user_left":
                handleUserLeft(session, payload);
                break;
            case "typing_start":
            case "typing_stop":
                handleTypingIndicator(session, payload);
                break;
            default:
                System.out.println("Unknown message type: " + messageType);
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

    /** Broadcast user online/offline status with zero-latency optimization */
    private void broadcastStatus(Long userId, boolean online) throws Exception {
        // Create status update object
        StatusUpdate update = new StatusUpdate(userId, online);
        
        // Add to queue for processing
        statusUpdateQueue.offer(update);
        
        // Process immediately in a separate thread to avoid blocking
        broadcastExecutor.submit(this::processStatusUpdates);
    }
    
    /** Process queued status updates */
    private void processStatusUpdates() {
        try {
            StatusUpdate update;
            while ((update = statusUpdateQueue.poll()) != null) {
                // Build status message
                Map<String, Object> status = new HashMap<>();
                status.put("type", "status_update");
                status.put("user_id", update.userId);
                status.put("online_status", update.online);
                
                // Add user details for better client handling
                User user = userRepository.findById(update.userId).orElse(null);
                if (user != null) {
                    status.put("user_name", user.getUsername());
                    status.put("username", user.getUsername());
                }

                String msg = mapper.writeValueAsString(status);
                
                // Broadcast to all online users with optimized sending
                for (WebSocketSession s : onlineUsers.values()) {
                    if (s.isOpen()) {
                        try {
                            s.sendMessage(new TextMessage(msg));
                        } catch (Exception e) {
                            System.out.println("Error sending status update to session: " + e.getMessage());
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("Error processing status updates: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void disconnectUser(Long userId) throws Exception {
        WebSocketSession session = onlineUsers.get(userId);
        if (session != null && session.isOpen()) {
            session.close(CloseStatus.NORMAL);
        }
    }
    
    /**
     * Force a user's online status to false in the database
     * This ensures proper cleanup even if WebSocket disconnection fails
     */
    public void forceOfflineStatus(Long userId) throws Exception {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            user.setOnlineStatus(false);
            userRepository.save(user);
            
            // Also broadcast the status update to ensure all clients are in sync
            broadcastStatus(userId, false);
        }
    }
    
    // File transfer handlers
    private void handleFileStart(WebSocketSession session, Map<String, Object> payload) throws Exception {
        Long senderId = Long.valueOf(payload.get("sender_id").toString());
        Long groupId = Long.valueOf(payload.get("group_id").toString());
        String fileName = (String) payload.get("file_name");
        Long fileSize = Long.valueOf(payload.get("file_size").toString());
        String fileType = (String) payload.get("file_type");
        
        // Generate unique upload ID
        String uploadId = UUID.randomUUID().toString();
        
        // Store file transfer info
        FileTransferInfo transferInfo = new FileTransferInfo();
        transferInfo.senderId = senderId;
        transferInfo.groupId = groupId;
        transferInfo.fileName = fileName;
        transferInfo.fileSize = fileSize;
        transferInfo.fileType = fileType;
        transferInfo.uploadId = uploadId;
        transferInfo.chunks = new HashMap<>();
        
        fileTransfers.put(uploadId, transferInfo);
        
        // Broadcast file start to group members
        Map<String, Object> broadcastPayload = new HashMap<>();
        broadcastPayload.put("type", "file_start");
        broadcastPayload.put("upload_id", uploadId);
        broadcastPayload.put("sender_id", senderId);
        broadcastPayload.put("group_id", groupId);
        broadcastPayload.put("file_name", fileName);
        broadcastPayload.put("file_size", fileSize);
        broadcastPayload.put("file_type", fileType);
        
        broadcastToGroup(groupId, broadcastPayload, senderId);
    }
    
    private void handleFileChunk(WebSocketSession session, Map<String, Object> payload) throws Exception {
        String uploadId = (String) payload.get("upload_id");
        Integer chunkIndex = Integer.valueOf(payload.get("chunk_index").toString());
        List<Integer> chunkData = (List<Integer>) payload.get("chunk_data");
        Integer totalChunks = Integer.valueOf(payload.get("total_chunks").toString());
        
        FileTransferInfo transferInfo = fileTransfers.get(uploadId);
        if (transferInfo == null) {
            System.out.println("File transfer not found: " + uploadId);
            return;
        }
        
        // Store chunk
        transferInfo.chunks.put(chunkIndex, chunkData);
        
        // Broadcast chunk to group members
        Map<String, Object> broadcastPayload = new HashMap<>();
        broadcastPayload.put("type", "file_chunk");
        broadcastPayload.put("upload_id", uploadId);
        broadcastPayload.put("chunk_index", chunkIndex);
        broadcastPayload.put("chunk_data", chunkData);
        broadcastPayload.put("total_chunks", totalChunks);
        
        broadcastToGroup(transferInfo.groupId, broadcastPayload, transferInfo.senderId);
    }
    
    private void handleFileEnd(WebSocketSession session, Map<String, Object> payload) throws Exception {
        String uploadId = (String) payload.get("upload_id");
        String fileName = (String) payload.get("file_name");
        Long fileSize = Long.valueOf(payload.get("file_size").toString());
        
        FileTransferInfo transferInfo = fileTransfers.get(uploadId);
        if (transferInfo == null) {
            System.out.println("File transfer not found: " + uploadId);
            return;
        }
        
        // Broadcast file end to group members
        Map<String, Object> broadcastPayload = new HashMap<>();
        broadcastPayload.put("type", "file_end");
        broadcastPayload.put("upload_id", uploadId);
        broadcastPayload.put("file_name", fileName);
        broadcastPayload.put("file_size", fileSize);
        
        broadcastToGroup(transferInfo.groupId, broadcastPayload, transferInfo.senderId);
        
        // Clean up
        fileTransfers.remove(uploadId);
        
        // Create a file message entry
        Map<String, Object> fileMessagePayload = new HashMap<>();
        fileMessagePayload.put("type", "file");
        fileMessagePayload.put("sender_id", transferInfo.senderId);
        fileMessagePayload.put("group_id", transferInfo.groupId);
        fileMessagePayload.put("file_name", fileName);
        fileMessagePayload.put("file_size", fileSize);
        fileMessagePayload.put("file_type", transferInfo.fileType);
        
        // Handle as file message
        chatService.handleIncomingFileMessage(fileMessagePayload, onlineUsers);
    }
    
    private void handleFileCancel(WebSocketSession session, Map<String, Object> payload) throws Exception {
        String uploadId = (String) payload.get("upload_id");
        
        FileTransferInfo transferInfo = fileTransfers.get(uploadId);
        if (transferInfo == null) {
            System.out.println("File transfer not found: " + uploadId);
            return;
        }
        
        // Broadcast cancel to group members
        Map<String, Object> broadcastPayload = new HashMap<>();
        broadcastPayload.put("type", "file_cancel");
        broadcastPayload.put("upload_id", uploadId);
        
        broadcastToGroup(transferInfo.groupId, broadcastPayload, transferInfo.senderId);
        
        // Clean up
        fileTransfers.remove(uploadId);
    }
    
    private void handleUserJoined(WebSocketSession session, Map<String, Object> payload) throws Exception {
        // Handle user joining a group
        System.out.println("User joined group: " + payload);
    }
    
    private void handleUserLeft(WebSocketSession session, Map<String, Object> payload) throws Exception {
        // Handle user leaving a group
        System.out.println("User left group: " + payload);
    }
    
    private void handleTypingIndicator(WebSocketSession session, Map<String, Object> payload) throws Exception {
        // Handle typing indicators
        Long groupId = Long.valueOf(payload.get("group_id").toString());
        Long userId = Long.valueOf(payload.get("user_id").toString());
        String type = (String) payload.get("type");
        
        Map<String, Object> broadcastPayload = new HashMap<>();
        broadcastPayload.put("type", type);
        broadcastPayload.put("group_id", groupId);
        broadcastPayload.put("user_id", userId);
        
        broadcastToGroup(groupId, broadcastPayload, userId);
    }
    
    private void broadcastToGroup(Long groupId, Map<String, Object> payload, Long senderId) throws Exception {
        String message = mapper.writeValueAsString(payload);
        TextMessage textMessage = new TextMessage(message);
        
        // Get all group members (simplified - in real implementation, you'd query the database)
        for (WebSocketSession session : onlineUsers.values()) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(textMessage);
                } catch (Exception e) {
                    System.out.println("Error sending message to session: " + e.getMessage());
                }
            }
        }
    }
    
    // Inner class to track file transfer information
    private static class FileTransferInfo {
        Long senderId;
        Long groupId;
        String fileName;
        Long fileSize;
        String fileType;
        String uploadId;
        Map<Integer, List<Integer>> chunks;
    }
    
    // Inner class to represent a status update
    private static class StatusUpdate {
        final Long userId;
        final boolean online;
        
        StatusUpdate(Long userId, boolean online) {
            this.userId = userId;
            this.online = online;
        }
    }
}