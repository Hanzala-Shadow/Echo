package com.chatapp.model;


import jakarta.persistence.*;
import java.time.Instant;


@Entity
@Table(name = "user_keys")
public class UserKey {


@Id
@Column(name = "user_id")
private Long userId;


@Column(name = "public_key", nullable = false, columnDefinition = "text")
private String publicKey;


@Column(name = "encrypted_private_key", nullable = false, columnDefinition = "text")
private String encryptedPrivateKey;


@Column(name = "nonce", nullable = false)
private String nonce;


@Column(name = "salt", nullable = false)
private String salt;


@Column(name = "created_at")
private Instant createdAt = Instant.now();


public UserKey() {}


public Long getUserId() { return userId; }
public void setUserId(Long userId) { this.userId = userId; }


public String getPublicKey() { return publicKey; }
public void setPublicKey(String publicKey) { this.publicKey = publicKey; }


public String getEncryptedPrivateKey() { return encryptedPrivateKey; }
public void setEncryptedPrivateKey(String encryptedPrivateKey) { this.encryptedPrivateKey = encryptedPrivateKey; }


public String getNonce() { return nonce; }
public void setNonce(String nonce) { this.nonce = nonce; }


public String getSalt() { return salt; }
public void setSalt(String salt) { this.salt = salt; }


public Instant getCreatedAt() { return createdAt; }
public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

