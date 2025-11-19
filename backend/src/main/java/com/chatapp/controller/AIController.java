package com.chatapp.controller;

import com.chatapp.dto.ai.*;
import com.chatapp.service.JwtService;
import com.chatapp.service.ai.AIServiceGateway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private AIServiceGateway aiServiceGateway;

    @Autowired
    private JwtService jwtService;

    /**
     * Translate text for a group
     */
    @PostMapping("/translate")
    public ResponseEntity<?> translate(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> payload) {
        try {
            // Validate user
            extractUserIdFromHeader(authHeader);

            // Extract groupId and text
            Long groupId = Long.valueOf(payload.get("group_id").toString());
            String text = payload.get("text").toString();

            // Check if AI enabled
            if (!aiServiceGateway.isAIEnabled(groupId)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "AI features are disabled for this group"));
            }

            // Call AI service
            TranslationRequest request = new TranslationRequest(text);
            TranslationResponse response = aiServiceGateway.translate(request);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400)
                    .body(Map.of("error", "Invalid request: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI service unavailable: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Unauthorized"));
        }
    }

    /**
     * Summarize conversation for a group
     */
    @PostMapping("/summarize")
    public ResponseEntity<?> summarize(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody SummarizerRequest request,
            @RequestParam Long groupId) {
        try {
            extractUserIdFromHeader(authHeader);

            if (!aiServiceGateway.isAIEnabled(groupId)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "AI features are disabled for this group"));
            }

            SummarizerResponse response = aiServiceGateway.summarize(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI service unavailable: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Unauthorized"));
        }
    }

    /**
     * Check toxicity of text
     */
    @PostMapping("/check-toxicity")
    public ResponseEntity<?> checkToxicity(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> payload) {
        try {
            extractUserIdFromHeader(authHeader);

            Long groupId = Long.valueOf(payload.get("group_id").toString());
            String text = payload.get("text").toString();

            if (!aiServiceGateway.isAIEnabled(groupId)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "AI features are disabled for this group"));
            }

            ToxicityRequest request = new ToxicityRequest(text);
            ToxicityResponse response = aiServiceGateway.checkToxicity(request);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI service unavailable: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Unauthorized"));
        }
    }

    /**
     * Extract deadlines from messages
     */
    @PostMapping("/extract-deadlines")
    public ResponseEntity<?> extractDeadlines(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody DeadlineRequest request,
            @RequestParam Long groupId) {
        try {
            extractUserIdFromHeader(authHeader);

            if (!aiServiceGateway.isAIEnabled(groupId)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "AI features are disabled for this group"));
            }

            DeadlineResponse response = aiServiceGateway.extractDeadlines(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI service unavailable: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Unauthorized"));
        }
    }

    /**
     * Generate smart replies
     */
    @PostMapping("/smart-reply")
    public ResponseEntity<?> generateSmartReplies(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody SmartReplyRequest request,
            @RequestParam Long groupId) {
        try {
            extractUserIdFromHeader(authHeader);

            if (!aiServiceGateway.isAIEnabled(groupId)) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "AI features are disabled for this group"));
            }

            SmartReplyResponse response = aiServiceGateway.generateSmartReplies(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(503)
                    .body(Map.of("error", "AI service unavailable: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Unauthorized"));
        }
    }

    // Helper method
    private Long extractUserIdFromHeader(String authHeader) throws Exception {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new Exception("Invalid header");
        }
        String token = authHeader.substring(7);
        return jwtService.validateTokenAndGetUserId(token);
    }
}