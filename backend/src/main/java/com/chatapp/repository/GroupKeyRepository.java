package com.chatapp.repository;


import com.chatapp.model.GroupKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.Optional;


@Repository
public interface GroupKeyRepository extends JpaRepository<GroupKey, Long> {
Optional<GroupKey> findByGroupIdAndUserId(Long groupId, Long userId);
}