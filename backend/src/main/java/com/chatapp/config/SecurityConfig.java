package com.chatapp.config;

import com.chatapp.service.JwtService;
import com.chatapp.repository.UserRepository;
import com.chatapp.repository.SessionRepository;
import com.chatapp.model.User;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.util.Optional;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;

    public SecurityConfig(JwtService jwtService,
                          UserRepository userRepository,
                          SessionRepository sessionRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // disable CSRF for APIs
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(new JwtAuthFilter(jwtService, userRepository, sessionRepository),
                             UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ========================
    // JWT Authentication Filter
    // ========================
    static class JwtAuthFilter extends org.springframework.web.filter.OncePerRequestFilter {
        private final JwtService jwtService;
        private final UserRepository userRepository;
        private final SessionRepository sessionRepository;

        JwtAuthFilter(JwtService jwtService, UserRepository userRepository, SessionRepository sessionRepository) {
            this.jwtService = jwtService;
            this.userRepository = userRepository;
            this.sessionRepository = sessionRepository;
        }
@Override
protected void doFilterInternal(HttpServletRequest request,
                                HttpServletResponse response,
                                FilterChain filterChain) throws ServletException, IOException {
    String authHeader = request.getHeader("Authorization");

    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        String token = authHeader.substring(7);

        // Validate session
        var sessionOpt = sessionRepository.findByToken(token);
        if (sessionOpt.isPresent()) {
            String email = jwtService.extractEmail(token);
            Optional<User> userOpt = userRepository.findByEmail(email);

            if (userOpt.isPresent() && jwtService.validateToken(token, userOpt.get())) {
                // Wrap user as Spring UserDetails with at least one role
                User user = userOpt.get();
                org.springframework.security.core.userdetails.UserDetails userDetails =
                        org.springframework.security.core.userdetails.User
                                .withUsername(user.getEmail())
                                .password("") // no need for real password, JWT already validated
                                .authorities("ROLE_USER") // or map roles from DB later
                                .build();

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
    }

    filterChain.doFilter(request, response);
}

    }
}
