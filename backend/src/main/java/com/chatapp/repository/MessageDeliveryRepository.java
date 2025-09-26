package com.chatapp.repository;

import com.chatapp.model.MessageDelivery;
import com.chatapp.model.MessageDeliveryId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageDeliveryRepository extends JpaRepository<MessageDelivery, MessageDeliveryId> {

    // Find undelivered messages for a specific user
    List<MessageDelivery> findByUserUserIdAndDeliveredFalse(Long userId);
}
