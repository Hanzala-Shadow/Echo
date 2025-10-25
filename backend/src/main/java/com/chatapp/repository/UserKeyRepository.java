package com.chatapp.repository;


import com.chatapp.model.UserKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface UserKeyRepository extends JpaRepository<UserKey, Long> {
    boolean existsByUserId(Long userId);
    Optional<UserKey> findByUserId(Long userId);
}
