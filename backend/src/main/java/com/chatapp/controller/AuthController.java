package com.chatapp.controller;

import com.chatapp.model.User;
import com.chatapp.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.chatapp.websocket.ChatWebSocketHandler;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ChatWebSocketHandler chatWebSocketHandler;

    public AuthController(AuthService authService, ChatWebSocketHandler chatWebSocketHandler) {
        this.authService = authService;
        this.chatWebSocketHandler = chatWebSocketHandler;
    }


    // ======================
    // REGISTER
    // ======================
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String username = body.get("username");
            String email = body.get("email");
            String password = body.get("password");

            User user = authService.register(username, email, password);
            return ResponseEntity.status(201).body(Map.of(
                "userId", user.getUserId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "createdAt", user.getCreatedAt() // make sure User entity has createdAt
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Internal server error"
            ));
        }
    }

    // ======================
    // LOGIN
    // ======================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");

            String token = authService.login(email, password);

            return ResponseEntity.ok(Map.of(
                "message", "Login successful",
                "token", token
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Internal server error"
            ));
        }
    }

    // ======================
    // LOGOUT
    // ======================
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                Long userId = authService.logout(token);

                if (userId != null) {
                    // Ensure the user's online status is set to false in the database
                    chatWebSocketHandler.disconnectUser(userId);
                    
                    // Also update the user's online status in the database directly
                    // This ensures the status is reset even if WebSocket disconnection fails
                    try {
                        chatWebSocketHandler.forceOfflineStatus(userId);
                    } catch (Exception e) {
                        System.out.println("Warning: Could not force offline status for user " + userId + ": " + e.getMessage());
                    }
                }
            }
            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", "Internal server error: " + e.getMessage()
            ));
        }
    }
}