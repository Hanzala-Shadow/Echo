package com.chatapp.service;

import com.chatapp.model.User;
import com.chatapp.model.Session;
import com.chatapp.repository.UserRepository;
import com.chatapp.repository.SessionRepository;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository,
                       SessionRepository sessionRepository,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.jwtService = jwtService;
    }

    // ======================
    // REGISTER
    // ======================
    public User register(String username, String email, String password) {
        System.out.println("AuthService: Registering user with email: " + email);
        
        if (userRepository.existsByEmail(email)) {
            System.out.println("AuthService: Email already in use: " + email);
            throw new RuntimeException("Email already in use");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        
        System.out.println("AuthService: Saving user: " + email);
        User savedUser = userRepository.save(user);
        System.out.println("AuthService: User saved successfully with ID: " + savedUser.getUserId());
        
        return savedUser;
    }

    // ======================
    // LOGIN
    // ======================
    public String login(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("Invalid credentials");
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        // Generate JWT
        String token = jwtService.generateToken(user);

        // Store in session table
        Session session = new Session();
        session.setUser(user);
        session.setToken(token);
        session.setCreatedAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plusHours(12)); // 12h expiry
        sessionRepository.save(session);

        return token;
    }

    // ======================
    // LOGOUT
    // ======================
   public Long logout(String token) {
    Optional<Session> sessionOpt = sessionRepository.findByToken(token);
    if (sessionOpt.isPresent()) {
        Session session = sessionOpt.get();
        Long userId = session.getUser().getUserId();
        sessionRepository.delete(session);
        return userId;
    }
    return null;
}

    // ======================
    // VALIDATE SESSION
    // ======================
    public boolean validateSession(String token) {
        Optional<Session> sessionOpt = sessionRepository.findByToken(token);
        if (sessionOpt.isEmpty()) return false;

        Session session = sessionOpt.get();
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            sessionRepository.delete(session);
            return false;
        }

        return jwtService.validateToken(token, session.getUser());
    }
}