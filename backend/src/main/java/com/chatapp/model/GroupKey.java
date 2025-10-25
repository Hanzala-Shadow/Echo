package com.chatapp.model;


import jakarta.persistence.*;
import java.time.Instant;


@Entity
@Table(name = "group_keys")
public class GroupKey {


@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;


@Column(name = "group_id", nullable = false)
private Long groupId;


@Column(name = "user_id", nullable = false)
private Long userId;


@Column(name = "encrypted_group_private_key", nullable = false, columnDefinition = "text")
private String encryptedGroupPrivateKey;


@Column(name = "nonce", nullable = false)
private String nonce;


@Column(name = "created_at")
private Instant createdAt = Instant.now();


public GroupKey() {}


public Long getId() { return id; }
public void setId(Long id) { this.id = id; }


public Long getGroupId() { return groupId; }
public void setGroupId(Long groupId) { this.groupId = groupId; }


public Long getUserId() { return userId; }
public void setUserId(Long userId) { this.userId = userId; }


public String getEncryptedGroupPrivateKey() { return encryptedGroupPrivateKey; }
public void setEncryptedGroupPrivateKey(String encryptedGroupPrivateKey) { this.encryptedGroupPrivateKey = encryptedGroupPrivateKey; }


public String getNonce() { return nonce; }
public void setNonce(String nonce) { this.nonce = nonce; }


public Instant getCreatedAt() { return createdAt; }
public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}