package com.chatapp.repository;

import com.chatapp.model.MediaMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MediaMessageRepository extends JpaRepository<MediaMessage, Long> {
}
