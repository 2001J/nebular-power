package com.solar.user_management.config;

import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import org.springframework.context.annotation.Profile;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Profile({"dev", "test"})
/**
 * DataInitializer is a Spring component that initializes the database with default data.
 * It creates an admin user if it does not already exist.
 */
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Create admin user if not exists
        if (!userRepository.existsByEmail("admin@solar.com")) {
            User adminUser = new User();
            adminUser.setEmail("admin@solar.com");
            adminUser.setPassword(passwordEncoder.encode("admin123"));
            adminUser.setFullName("System Administrator");
            adminUser.setPhoneNumber("+1234567890");
            adminUser.setRole(User.UserRole.ADMIN);
            adminUser.setEnabled(true);
            adminUser.setEmailVerified(true);
            userRepository.save(adminUser);
        }
    }
} 