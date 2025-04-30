package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.user_management.model.User;
import com.solar.user_management.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Test class for SecurityService
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/service/SecurityService.java
 */
@ExtendWith(MockitoExtension.class)
public class SecurityServiceTest {

    @Mock
    private SolarInstallationRepository installationRepository;

    @InjectMocks
    private SecurityService securityService;

    private User user;
    private User adminUser;
    private SolarInstallation installation;
    private UserPrincipal userPrincipal;
    private Authentication authentication;
    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach
    public void setup() {
        // Create user
        user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setRole(User.UserRole.CUSTOMER);
        user.setPassword("password");
        user.setEnabled(true);

        // Create admin user
        adminUser = new User();
        adminUser.setId(2L);
        adminUser.setEmail("admin@example.com");
        adminUser.setFullName("Admin User");
        adminUser.setRole(User.UserRole.ADMIN);
        adminUser.setPassword("password");
        adminUser.setEnabled(true);

        // Create installation
        installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");
        installation.setCapacity(5.0);
        installation.setInstalledCapacityKW(5.0);
        installation.setLocation("Test Location");
        installation.setInstallationDate(now.minusDays(30));
        installation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation.setUser(user);

        // Create UserPrincipal
        userPrincipal = new UserPrincipal(user);

        // Create Authentication
        authentication = new UsernamePasswordAuthenticationToken(
                userPrincipal, null, userPrincipal.getAuthorities());

        // Set SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @AfterEach
    public void tearDown() {
        // Clear SecurityContext
        SecurityContextHolder.clearContext();
    }

    @Test
    public void testIsCurrentUser_True() {
        // When
        boolean result = securityService.isCurrentUser(1L);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    public void testIsCurrentUser_False() {
        // When
        boolean result = securityService.isCurrentUser(2L);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    public void testIsCurrentUser_NoAuthentication() {
        // Given
        SecurityContextHolder.clearContext();

        // When
        boolean result = securityService.isCurrentUser(1L);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    public void testHasAccessToInstallation_AsOwner() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));

        // When
        boolean result = securityService.hasAccessToInstallation(1L);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    public void testHasAccessToInstallation_AsAdmin() {
        // Given
        UserPrincipal adminPrincipal = new UserPrincipal(adminUser);
        Authentication adminAuth = new UsernamePasswordAuthenticationToken(
                adminPrincipal, null, adminPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(adminAuth);

        // When
        boolean result = securityService.hasAccessToInstallation(1L);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    public void testHasAccessToInstallation_NotOwner() {
        // Given
        User otherUser = new User();
        otherUser.setId(2L);
        
        SolarInstallation otherInstallation = new SolarInstallation();
        otherInstallation.setId(1L);
        otherInstallation.setUser(otherUser);
        
        when(installationRepository.findById(1L)).thenReturn(Optional.of(otherInstallation));

        // When
        boolean result = securityService.hasAccessToInstallation(1L);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    public void testHasAccessToInstallation_InstallationNotFound() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.empty());

        // When
        boolean result = securityService.hasAccessToInstallation(1L);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    public void testHasAccessToInstallation_NoAuthentication() {
        // Given
        SecurityContextHolder.clearContext();

        // When
        boolean result = securityService.hasAccessToInstallation(1L);

        // Then
        assertThat(result).isFalse();
    }
} 