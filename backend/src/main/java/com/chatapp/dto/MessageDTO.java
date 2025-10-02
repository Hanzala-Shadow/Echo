package com.chatapp.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class MessageDTO {
    private Long messageId;
    private Long senderId;
    private Long groupId;
    private String content;
    private LocalDateTime createdAt;

    // Optional media info (null if text-only)
    private Map<String, Object> media;

    private boolean delivered;

    // --- Constructors ---
    public MessageDTO() {}

    public MessageDTO(Long messageId, Long senderId, Long groupId, String content,
                      LocalDateTime createdAt, Map<String, Object> media, boolean delivered) {
        this.messageId = messageId;
        this.senderId = senderId;
        this.groupId = groupId;
        this.content = content;
        this.createdAt = createdAt;
        this.media = media;
        this.delivered = delivered;
    }

    // --- Getters & Setters ---
    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Map<String, Object> getMedia() { return media; }
    public void setMedia(Map<String, Object> media) { this.media = media; }

    public boolean isDelivered() { return delivered; }
    public void setDelivered(boolean delivered) { this.delivered = delivered; }
}
