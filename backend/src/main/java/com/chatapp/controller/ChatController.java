package com.chatapp.controller;

import com.chatapp.dto.MessageDTO;
import com.chatapp.model.Group;
import com.chatapp.model.GroupMember;
import com.chatapp.model.Message;
import com.chatapp.model.MediaMessage;
import com.chatapp.repository.GroupMemberRepository;
import com.chatapp.repository.GroupRepository;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.MediaMessageRepository;
import com.chatapp.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api")
public class ChatController {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private GroupMemberRepository groupMemberRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private MediaMessageRepository mediaMessageRepository;

    // -----------------------------
    // Fetch message history
    // -----------------------------
    @GetMapping("/groups/{groupId}/messages")
    public ResponseEntity<?> getGroupMessages(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        try {
            Long userId = extractUserIdFromHeader(authHeader);

            boolean member = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
            if (!member) {
                return errorResponse("User not in group", 403);
            }

            int page = offset / limit;
            Pageable pageable = PageRequest.of(page, limit);

            List<Message> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId, pageable);

            // Convert to DTO
            List<MessageDTO> dtoList = messages.stream().map(this::toDTO).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "group_id", groupId,
                    "messages", dtoList
            ));
        } catch (Exception e) {
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // -----------------------------
    // Upload Media (REST)
    // -----------------------------
    @PostMapping("/groups/{groupId}/media")
    public ResponseEntity<?> uploadMedia(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long groupId,
            @RequestParam("file") MultipartFile file
    ) {
        try {
            Long userId = extractUserIdFromHeader(authHeader);

            boolean member = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
            if (!member) {
                return errorResponse("User not in group", 403);
            }

            // Save file locally (for LAN prototype)
            String uploadDir = "uploads/";
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(uploadDir, fileName);
            Files.write(filePath, file.getBytes());

            // Save media record in DB
            MediaMessage media = new MediaMessage();
            media.setFileName(file.getOriginalFilename());
            media.setFileType(file.getContentType());
            media.setFileSize(file.getSize());
            media.setFilePath(filePath.toString());
            media.setUploadedAt(Instant.now());
            mediaMessageRepository.save(media);

            return ResponseEntity.ok(Map.of(
                    "media_id", media.getMediaId(),
                    "file_name", media.getFileName(),
                    "file_type", media.getFileType(),
                    "file_size", media.getFileSize(),
                    "file_path", media.getFilePath()
            ));

        } catch (Exception e) {
            return errorResponse("Upload failed: " + e.getMessage(), 500);
        }
    }

    // -----------------------------
    // Create group
    // -----------------------------
    @PostMapping("/group/create")
    public ResponseEntity<?> createGroup(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> body
    ) {
        try {
            Long creatorId = extractUserIdFromHeader(authHeader);
            String groupName = (String) body.getOrDefault("group_name", "New Group");
            List<?> memberIdsRaw = (List<?>) body.getOrDefault("member_ids", new ArrayList<>());
            List<Long> memberIds = memberIdsRaw.stream()
                    .map(o -> Long.valueOf(o.toString()))
                    .collect(Collectors.toList());

            if (!memberIds.contains(creatorId)) memberIds.add(creatorId);

            Group group = new Group();
            group.setGroupName(groupName);
            group.setCreatedBy(creatorId);
            group.setCreatedAt(LocalDateTime.now());
            group.setIsDirect(memberIds.size() == 2);
            groupRepository.save(group);

            for (Long uid : memberIds) {
                GroupMember gm = new GroupMember();
                gm.setGroupId(group.getGroupId());
                gm.setUserId(uid);
                groupMemberRepository.save(gm);
            }

            return ResponseEntity.ok(Map.of(
                    "group_id", group.getGroupId(),
                    "group_name", group.getGroupName(),
                    "member_ids", memberIds
            ));

        } catch (Exception e) {
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // -----------------------------
    // Fetch user groups
    // -----------------------------
    @GetMapping("/groups")
    public ResponseEntity<?> getUserGroups(@RequestHeader("Authorization") String authHeader) {
        try {
            Long userId = extractUserIdFromHeader(authHeader);

            List<GroupMember> memberships = groupMemberRepository.findByUserId(userId);
            List<Long> groupIds = memberships.stream().map(GroupMember::getGroupId).collect(Collectors.toList());

            List<Group> groups = groupRepository.findAllById(groupIds);

            return ResponseEntity.ok(groups);
        } catch (Exception e) {
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // -----------------------------
    // Fetch group members
    // -----------------------------
    @GetMapping("/groups/{groupId}/members")
    public ResponseEntity<?> getGroupMembers(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long groupId
    ) {
        try {
            Long userId = extractUserIdFromHeader(authHeader);

            boolean member = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
            if (!member) return errorResponse("User not in group", 403);

            List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
            List<Long> memberIds = members.stream().map(GroupMember::getUserId).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "group_id", groupId,
                    "member_ids", memberIds
            ));
        } catch (Exception e) {
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // -----------------------------
    // Helpers
    // -----------------------------
    private Long extractUserIdFromHeader(String authHeader) throws Exception {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new Exception("Invalid header");
        }
        String token = authHeader.substring(7);
        return jwtService.validateTokenAndGetUserId(token);
    }

    private ResponseEntity<Map<String, Object>> errorResponse(String message, int code) {
        return ResponseEntity.status(code).body(Map.of(
                "error", message,
                "code", code
        ));
    }

    private MessageDTO toDTO(Message m) {
        Map<String, Object> media = null;
        if (m.getMediaMessage() != null) {
            media = Map.of(
                    "media_id", m.getMediaMessage().getMediaId(),
                    "file_name", m.getMediaMessage().getFileName(),
                    "file_type", m.getMediaMessage().getFileType(),
                    "file_size", m.getMediaMessage().getFileSize(),
                    "file_path", m.getMediaMessage().getFilePath(),
                    "uploaded_at", m.getMediaMessage().getUploadedAt()
            );
        }
        return new MessageDTO(
                m.getMessageId(),
                m.getSenderId(),
                m.getGroupId(),
                m.getContent(),
                m.getCreatedAt(),
                media,
                true
        );
    }
}
