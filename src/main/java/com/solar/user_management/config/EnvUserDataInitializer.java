package com.solar.user_management.config;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Environment-based user data initializer.
 * Loads initial user and installation data from environment variables (.env file).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Profile("prod")
@Order(1) // Run before other data loaders
public class EnvUserDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SolarInstallationRepository installationRepository;
    private final PasswordEncoder passwordEncoder;

    // Admin user properties from .env
    @Value("${ADMIN_EMAIL:admin@solar.com}")
    private String adminEmail;

    @Value("${ADMIN_PASSWORD:admin123}")
    private String adminPassword;

    @Value("${ADMIN_FULL_NAME:System Administrator}")
    private String adminFullName;

    @Value("${ADMIN_PHONE:+1234567890}")
    private String adminPhone;

    // Customer 1 properties
    @Value("${DEMO_CUSTOMER1_EMAIL:customer1@solar.com}")
    private String customer1Email;

    @Value("${DEMO_CUSTOMER1_PASSWORD:password123}")
    private String customer1Password;

    @Value("${DEMO_CUSTOMER1_FULL_NAME:Customer One}")
    private String customer1FullName;

    @Value("${DEMO_CUSTOMER1_PHONE:+1987654321}")
    private String customer1Phone;

    // Customer 2 properties
    @Value("${DEMO_CUSTOMER2_EMAIL:customer2@solar.com}")
    private String customer2Email;

    @Value("${DEMO_CUSTOMER2_PASSWORD:password123}")
    private String customer2Password;

    @Value("${DEMO_CUSTOMER2_FULL_NAME:Customer Two}")
    private String customer2FullName;

    @Value("${DEMO_CUSTOMER2_PHONE:+1555123456}")
    private String customer2Phone;

    // Installation 1 properties
    @Value("${DEFAULT_INSTALLATION1_NAME:Residential Installation 1}")
    private String installation1Name;

    @Value("${DEFAULT_INSTALLATION1_LOCATION:123 Main St, Anytown, USA}")
    private String installation1Location;

    @Value("${DEFAULT_INSTALLATION1_CAPACITY:5.5}")
    private double installation1Capacity;

    @Value("${DEFAULT_INSTALLATION1_TYPE:RESIDENTIAL}")
    private String installation1Type;

    @Value("${DEFAULT_INSTALLATION1_OWNER:customer1@solar.com}")
    private String installation1Owner;

    // Installation 2 properties
    @Value("${DEFAULT_INSTALLATION2_NAME:Commercial Installation 1}")
    private String installation2Name;

    @Value("${DEFAULT_INSTALLATION2_LOCATION:456 Business Ave, Anytown, USA}")
    private String installation2Location;

    @Value("${DEFAULT_INSTALLATION2_CAPACITY:25.0}")
    private double installation2Capacity;

    @Value("${DEFAULT_INSTALLATION2_TYPE:COMMERCIAL}")
    private String installation2Type;

    @Value("${DEFAULT_INSTALLATION2_OWNER:customer2@solar.com}")
    private String installation2Owner;

    @Override
    public void run(String... args) {
        log.info("Initializing users and installations from environment variables");
        
        createAdminUser();
        User customer1 = createCustomerUser(customer1Email, customer1Password, customer1FullName, customer1Phone);
        User customer2 = createCustomerUser(customer2Email, customer2Password, customer2FullName, customer2Phone);
        
        // Create installations if they don't exist yet
        if (installationRepository.count() == 0) {
            createInstallation(
                installation1Name,
                installation1Location,
                installation1Capacity,
                SolarInstallation.InstallationType.valueOf(installation1Type),
                findUserByEmail(installation1Owner)
            );
            
            createInstallation(
                installation2Name,
                installation2Location,
                installation2Capacity,
                SolarInstallation.InstallationType.valueOf(installation2Type),
                findUserByEmail(installation2Owner)
            );
            
            log.info("Created default installations from environment variables");
        } else {
            log.info("Installations already exist, skipping creation");
        }
    }
    
    private User createAdminUser() {
        Optional<User> existingAdmin = userRepository.findByEmail(adminEmail);
        if (existingAdmin.isPresent()) {
            log.info("Admin user already exists: {}", adminEmail);
            return existingAdmin.get();
        }
        
        User admin = new User();
        admin.setEmail(adminEmail);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setFullName(adminFullName);
        admin.setPhoneNumber(adminPhone);
        admin.setRole(User.UserRole.ADMIN);
        admin.setEnabled(true);
        admin.setEmailVerified(true);
        
        admin = userRepository.save(admin);
        log.info("Created admin user: {}", adminEmail);
        return admin;
    }
    
    private User createCustomerUser(String email, String password, String fullName, String phone) {
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            log.info("Customer user already exists: {}", email);
            return existingUser.get();
        }
        
        User customer = new User();
        customer.setEmail(email);
        customer.setPassword(passwordEncoder.encode(password));
        customer.setFullName(fullName);
        customer.setPhoneNumber(phone);
        customer.setRole(User.UserRole.CUSTOMER);
        customer.setEnabled(true);
        customer.setEmailVerified(true);
        
        customer = userRepository.save(customer);
        log.info("Created customer user: {}", email);
        return customer;
    }
    
    private SolarInstallation createInstallation(
            String name, 
            String location, 
            double capacity, 
            SolarInstallation.InstallationType type, 
            User owner) {
        
        SolarInstallation installation = new SolarInstallation();
        installation.setName(name);
        installation.setLocation(location);
        installation.setCapacity(capacity);
        installation.setInstalledCapacityKW(capacity);
        installation.setType(type);
        installation.setInstallationDate(LocalDateTime.now().minusMonths(6));
        installation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation.setUser(owner);
        
        installation = installationRepository.save(installation);
        log.info("Created installation: {} (ID: {}) for user: {}", 
                name, installation.getId(), owner.getEmail());
        
        return installation;
    }
    
    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}