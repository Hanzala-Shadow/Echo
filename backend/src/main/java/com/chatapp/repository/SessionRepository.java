package com.chatapp.repository;

import com.chatapp.model.Session;
import com.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByToken(String token);
    void deleteByUser(User user);
}
