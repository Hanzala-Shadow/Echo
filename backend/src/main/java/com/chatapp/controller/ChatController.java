package com.chatapp.controller;

import com.chatapp.dto.MessageDTO;
import com.chatapp.model.Group;
import com.chatapp.model.GroupMember;
import com.chatapp.model.Message;
import com.chatapp.model.User;
import com.chatapp.repository.GroupMemberRepository;
import com.chatapp.repository.GroupRepository;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.UserRepository;
import com.chatapp.service.ChatService;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatService chatService;

    // User leaves group
    @DeleteMapping("group/{groupId}/leave")
    public ResponseEntity<?> leaveGroup(
            @PathVariable Long groupId,
            @RequestHeader("Authorization") String authHeader) {

        try {
            // Extract token from header
            String token = authHeader.replace("Bearer ", "");
            Long userId = jwtService.validateTokenAndGetUserId(token);

            // Call ChatService
            chatService.leaveGroup(userId, groupId);

            return ResponseEntity.ok(Map.of("message", "Left group successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    // Admin adds a member
    @PostMapping("group/{groupId}/add-member")
    public ResponseEntity<?> addMember(
            @PathVariable Long groupId,
            @RequestParam Long adminId,
            @RequestParam Long userId) {
        try {
            chatService.addMemberToGroup(adminId, groupId, userId);
            return ResponseEntity.ok(Map.of("message", "Member added successfully"));
        } catch (RuntimeException e) {
            // Handles all RuntimeExceptions from service (already member, not admin, etc.)
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            // Any other unexpected exceptions
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }

    // -----------------------------
    // Fetch message history
    // -----------------------------
    @GetMapping("/groups/{groupId}/messages")
    public ResponseEntity<?> getGroupMessages(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset) {
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
                    "messages", dtoList));
        } catch (Exception e) {
            e.printStackTrace();
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // -----------------------------
    // Create group
    // -----------------------------
    @PostMapping("/group/create")
    public ResponseEntity<?> createGroup(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> body) {
        try {
            Long creatorId = extractUserIdFromHeader(authHeader);
            String groupName = (String) body.getOrDefault("group_name", "New Group");
            
            // Get AI enabled setting from request (default false)
            Boolean aiEnabled = body.containsKey("ai_enabled") 
            ? Boolean.valueOf(body.get("ai_enabled").toString()) 
            : false;
        
            List<?> memberIdsRaw = (List<?>) body.getOrDefault("member_ids", new ArrayList<>());
            List<Long> memberIds = memberIdsRaw.stream()
                    .map(o -> Long.valueOf(o.toString()))
                    .collect(Collectors.toList());

            if (!memberIds.contains(creatorId))
                memberIds.add(creatorId);

            // Check if this is a direct message (exactly 2 members)
            if (memberIds.size() == 2) {
                // Find the other user ID
                Long otherUserId = memberIds.stream()
                        .filter(id -> !id.equals(creatorId))
                        .findFirst()
                        .orElse(null);

                if (otherUserId != null) {
                    // Use synchronized method to create or get existing DM
                    Optional<Group> dmResult = createOrGetDM(creatorId, otherUserId, groupName, aiEnabled);
                    if (dmResult.isPresent()) {
                        Group group = dmResult.get();
                        return ResponseEntity.ok(Map.of(
                                "group_id", group.getGroupId(),
                                "group_name", group.getGroupName(),
                                "member_ids", memberIds,
                                "ai_enabled", group.getAiEnabled()));
                    }
                }
            }

            // For non-DM groups, proceed with normal creation
            Group group = new Group();
            group.setGroupName(groupName);
            group.setCreatedBy(creatorId);
            group.setCreatedAt(LocalDateTime.now());
            group.setIsDirect(memberIds.size() == 2);
            group.setAiEnabled(aiEnabled);

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
                    "member_ids", memberIds,
                    "ai_enabled", group.getAiEnabled()));

        } catch (Exception e) {
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // Helper method to find existing DM between two users
    private Optional<Group> findExistingDM(Long user1Id, Long user2Id) {
        // Find all groups where user1 is a member
        List<GroupMember> user1Memberships = groupMemberRepository.findByUserId(user1Id);
        List<Long> user1GroupIds = user1Memberships.stream()
                .map(GroupMember::getGroupId)
                .collect(Collectors.toList());

        // Find all groups where user2 is a member
        List<GroupMember> user2Memberships = groupMemberRepository.findByUserId(user2Id);
        List<Long> user2GroupIds = user2Memberships.stream()
                .map(GroupMember::getGroupId)
                .collect(Collectors.toList());

        // Find common groups
        List<Long> commonGroupIds = user1GroupIds.stream()
                .filter(user2GroupIds::contains)
                .collect(Collectors.toList());

        // Check each common group to see if it's a DM (exactly 2 members)
        for (Long groupId : commonGroupIds) {
            int memberCount = groupMemberRepository.countByGroupId(groupId);
            if (memberCount == 2) {
                // This is a DM between the two users
                Optional<Group> group = groupRepository.findById(groupId);
                if (group.isPresent() && group.get().getIsDirect()) {
                    return group;
                }
            }
        }

        return Optional.empty();
    }

    // Improved synchronized method to create or get existing DM
    private synchronized Optional<Group> createOrGetDM(Long user1Id, Long user2Id, String groupName, Boolean aiEnabled) {
        // Check if DM already exists
        Optional<Group> existingDM = findExistingDM(user1Id, user2Id);
        if (existingDM.isPresent()) {
            return existingDM;
        }

        // Create new DM
        Group group = new Group();
        group.setGroupName(groupName);
        group.setCreatedBy(user1Id);
        group.setCreatedAt(LocalDateTime.now());
        group.setIsDirect(true);
        group.setAiEnabled(aiEnabled);

        groupRepository.save(group);

        // Add both users as members
        GroupMember gm1 = new GroupMember();
        gm1.setGroupId(group.getGroupId());
        gm1.setUserId(user1Id);
        groupMemberRepository.save(gm1);

        GroupMember gm2 = new GroupMember();
        gm2.setGroupId(group.getGroupId());
        gm2.setUserId(user2Id);
        groupMemberRepository.save(gm2);

        return Optional.of(group);
    }

    // -----------------------------
    // Fetch user groups
    // -----------------------------
    @GetMapping("/groups")
    public ResponseEntity<?> getUserGroups(@RequestHeader("Authorization") String authHeader) {
        try {
            Long userId = extractUserIdFromHeader(authHeader);
            System.out.println("Fetching groups for user ID: " + userId);

            List<GroupMember> memberships = groupMemberRepository.findByUserId(userId);
            List<Long> groupIds = memberships.stream().map(GroupMember::getGroupId).collect(Collectors.toList());
            System.out.println("User belongs to groups with IDs: " + groupIds);

            List<Group> groups = groupRepository.findAllById(groupIds);

            // Add member count to each group
            List<Map<String, Object>> groupsWithMemberCount = groups.stream().map(group -> {
                int memberCount = groupMemberRepository.countByGroupId(group.getGroupId());
                System.out.println("Group ID " + group.getGroupId() + " has " + memberCount + " members");
                Map<String, Object> groupMap = new HashMap<>();
                groupMap.put("groupId", group.getGroupId());
                groupMap.put("groupName", group.getGroupName());
                groupMap.put("createdBy", group.getCreatedBy());
                groupMap.put("createdAt", group.getCreatedAt());
                groupMap.put("isDirect", group.getIsDirect());
                groupMap.put("memberCount", memberCount);
                groupMap.put("aiEnabled", group.getAiEnabled());
                return groupMap;
            }).collect(Collectors.toList());

            System.out.println("Returning groups data: " + groupsWithMemberCount);

            return ResponseEntity.ok(groupsWithMemberCount);
        } catch (Exception e) {
            System.err.println("Error in getUserGroups: " + e.getMessage());
            e.printStackTrace();
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // -----------------------------
    // Fetch group members
    // -----------------------------
    @GetMapping("/groups/{groupId}/members")
    public ResponseEntity<?> getGroupMembers(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long groupId) {
        try {
            Long userId = extractUserIdFromHeader(authHeader);

            boolean member = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
            if (!member)
                return errorResponse("User not in group", 403);

            List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);

            // Create a list of member info including online status
            List<Map<String, Object>> memberInfo = new ArrayList<>();
            for (GroupMember gm : members) {
                User user = userRepository.findById(gm.getUserId()).orElse(null);
                if (user != null) {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("user_id", user.getUserId());
                    userInfo.put("username", user.getUsername());
                    userInfo.put("online_status", user.getOnlineStatus());
                    memberInfo.add(userInfo);
                }
            }

            return ResponseEntity.ok(Map.of(
                    "group_id", groupId,
                    "members", memberInfo));
        } catch (Exception e) {
            return errorResponse("Unauthorized or invalid token", 401);
        }
    }

    // -----------------------------
    // Get AI status for a group (read-only)
    // -----------------------------
@GetMapping("/group/{groupId}/ai-status")
public ResponseEntity<?> getAIStatus(
        @RequestHeader("Authorization") String authHeader,
        @PathVariable Long groupId) {
    try {
        Long userId = extractUserIdFromHeader(authHeader);

        // Verify user is a member of the group
        boolean member = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
        if (!member) {
            return errorResponse("User not in group", 403);
        }

        // Get group
        Optional<Group> groupOpt = groupRepository.findById(groupId);
        if (groupOpt.isEmpty()) {
            return errorResponse("Group not found", 404);
        }

        Group group = groupOpt.get();

        return ResponseEntity.ok(Map.of(
                "group_id", groupId,
                "ai_enabled", group.getAiEnabled(),
                "message", "AI features are " + (group.getAiEnabled() ? "enabled" : "disabled") + " for this group"));
    } catch (Exception e) {
        return errorResponse("Unauthorized or invalid token", 401);
    }
}

    // -----------------------------
    // Fetch dashboard statistics
    // -----------------------------
    @GetMapping("/dashboard/stats")
    public ResponseEntity<?> getDashboardStats(@RequestHeader("Authorization") String authHeader) {
        try {
            System.out.println("Dashboard stats request received");
            Long userId = extractUserIdFromHeader(authHeader);
            System.out.println("User ID extracted: " + userId);

            // Get total groups for the user (excluding groups with 2 or fewer members)
            List<GroupMember> memberships = groupMemberRepository.findByUserId(userId);
            int totalGroups = 0;

            // Count only groups with more than 2 members (i.e., 3 or more members)
            for (GroupMember membership : memberships) {
                Long groupId = membership.getGroupId();
                int memberCount = groupMemberRepository.countByGroupId(groupId);
                // Explicitly count only groups with 3 or more members
                if (memberCount > 2) {
                    totalGroups++;
                }
            }

            System.out.println("Total groups (with more than 2 members): " + totalGroups);

            // Get total messages sent by the user
            int totalMessages = messageRepository.countBySenderId(userId);
            System.out.println("Total messages: " + totalMessages);

            // Get online users (users with onlineStatus = true)
            List<User> onlineUsersList = userRepository.findAll().stream()
                    .filter(User::getOnlineStatus)
                    .collect(Collectors.toList());
            int onlineUsers = onlineUsersList.size();
            System.out.println("Online users: " + onlineUsers);

            Map<String, Object> stats = Map.of(
                    "totalGroups", totalGroups,
                    "totalMessages", totalMessages,
                    "onlineUsers", onlineUsers);

            System.out.println("Returning stats: " + stats);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            System.err.println("Error in getDashboardStats: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized or invalid token"));
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
                "code", code));
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
                    "uploaded_at", m.getMediaMessage().getUploadedAt());
        }

        // Fetch sender name from UserRepository
        String senderName = userRepository.findById(m.getSenderId())
                .map(User::getUsername)
                .orElse("Unknown");

        return new MessageDTO(
                m.getMessageId(),
                m.getSenderId(),
                senderName,
                m.getGroupId(),
                m.getContent(),
                m.getCreatedAt(),
                media,
                true);
    }

}
