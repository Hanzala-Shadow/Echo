package com.chatapp.service;

import com.chatapp.model.Group;
import com.chatapp.model.GroupMember;
import com.chatapp.model.Message;
import com.chatapp.model.MessageDelivery;
import com.chatapp.model.MediaMessage;
import com.chatapp.repository.GroupRepository;
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
import java.time.format.DateTimeFormatter;
import java.time.ZoneOffset;

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
    private GroupRepository groupRepository;

    @Autowired
    private ObjectMapper mapper;

    /**
     * Handle incoming WebSocket message
     * Payload:
     * { type: "message", sender_id, group_id, content?, media_id? }
     */
    @Transactional
    public void handleIncomingMessage(Map<String, Object> payload, Map<Long, WebSocketSession> onlineUsers)
            throws Exception {
        // Validate payload
        if (payload == null || payload.get("sender_id") == null || payload.get("group_id") == null) {
            System.out.println("Invalid payload: " + payload);
            return;
        }

        Long senderId = Long.valueOf(payload.get("sender_id").toString());
        Long groupId = Long.valueOf(payload.get("group_id").toString());
        String content = payload.get("content") != null ? payload.get("content").toString() : null;
        String messageType = payload.get("type") != null ? payload.get("type").toString() : "message";

        if (groupId == null)
            return;

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
            if (gm.getUserId().equals(senderId))
                continue;

            Long recipientId = gm.getUserId();
            MessageDelivery delivery = new MessageDelivery(msg, userRepository.findById(recipientId).orElseThrow());

            boolean delivered = onlineUsers.containsKey(recipientId) && onlineUsers.get(recipientId).isOpen();
            delivery.setDelivered(delivered);
            messageDeliveryRepository.save(delivery);

            // Deliver if online
            if (delivered) {
                Map<String, Object> dto = buildMessagePayload(msg, true);
                // Add message type to payload
                dto.put("type", messageType);
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

    // Leave Group for User
    // Leave Group for User
    @Transactional
    public void leaveGroup(Long userId, Long groupId) {
        // Fetch group
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check if user is the admin
        if (group.getCreatedBy().equals(userId)) {
            throw new RuntimeException("Admin cannot leave the group. Transfer ownership first.");
        }

        // Check membership
        GroupMember membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new RuntimeException("User is not a member of this group"));

        // Delete membership
        groupMemberRepository.delete(membership);
    }

    // Add to Group
    @Transactional
    public void addMemberToGroup(Long adminId, Long groupId, Long newUserId) {
        // Fetch group
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check admin
        if (!group.getCreatedBy().equals(adminId)) {
            throw new RuntimeException("Only the admin can add members");
        }

        // Check if already a member
        boolean alreadyMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, newUserId);
        if (alreadyMember) {
            throw new RuntimeException("User is already a member of the group");
        }

        // Add new member
        GroupMember newMember = new GroupMember();
        newMember.setGroupId(groupId);
        newMember.setUserId(newUserId);
        groupMemberRepository.save(newMember);

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
        // Format timestamp consistently as ISO string
        msgResponse.put("created_at", m.getCreatedAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT));
        msgResponse.put("delivered", delivered);
        msgResponse.put("type", "message");

        String senderName = userRepository.findById(m.getSenderId())
                .map(user -> user.getUsername())
                .orElse("Unknown");

        msgResponse.put("sender_name", senderName);

        if (m.getMediaMessage() != null) {
            MediaMessage media = m.getMediaMessage();
            Map<String, Object> mediaInfo = new HashMap<>();
            mediaInfo.put("media_id", media.getMediaId());
            mediaInfo.put("file_name", media.getFileName());
            mediaInfo.put("file_type", media.getFileType());
            mediaInfo.put("file_size", media.getFileSize());
            mediaInfo.put("file_path", media.getFilePath());
            // Format timestamp consistently as ISO string
            mediaInfo.put("uploaded_at", media.getUploadedAt().toString());
            msgResponse.put("media", mediaInfo);
        }

        return msgResponse;
    }
}