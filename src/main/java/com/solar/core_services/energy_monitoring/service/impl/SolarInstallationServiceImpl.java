package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.dto.DeviceStatusRequest;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.dto.SystemOverviewResponse;
import com.solar.core_services.energy_monitoring.model.EnergyData;
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
import java.util.Arrays;
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
                .orElseThrow(
                        () -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        // Convert to DTO and return
        return convertToDTO(installation);
    }

    @Override
    @Transactional
    public SolarInstallationDTO createInstallation(SolarInstallationDTO installationDTO) {
        // Verify the customer exists
        User customer = userRepository.findById(installationDTO.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer not found with ID: " + installationDTO.getUserId()));

        // Validate required fields explicitly
        if (installationDTO.getName() == null || installationDTO.getName().trim().isEmpty()) {
            // Try to use location if available, otherwise use a default name
            String location = installationDTO.getLocation();
            installationDTO.setName(location != null && !location.trim().isEmpty() ? "Installation at " + location
                    : "New Solar Installation");
        }

        // Create the installation
        SolarInstallation installation = new SolarInstallation();
        installation.setUser(customer);

        // Set the name field explicitly
        installation.setName(installationDTO.getName());

        installation.setCapacity(installationDTO.getInstalledCapacityKW()); // Make sure capacity is set
        installation.setInstalledCapacityKW(installationDTO.getInstalledCapacityKW());
        installation.setLocation(installationDTO.getLocation());
        installation.setInstallationDate(
                installationDTO.getInstallationDate() != null ? installationDTO.getInstallationDate()
                        : LocalDateTime.now());
        
        // Set installation type - default to RESIDENTIAL if not provided
        if (installationDTO.getType() != null) {
            installation.setType(installationDTO.getType());
        } else {
            installation.setType(SolarInstallation.InstallationType.RESIDENTIAL);
        }
        
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
                .orElseThrow(
                        () -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        // Update the installation
        if (installationDTO.getName() != null && !installationDTO.getName().trim().isEmpty()) {
            installation.setName(installationDTO.getName());
        }

        if (installationDTO.getInstalledCapacityKW() > 0) {
            installation.setInstalledCapacityKW(installationDTO.getInstalledCapacityKW());
            installation.setCapacity(installationDTO.getInstalledCapacityKW()); // Update capacity as well
        }

        if (installationDTO.getLocation() != null) {
            installation.setLocation(installationDTO.getLocation());
        }

        if (installationDTO.getStatus() != null) {
            installation.setStatus(installationDTO.getStatus());
        }
        
        // Update the installation type if provided
        if (installationDTO.getType() != null) {
            installation.setType(installationDTO.getType());
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
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Solar installation not found with ID: " + request.getInstallationId()));

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

        // Calculate system-wide values from actual data
        double currentSystemGeneration = 0;
        double todayTotalGeneration = 0;
        double todayTotalConsumption = 0;
        double monthToDateGeneration = 0;
        double monthToDateConsumption = 0;
        double averageEfficiency = 0;
        
        // Get all active installations
        List<SolarInstallation> activeInstallations = allInstallations.stream()
                .filter(i -> i.getStatus() == SolarInstallation.InstallationStatus.ACTIVE)
                .collect(Collectors.toList());
        
        // Sum up today's generation and consumption for all active installations
        for (SolarInstallation installation : activeInstallations) {
            // Get most recent reading for current generation
            List<EnergyData> recentReadings = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);
            if (!recentReadings.isEmpty()) {
                // Instead of just using the most recent reading, calculate a more stable value
                // Take up to 10 most recent readings for smoothing
                int readingsToConsider = Math.min(10, recentReadings.size());
                List<EnergyData> recentSubset = recentReadings.subList(0, readingsToConsider);
                
                // Calculate average generation, but filter out extreme outliers
                double sum = 0;
                int count = 0;
                
                // First pass - calculate median value
                double[] values = recentSubset.stream()
                    .mapToDouble(EnergyData::getPowerGenerationWatts)
                    .toArray();
                Arrays.sort(values);
                double median = values.length % 2 == 0 ? 
                    (values[values.length/2] + values[values.length/2 - 1]) / 2 : 
                    values[values.length/2];
                
                // Second pass - use values within reasonable range of median
                for (EnergyData reading : recentSubset) {
                    double value = reading.getPowerGenerationWatts();
                    // Include only if within 3x the median (to filter extreme outliers)
                    if (median == 0 || (value <= median * 3 && value >= median / 3)) {
                        sum += value;
                        count++;
                    }
                }
                
                double avgGeneration = count > 0 ? sum / count : 0;
                currentSystemGeneration += avgGeneration;
            }
            
            // Get today's generation and consumption
            Double installationTodayGeneration = energyDataRepository.sumPowerGenerationForPeriod(
                    installation, startOfDay, endOfDay);
            Double installationTodayConsumption = energyDataRepository.sumPowerConsumptionForPeriod(
                    installation, startOfDay, endOfDay);
            
            // Get month-to-date generation and consumption
            Double installationMonthGeneration = energyDataRepository.sumPowerGenerationForPeriod(
                    installation, startOfMonth, endOfDay);
            Double installationMonthConsumption = energyDataRepository.sumPowerConsumptionForPeriod(
                    installation, startOfMonth, endOfDay);
            
            // Add to totals (convert from Watt-seconds to kWh)
            todayTotalGeneration += (installationTodayGeneration != null ? installationTodayGeneration : 0) / 1000.0 / 3600.0;
            todayTotalConsumption += (installationTodayConsumption != null ? installationTodayConsumption : 0) / 1000.0 / 3600.0;
            monthToDateGeneration += (installationMonthGeneration != null ? installationMonthGeneration : 0) / 1000.0 / 3600.0;
            monthToDateConsumption += (installationMonthConsumption != null ? installationMonthConsumption : 0) / 1000.0 / 3600.0;
        }
        
        // Calculate average efficiency
        if (todayTotalConsumption > 0) {
            averageEfficiency = (todayTotalGeneration / todayTotalConsumption) * 100;
        }

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
        SolarInstallationDTO.SolarInstallationDTOBuilder builder = SolarInstallationDTO.builder()
                .id(installation.getId())
                .name(installation.getName()) // Include name in the DTO
                .installedCapacityKW(installation.getInstalledCapacityKW())
                .location(installation.getLocation())
                .installationDate(installation.getInstallationDate())
                .status(installation.getStatus())
                .tamperDetected(installation.isTamperDetected())
                .lastTamperCheck(installation.getLastTamperCheck())
                .type(installation.getType() != null ? installation.getType() : SolarInstallation.InstallationType.RESIDENTIAL);

        // Safely handle null User reference
        if (installation.getUser() != null) {
            builder.userId(installation.getUser().getId())
                    .username(installation.getUser().getEmail());
        }

        return builder.build();
    }
}