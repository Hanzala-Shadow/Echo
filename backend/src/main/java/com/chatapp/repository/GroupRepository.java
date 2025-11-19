package com.chatapp.repository;

import com.chatapp.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupRepository extends JpaRepository<Group, Long> {

    List<Group> findByCreatedBy(Long userId);
    
    // Find AI enabled status
    @Query("SELECT g.aiEnabled FROM Group g WHERE g.groupId = :groupId")
    Optional<Boolean> findAiEnabledByGroupId(@Param("groupId") Long groupId);
}