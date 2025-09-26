package com.chatapp.repository;

import com.chatapp.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByGroupIdOrderByCreatedAtAsc(Long groupId, Pageable pageable);

}
