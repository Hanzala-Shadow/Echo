package com.chatapp.repository;


import com.chatapp.model.GroupPublicKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface GroupPublicKeyRepository extends JpaRepository<GroupPublicKey, Long> {
}