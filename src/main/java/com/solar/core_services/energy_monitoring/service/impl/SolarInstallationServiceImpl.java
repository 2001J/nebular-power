package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.dto.DeviceStatusRequest;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.dto.SystemOverviewResponse;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.energy_monitoring.service.SolarInstallationService;
import com.solar.core_services.energy_monitoring.service.WebSocketService;
import com.solar.exception.ResourceNotFoundException;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SolarInstallationServiceImpl implements SolarInstallationService {

    private final SolarInstallationRepository installationRepository;
    private final UserRepository userRepository;
    private final EnergyDataRepository energyDataRepository;
    private final WebSocketService webSocketService;

    @Override
    public List<SolarInstallationDTO> getInstallationsByCustomer(Long customerId) {
        // Verify the customer exists
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));
        
        // Get all installations for the customer
        List<SolarInstallation> installations = installationRepository.findByUser(customer);
        
        // Convert to DTOs and return
        return installations.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public SolarInstallationDTO getInstallationById(Long installationId) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Convert to DTO and return
        return convertToDTO(installation);
    }

    @Override
    @Transactional
    public SolarInstallationDTO createInstallation(SolarInstallationDTO installationDTO) {
        // Verify the customer exists
        User customer = userRepository.findById(installationDTO.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + installationDTO.getUserId()));
        
        // Create the installation
        SolarInstallation installation = new SolarInstallation();
        installation.setUser(customer);
        installation.setInstalledCapacityKW(installationDTO.getInstalledCapacityKW());
        installation.setLocation(installationDTO.getLocation());
        installation.setInstallationDate(installationDTO.getInstallationDate() != null ? 
                installationDTO.getInstallationDate() : LocalDateTime.now());
        installation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation.setTamperDetected(false);
        installation.setLastTamperCheck(LocalDateTime.now());
        
        // Save the installation
        SolarInstallation savedInstallation = installationRepository.save(installation);
        
        // Convert to DTO and return
        return convertToDTO(savedInstallation);
    }

    @Override
    @Transactional
    public SolarInstallationDTO updateInstallation(Long installationId, SolarInstallationDTO installationDTO) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Update the installation
        if (installationDTO.getInstalledCapacityKW() > 0) {
            installation.setInstalledCapacityKW(installationDTO.getInstalledCapacityKW());
        }
        
        if (installationDTO.getLocation() != null) {
            installation.setLocation(installationDTO.getLocation());
        }
        
        if (installationDTO.getStatus() != null) {
            installation.setStatus(installationDTO.getStatus());
        }
        
        // Save the installation
        SolarInstallation savedInstallation = installationRepository.save(installation);
        
        // Convert to DTO and return
        return convertToDTO(savedInstallation);
    }

    @Override
    @Transactional
    public SolarInstallationDTO updateDeviceStatus(DeviceStatusRequest request) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(request.getInstallationId())
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + request.getInstallationId()));
        
        // Verify the device token
        if (!verifyDeviceToken(request.getInstallationId(), request.getDeviceToken())) {
            throw new SecurityException("Invalid device token for installation ID: " + request.getInstallationId());
        }
        
        // Check if tamper status has changed
        boolean wasTampered = installation.isTamperDetected();
        boolean isTampered = request.isTamperDetected();
        
        // Update tamper status if detected
        if (isTampered) {
            installation.setTamperDetected(true);
        }
        
        // Update last tamper check timestamp
        installation.setLastTamperCheck(LocalDateTime.now());
        
        // Save the installation
        SolarInstallation savedInstallation = installationRepository.save(installation);
        
        // Convert to DTO
        SolarInstallationDTO installationDTO = convertToDTO(savedInstallation);
        
        // Send real-time update via WebSocket
        webSocketService.sendInstallationStatusUpdate(savedInstallation.getId(), installationDTO);
        
        // Send tamper alert if newly detected
        if (!wasTampered && isTampered) {
            webSocketService.sendTamperAlert(savedInstallation.getId(), installationDTO);
        }
        
        return installationDTO;
    }

    @Override
    public SystemOverviewResponse getSystemOverview() {
        // Get all installations
        List<SolarInstallation> allInstallations = installationRepository.findAll();
        
        // Count active and suspended installations
        int activeCount = 0;
        int suspendedCount = 0;
        double totalCapacity = 0;
        
        for (SolarInstallation installation : allInstallations) {
            if (installation.getStatus() == SolarInstallation.InstallationStatus.ACTIVE) {
                activeCount++;
            } else if (installation.getStatus() == SolarInstallation.InstallationStatus.SUSPENDED) {
                suspendedCount++;
            }
            
            totalCapacity += installation.getInstalledCapacityKW();
        }
        
        // Get installations with tamper alerts
        List<SolarInstallation> tamperAlertInstallations = installationRepository.findByTamperDetectedTrue();
        
        // Get today's data for all installations
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        
        // Get month-to-date data
        LocalDateTime startOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIDNIGHT);
        
        // Calculate system-wide values (placeholder calculations for now)
        double currentSystemGeneration = 0;
        double todayTotalGeneration = 0;
        double todayTotalConsumption = 0;
        double monthToDateGeneration = 0;
        double monthToDateConsumption = 0;
        double averageEfficiency = 0;
        
        // Build the system overview response
        SystemOverviewResponse response = SystemOverviewResponse.builder()
                .totalActiveInstallations(activeCount)
                .totalSuspendedInstallations(suspendedCount)
                .totalInstallationsWithTamperAlerts(tamperAlertInstallations.size())
                .totalSystemCapacityKW(totalCapacity)
                .currentSystemGenerationWatts(currentSystemGeneration)
                .todayTotalGenerationKWh(todayTotalGeneration)
                .todayTotalConsumptionKWh(todayTotalConsumption)
                .monthToDateGenerationKWh(monthToDateGeneration)
                .monthToDateConsumptionKWh(monthToDateConsumption)
                .averageSystemEfficiency(averageEfficiency)
                .lastUpdated(LocalDateTime.now())
                .recentlyActiveInstallations(allInstallations.stream()
                        .filter(i -> i.getStatus() == SolarInstallation.InstallationStatus.ACTIVE)
                        .limit(5)
                        .map(this::convertToDTO)
                        .collect(Collectors.toList()))
                .build();
        
        return response;
    }

    @Override
    public List<SolarInstallationDTO> getInstallationsWithTamperAlerts() {
        // Get installations with tamper alerts
        List<SolarInstallation> tamperAlertInstallations = installationRepository.findByTamperDetectedTrue();
        
        // Convert to DTOs and return
        return tamperAlertInstallations.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public boolean verifyDeviceToken(Long installationId, String deviceToken) {
        // For now, we'll just return true for any token
        // In a real application, you would verify the token against a stored value
        return true;
    }
    
    // Helper methods for DTO conversion
    private SolarInstallationDTO convertToDTO(SolarInstallation installation) {
        return SolarInstallationDTO.builder()
                .id(installation.getId())
                .userId(installation.getUser().getId())
                .username(installation.getUser().getEmail())
                .installedCapacityKW(installation.getInstalledCapacityKW())
                .location(installation.getLocation())
                .installationDate(installation.getInstallationDate())
                .status(installation.getStatus())
                .tamperDetected(installation.isTamperDetected())
                .lastTamperCheck(installation.getLastTamperCheck())
                .build();
    }
} 