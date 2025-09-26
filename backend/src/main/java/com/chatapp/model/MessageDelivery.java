package com.chatapp.model;

import jakarta.persistence.*;

@Entity
@Table(name = "message_delivery")
public class MessageDelivery {

    @EmbeddedId
    private MessageDeliveryId id;

    @ManyToOne(fetch = FetchType.EAGER)
    @MapsId("messageId")
    @JoinColumn(name = "message_id")
    private Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private boolean delivered = false;

    // Constructors
    public MessageDelivery() {}

    public MessageDelivery(Message message, User user) {
        this.message = message;
        this.user = user;
        this.id = new MessageDeliveryId(message.getMessageId(), user.getUserId());
    }

    // Getters & Setters
    public Message getMessage() { return message; }
    public void setMessage(Message message) { this.message = message; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public boolean isDelivered() { return delivered; }
    public void setDelivered(boolean delivered) { this.delivered = delivered; }

    public MessageDeliveryId getId() { return id; }
    public void setId(MessageDeliveryId id) { this.id = id; }
}
