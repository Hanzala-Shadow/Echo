package com.chatapp.controller;

import com.chatapp.model.User;
import com.chatapp.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        try {
            Optional<User> user = userRepository.findById(id);
            if (user.isPresent()) {
                return ResponseEntity.ok(user.get());
            } else {
                return ResponseEntity.status(404).body("User not found with ID: " + id);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    // Get user by email
    @GetMapping("/email/{email}")
    public ResponseEntity<?> getUserByEmail(@PathVariable String email) {
        try {
            Optional<User> user = userRepository.findByEmail(email);
            if (user.isPresent()) {
                return ResponseEntity.ok(user.get());
            } else {
                return ResponseEntity.status(404).body("User not found with email: " + email);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    // Get all usernames (for searching/users list)
    @GetMapping("/usernames")
    public ResponseEntity<?> getAllUsernames() {
        try {
            List<User> users = userRepository.findAll();
            List<String> usernames = users.stream()
                    .map(User::getUsername)
                    .toList();
            return ResponseEntity.ok(usernames);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    // Search users by username
    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam String query) {
        try {
            List<User> users = userRepository.findByUsernameContainingIgnoreCase(query);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    // Get current user info (requires authentication)
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            // This would typically get the current user from security context
            // For now, we'll return a message indicating this endpoint needs auth
            return ResponseEntity.ok("Current user endpoint - requires authentication implementation");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

}