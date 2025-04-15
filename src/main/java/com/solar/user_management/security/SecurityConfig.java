package com.solar.user_management.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final UserDetailsService userDetailsService;
    private final JwtTokenProvider tokenProvider;

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(tokenProvider, userDetailsService);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configure(http))
                .csrf(AbstractHttpConfigurer::disable)
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(unauthorizedHandler)
                )
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        // Password reset endpoints
                        .requestMatchers("/api/profile/password/reset-request").permitAll()
                        .requestMatchers("/api/profile/password/reset-confirm").permitAll()
                        // Swagger UI endpoints - both with and without /api prefix
                        .requestMatchers(
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api/v3/api-docs",
                                "/api/v3/api-docs/**",
                                "/api/swagger-ui/**",
                                "/api/swagger-ui.html"
                        ).permitAll()
                        
                        // Admin only endpoints - URL-pattern based security
                        .requestMatchers("/api/customers/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        
                        // Fix for monitoring endpoints - explicitly mark them as authenticated
                        // This aligns with the @PreAuthorize annotations in controllers
                        .requestMatchers("/monitoring/**", "/monitoring").authenticated()
                        .requestMatchers("/api/monitoring/**", "/api/monitoring").authenticated()
                        
                        // Energy monitoring specific endpoints
                        .requestMatchers("/monitoring/installations/**", "/monitoring/installations").authenticated()
                        .requestMatchers("/monitoring/energy/**", "/monitoring/energy").authenticated()
                        .requestMatchers("/monitoring/summary/**", "/monitoring/summary").authenticated()
                        
                        // Endpoints that support both ADMIN and CUSTOMER roles via @PreAuthorize
                        // But need to be marked as authenticated at URL level for Swagger
                        .requestMatchers("/api/service/**", "/api/service").authenticated()
                        .requestMatchers("/api/security/**", "/api/security").authenticated()
                        
                        // Customer endpoints
                        .requestMatchers("/api/installations/**").hasAnyRole("ADMIN", "CUSTOMER")
                        .requestMatchers("/api/payments/**").hasAnyRole("ADMIN", "CUSTOMER")

                        // Any other request needs authentication
                        .anyRequest().authenticated()
                )
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
} 