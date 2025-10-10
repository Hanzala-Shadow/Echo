package com.chatapp.config;

import com.chatapp.service.JwtService;
import com.chatapp.repository.UserRepository;
import com.chatapp.repository.SessionRepository;
import com.chatapp.model.User;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;

    // Inject HOST_IP from docker-compose.yml
    @Value("${HOST_IP:localhost}")
    private String hostIp;

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
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/register",
                    "/api/auth/login",
                    "/ws/**",
                    "/network/qr",
                    "/network/ip",
                    "/api/mdns",
                    "/api/users/usernames",
                    "/api/users/search",
                    "/api/health",
                    "/api/test/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(new JwtAuthFilter(jwtService, userRepository, sessionRepository),
                             UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // CORS CONFIGURATION METHOD
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow all origins for development
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://" + hostIp + ":*",
            "http://*:5173"
        ));

        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        // Expose headers that frontend might need
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
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
            String requestURI = request.getRequestURI();
            
            // Log the request URI for debugging
            System.out.println("JwtAuthFilter: Processing request for URI: " + requestURI);
            
            // Define public endpoints that should bypass JWT authentication
            List<String> publicEndpoints = Arrays.asList(
                "/api/auth/register",
                "/api/auth/login",
                "/ws/**",
                "/network/qr",
                "/network/ip",
                "/api/mdns",
                "/api/users/usernames",
                "/api/users/search",
                "/api/health"
            );
            
            // Check if this is a public endpoint
            boolean isPublicEndpoint = false;
            for (String pattern : publicEndpoints) {
                if (pattern.equals(requestURI) || 
                    (pattern.endsWith("/**") && requestURI.startsWith(pattern.substring(0, pattern.length() - 3))) ||
                    requestURI.startsWith("/api/auth/")) {
                    isPublicEndpoint = true;
                    break;
                }
            }
            
            // If it's a public endpoint, let it pass through without JWT validation
            if (isPublicEndpoint) {
                System.out.println("JwtAuthFilter: Public endpoint, bypassing JWT validation");
                filterChain.doFilter(request, response);
                return;
            }

            // For non-public endpoints, check authentication
            String authHeader = request.getHeader("Authorization");
            System.out.println("JwtAuthFilter: Auth header: " + authHeader);

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                System.out.println("JwtAuthFilter: Processing token: " + token);

                try {
                    // Extract email from token
                    String email = jwtService.extractEmail(token);
                    System.out.println("JwtAuthFilter: Extracted email: " + email);
                    
                    // Find user by email
                    Optional<User> userOpt = userRepository.findByEmail(email);
                    
                    if (userOpt.isPresent()) {
                        User user = userOpt.get();
                        
                        // Validate token for this user
                        if (jwtService.validateToken(token, user)) {
                            // Wrap user as Spring UserDetails with at least one role
                            org.springframework.security.core.userdetails.UserDetails userDetails =
                                    org.springframework.security.core.userdetails.User
                                            .withUsername(user.getEmail())
                                            .password("") // no need for real password, JWT already validated
                                            .authorities("ROLE_USER") // or map roles from DB later
                                            .build();

                            UsernamePasswordAuthenticationToken authToken =
                                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                            SecurityContextHolder.getContext().setAuthentication(authToken);
                            System.out.println("JwtAuthFilter: Authentication successful, continuing filter chain");
                            filterChain.doFilter(request, response);
                            return;
                        } else {
                            System.out.println("JwtAuthFilter: Token validation failed for user: " + email);
                        }
                    } else {
                        System.out.println("JwtAuthFilter: User not found for email: " + email);
                    }
                } catch (Exception e) {
                    System.out.println("JwtAuthFilter: Exception during token validation: " + e.getMessage());
                    e.printStackTrace();
                }
            }

            // If we reach here, it means:
            // 1. This is not a public endpoint
            // 2. No valid authentication was provided
            // So we should return 401 Unauthorized
            System.out.println("JwtAuthFilter: No valid authentication, returning 401");
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
        }
    }
}