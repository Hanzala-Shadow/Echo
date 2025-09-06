package com.chatapp.controller;

import com.chatapp.model.User;
import com.chatapp.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ======================
    // REGISTER
    // ======================
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
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
    }

    // ======================
    // LOGIN
    // ======================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        String token = authService.login(email, password);

        return ResponseEntity.ok(Map.of(
            "message", "Login successful",
            "token", token
        ));
    }

    // ======================
    // LOGOUT
    // ======================
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
