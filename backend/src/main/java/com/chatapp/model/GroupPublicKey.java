package com.chatapp.model;


import jakarta.persistence.*;
import java.time.Instant;


@Entity
@Table(name = "group_public_keys")
public class GroupPublicKey {


@Id
@Column(name = "group_id")
private Long groupId;


@Column(name = "group_public_key", nullable = false, columnDefinition = "text")
private String groupPublicKey;


@Column(name = "created_at")
private Instant createdAt = Instant.now();


public GroupPublicKey() {}


public Long getGroupId() { return groupId; }
public void setGroupId(Long groupId) { this.groupId = groupId; }


public String getGroupPublicKey() { return groupPublicKey; }
public void setGroupPublicKey(String groupPublicKey) { this.groupPublicKey = groupPublicKey; }


public Instant getCreatedAt() { return createdAt; }
public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}