package com.chatapp.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long messageId;

    @Column(nullable = false)
    private Long senderId;

    @Column(nullable = false)
    private Long groupId;

    // ✅ Keep text content optional (nullable) for media messages
    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ✅ Link to media message (nullable for text-only)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "media_id", referencedColumnName = "media_id")
    private MediaMessage mediaMessage;

    // Existing relationship with message delivery
    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL)
    private List<MessageDelivery> deliveries = new ArrayList<>();

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

    public MediaMessage getMediaMessage() { return mediaMessage; }
    public void setMediaMessage(MediaMessage mediaMessage) { this.mediaMessage = mediaMessage; }

    public List<MessageDelivery> getDeliveries() { return deliveries; }
    public void setDeliveries(List<MessageDelivery> deliveries) { this.deliveries = deliveries; }
}
