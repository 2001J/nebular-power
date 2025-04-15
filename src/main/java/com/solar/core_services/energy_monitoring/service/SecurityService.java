package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.user_management.model.User;
import com.solar.user_management.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SecurityService {

    private final SolarInstallationRepository installationRepository;

    /**
     * Check if the current user is the specified user
     * @param userId The user ID to check
     * @return True if the current user is the specified user, false otherwise
     */
    public boolean isCurrentUser(Long userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal) {
            return ((UserPrincipal) principal).getId().equals(userId);
        }

        return false;
    }

    /**
     * Check if the current user has access to the specified installation
     * @param installationId The installation ID to check
     * @return True if the current user has access to the installation, false otherwise
     */
    public boolean hasAccessToInstallation(Long installationId) {
        // Get authentication from security context
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Check if user is authenticated
        if (authentication == null || !authentication.isAuthenticated()) {
            System.out.println("Access denied: User not authenticated for installation ID: " + installationId);
            return false;
        }

        // Print authentication details for debugging
        System.out.println("Checking access for installation: " + installationId);
        System.out.println("- Authenticated user: " + authentication.getName());
        System.out.println("- Authorities: " + authentication.getAuthorities());
        
        // Admin has access to all installations
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            System.out.println("Access granted: User has ADMIN role for installation ID: " + installationId);
            return true;
        }

        // For regular users, check if they own the installation
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal) {
            Long userId = ((UserPrincipal) principal).getId();
            System.out.println("- User ID from principal: " + userId);
            
            Optional<SolarInstallation> installation = installationRepository.findById(installationId);
            
            if (!installation.isPresent()) {
                System.out.println("Access denied: Installation not found with ID: " + installationId);
                return false;
            }
            
            User installationUser = installation.get().getUser();
            
            if (installationUser == null) {
                System.out.println("Access denied: Installation has no assigned user. ID: " + installationId);
                return false;
            }
            
            boolean hasAccess = installationUser.getId().equals(userId);
            System.out.println(hasAccess 
                ? "Access granted: User owns installation ID: " + installationId
                : "Access denied: User does not own installation ID: " + installationId);
            
            return hasAccess;
        } else {
            System.out.println("Access denied: Principal is not a UserPrincipal for installation ID: " + installationId);
            return false;
        }
    }
} 