package com.chatapp.controller;


import com.chatapp.model.UserKey;
import com.chatapp.model.GroupKey;
import com.chatapp.model.GroupPublicKey;
import com.chatapp.repository.UserKeyRepository;
import com.chatapp.repository.GroupKeyRepository;
import com.chatapp.repository.GroupPublicKeyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Optional;
import java.util.Map;


@RestController
@RequestMapping("/api/keys")
public class KeyController {


@Autowired
private UserKeyRepository userKeyRepository;


@Autowired
private GroupPublicKeyRepository groupPublicKeyRepository;


@Autowired
private GroupKeyRepository groupKeyRepository;
    //Register user keys (only once)
  @PostMapping("/user")
    public ResponseEntity<?> registerUserKeys(@RequestBody UserKey userKey) {
        if (userKeyRepository.existsByUserId(userKey.getUserId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Public/private key pair already exists for this user. Updating keys is not allowed.");
        }

        userKey.setCreatedAt(Instant.now());
        UserKey savedKey = userKeyRepository.save(userKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedKey);
    }

    // Fetch keys for login or sync
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserKeys(@PathVariable Long userId) {
        Optional<UserKey> userKey = userKeyRepository.findByUserId(userId);
        if (userKey.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Keys not found for this user.");
        }
        return ResponseEntity.ok(userKey.get());
    }


// POST /api/group-public
@PostMapping("/group-public")
public ResponseEntity<?> createGroupPublic(@RequestBody GroupPublicKey payload) {
    if (groupPublicKeyRepository.existsById(payload.getGroupId())) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "Group public key already exists"));
    }

    groupPublicKeyRepository.save(payload);
    return ResponseEntity.status(HttpStatus.CREATED).build();
}


// GET /api/group-public/{groupId}
@GetMapping("/group-public/{groupId}")
public ResponseEntity<?> getGroupPublic(@PathVariable Long groupId) {
Optional<GroupPublicKey> opt = groupPublicKeyRepository.findById(groupId);

System.out.println(opt);

return opt.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
}


// POST /api/keys/group-member
@PostMapping("/group-member")
public ResponseEntity<?> uploadGroupMemberKey(@RequestBody GroupKey payload) {
// payload must contain groupId, userId, encryptedGroupPrivateKey, nonce
// Upsert behavior: if row exists, update; otherwise insert
Optional<GroupKey> existing = groupKeyRepository.findByGroupIdAndUserId(payload.getGroupId(), payload.getUserId());
if (existing.isPresent()) {
GroupKey g = existing.get();
g.setEncryptedGroupPrivateKey(payload.getEncryptedGroupPrivateKey());
g.setNonce(payload.getNonce());
groupKeyRepository.save(g);
return ResponseEntity.ok().build();
} else {
groupKeyRepository.save(payload);
return ResponseEntity.status(HttpStatus.CREATED).build();
}
}


// GET /api/keys/group-member/{groupId}/{userId}
@GetMapping("/group-member/{groupId}/{userId}")
public ResponseEntity<?> getGroupMemberKey(@PathVariable Long groupId, @PathVariable Long userId) {
Optional<GroupKey> opt = groupKeyRepository.findByGroupIdAndUserId(groupId, userId);
return opt.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
}
}