package com.chatapp.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.chatapp.model.User;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {

    // Have to place in .env for Future
    private static final String SECRET_KEY = "super_secret_key_123"; 
    private static final long EXPIRATION_TIME = 1000 * 60 * 60 * 12; // 12 hours

    private final Algorithm algorithm = Algorithm.HMAC256(SECRET_KEY);

    // =====================
    // Generate Token
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
    // Validate Token
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
}
