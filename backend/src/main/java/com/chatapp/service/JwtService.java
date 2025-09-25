package com.chatapp.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.chatapp.model.User;
import com.chatapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {

    private static final String SECRET_KEY = "super_secret_key_123"; 
    private static final long EXPIRATION_TIME = 1000 * 60 * 60 * 12; // 12 hours

    private final Algorithm algorithm = Algorithm.HMAC256(SECRET_KEY);

    @Autowired
    private UserRepository userRepository;

    // =====================
    // Generate JWT Token
    // =====================
    public String generateToken(User user) {
        return JWT.create()
                .withSubject(user.getEmail())
                .withClaim("userId", user.getUserId())
                .withClaim("username", user.getUsername())
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .sign(algorithm);
    }

    // =====================
    // Validate Token for a specific user
    // =====================
    public boolean validateToken(String token, User user) {
        try {
            DecodedJWT decoded = JWT.require(algorithm)
                    .withSubject(user.getEmail())
                    .build()
                    .verify(token);

            return decoded.getExpiresAt().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    // =====================
    // Extract Email from Token
    // =====================
    public String extractEmail(String token) {
        DecodedJWT decoded = JWT.decode(token);
        return decoded.getSubject();
    }

    // =====================
    // Validate Token & Return User ID (for WebSocket handshake)
    // =====================
    public Long validateTokenAndGetUserId(String token) throws Exception {
        DecodedJWT decoded;
        try {
            decoded = JWT.require(algorithm).build().verify(token);
        } catch (Exception e) {
            throw new Exception("Invalid JWT token");
        }

        Long userId = decoded.getClaim("userId").asLong();
        if (userId == null || !userRepository.existsById(userId)) {
            throw new Exception("User not found for token");
        }

        return userId;
    }
}
