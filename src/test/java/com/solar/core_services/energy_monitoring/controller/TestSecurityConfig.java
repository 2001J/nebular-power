package com.solar.core_services.energy_monitoring.controller;

import com.solar.user_management.service.UserService;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test security configuration for controller tests.
 * This configuration disables security for testing purposes and provides test users.
 */
@TestConfiguration
public class TestSecurityConfig {

    @Bean
    @Primary
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/**").permitAll()
            );
        
        return http.build();
    }
    
    @Bean
    @Primary
    public UserDetailsService userDetailsService() {
        // Create test users for different roles
        var adminUser = User.withUsername("admin@example.com")
            .password("{noop}password")
            .roles("ADMIN")
            .build();
            
        var customerUser = User.withUsername("customer@example.com")
            .password("{noop}password")
            .roles("CUSTOMER")
            .build();
            
        var regularUser = User.withUsername("user@example.com")
            .password("{noop}password")
            .roles("USER")
            .build();
            
        return new InMemoryUserDetailsManager(adminUser, customerUser, regularUser);
    }
    
    @Bean
    @Primary
    public UserService userService() {
        UserService mockUserService = mock(UserService.class);
        // Configure the mock to avoid requiring password changes in tests
        when(mockUserService.isPasswordChangeRequired(org.mockito.ArgumentMatchers.anyString())).thenReturn(false);
        return mockUserService;
    }
} 