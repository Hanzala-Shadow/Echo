package com.chatapp.controller;

import com.chatapp.model.Group;
import com.chatapp.model.GroupMember;
import com.chatapp.model.Message;
import com.chatapp.repository.GroupMemberRepository;
import com.chatapp.repository.GroupRepository;
import com.chatapp.repository.MessageRepository;
import com.chatapp.service.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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

        // Verify user is in group
        boolean member = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
        if (!member) {
            return errorResponse("User not in group", 403);
        }

        // Calculate page number from offset
        int page = offset / limit;
        Pageable pageable = PageRequest.of(page, limit);

        List<Message> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId, pageable);

        Map<String, Object> response = new HashMap<>();
        response.put("group_id", groupId);
        response.put("messages", messages);

        return ResponseEntity.ok(response);
    } catch (Exception e) {
        return errorResponse("Unauthorized or invalid token", 401);
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

            // Include creator
            if (!memberIds.contains(creatorId)) memberIds.add(creatorId);

            Group group = new Group();
            group.setGroupName(groupName);
            group.setCreatedBy(creatorId);
            group.setCreatedAt(LocalDateTime.now());
            group.setIsDirect(memberIds.size() == 2);
            groupRepository.save(group);

            // Save group members
            for (Long uid : memberIds) {
                GroupMember gm = new GroupMember();
                gm.setGroupId(group.getGroupId());
                gm.setUserId(uid);
                groupMemberRepository.save(gm);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("group_id", group.getGroupId());
            response.put("group_name", group.getGroupName());
            response.put("member_ids", memberIds);

            return ResponseEntity.ok(response);

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

            // Verify membership
            boolean member = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
            if (!member) return errorResponse("User not in group", 403);

            List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
            List<Long> memberIds = members.stream().map(GroupMember::getUserId).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("group_id", groupId, "member_ids", memberIds));
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
}
