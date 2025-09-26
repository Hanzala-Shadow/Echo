package com.chatapp.model;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class MessageDeliveryId implements Serializable {

    private Long messageId;
    private Long userId;

    public MessageDeliveryId() {}

    public MessageDeliveryId(Long messageId, Long userId) {
        this.messageId = messageId;
        this.userId = userId;
    }

    // equals & hashCode
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MessageDeliveryId)) return false;
        MessageDeliveryId that = (MessageDeliveryId) o;
        return Objects.equals(messageId, that.messageId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(messageId, userId);
    }

    // Getters & Setters
    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
}
