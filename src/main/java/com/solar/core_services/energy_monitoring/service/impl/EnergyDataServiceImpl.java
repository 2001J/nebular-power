package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.dto.DashboardResponse;
import com.solar.core_services.energy_monitoring.dto.EnergyDataDTO;
import com.solar.core_services.energy_monitoring.dto.EnergyDataRequest;
import com.solar.core_services.energy_monitoring.dto.EnergyReadingBatchDTO;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.energy_monitoring.service.EnergyDataService;
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
public class EnergyDataServiceImpl implements EnergyDataService {

    private final EnergyDataRepository energyDataRepository;
    private final SolarInstallationRepository installationRepository;
    private final UserRepository userRepository;
    private final SolarInstallationService installationService;
    private final WebSocketService webSocketService;

    @Override
    @Transactional
    public EnergyDataDTO processEnergyData(EnergyDataRequest request) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(request.getInstallationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Solar installation not found with ID: " + request.getInstallationId()));

        // Create and save the energy data
        EnergyData energyData = new EnergyData();
        energyData.setInstallation(installation);
        energyData.setPowerGenerationWatts(request.getPowerGenerationWatts());
        energyData.setPowerConsumptionWatts(request.getPowerConsumptionWatts());
        energyData.setTimestamp(request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now());
        energyData.setDailyYieldKWh(request.getDailyYieldKWh());
        energyData.setTotalYieldKWh(request.getTotalYieldKWh());
        energyData.setSimulated(true); // Assuming all data is simulated for now

        // Calculate derived metrics
        energyData = calculateDerivedMetrics(energyData);

        // Save the energy data
        EnergyData savedData = energyDataRepository.save(energyData);

        // Convert to DTO
        EnergyDataDTO energyDataDTO = convertToDTO(savedData);

        // Send real-time update via WebSocket
        webSocketService.sendEnergyDataUpdate(installation.getId(), energyDataDTO);

        return energyDataDTO;
    }

    @Override
    @Transactional
    public List<EnergyDataDTO> processEnergyDataBatch(EnergyReadingBatchDTO batchRequest) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(batchRequest.getInstallationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Solar installation not found with ID: " + batchRequest.getInstallationId()));

        // Process each reading in the batch
        List<EnergyData> processedReadings = batchRequest.getReadings().stream()
                .map(reading -> {
                    // Create energy data from reading
                    EnergyData energyData = new EnergyData();
                    energyData.setInstallation(installation);
                    energyData.setPowerGenerationWatts(reading.getEnergyProduced());
                    energyData.setPowerConsumptionWatts(reading.getEnergyConsumed());
                    energyData.setTimestamp(reading.getTimestamp());

                    // Set other fields if available
                    // Note: Battery level is not currently supported in the EnergyData entity
                    // if (reading.getBatteryLevel() != null) {
                    //     energyData.setBatteryLevelPercentage(reading.getBatteryLevel());
                    // }

                    // Flag as simulated for now
                    energyData.setSimulated(true);

                    // Calculate derived metrics
                    return calculateDerivedMetrics(energyData);
                })
                .collect(Collectors.toList());

        // Save all readings in batch
        List<EnergyData> savedReadings = energyDataRepository.saveAll(processedReadings);

        // Convert to DTOs and send WebSocket updates
        List<EnergyDataDTO> responseList = savedReadings.stream()
                .map(data -> {
                    EnergyDataDTO dto = convertToDTO(data);
                    // Send real-time update via WebSocket for each reading
                    webSocketService.sendEnergyDataUpdate(installation.getId(), dto);
                    return dto;
                })
                .collect(Collectors.toList());

        return responseList;
    }

    @Override
    public List<EnergyDataDTO> getRecentReadings(Long installationId, int limit) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        // Get recent readings
        List<EnergyData> readings = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);

        // Limit the results
        if (readings.size() > limit) {
            readings = readings.subList(0, limit);
        }

        // Convert to DTOs and return
        return readings.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<EnergyDataDTO> getReadingsInDateRange(Long installationId, LocalDateTime startDate,
            LocalDateTime endDate) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        // Get readings in date range
        List<EnergyData> readings = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                installation, startDate, endDate);

        // Convert to DTOs and return
        return readings.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public DashboardResponse getDashboardData(Long customerId) {
        // Verify the customer exists
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + customerId));

        // Get all installations for the customer
        List<SolarInstallation> installations = installationRepository.findByUser(customer);

        if (installations.isEmpty()) {
            throw new ResourceNotFoundException("No solar installations found for customer with ID: " + customerId);
        }

        // For simplicity, we'll just use the first installation for now
        // In a real application, you might want to aggregate data from all
        // installations
        SolarInstallation primaryInstallation = installations.get(0);

        return getInstallationDashboard(primaryInstallation.getId());
    }

    @Override
    public DashboardResponse getInstallationDashboard(Long installationId) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        // Get recent readings
        List<EnergyData> recentReadings = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);

        // Get today's data
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        // Get week-to-date data
        LocalDateTime startOfWeek = LocalDateTime.of(LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1), LocalTime.MIDNIGHT);

        // Get month-to-date data
        LocalDateTime startOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIDNIGHT);

        // Get year-to-date data
        LocalDateTime startOfYear = LocalDateTime.of(LocalDate.now().withDayOfYear(1), LocalTime.MIDNIGHT);

        // Calculate current values
        double currentPowerGeneration = recentReadings.isEmpty() ? 0 : recentReadings.get(0).getPowerGenerationWatts();
        double currentPowerConsumption = recentReadings.isEmpty() ? 0
                : recentReadings.get(0).getPowerConsumptionWatts();

        // Calculate today's generation and consumption
        Double todayGeneration = energyDataRepository.sumPowerGenerationForPeriod(installation, startOfDay, endOfDay);
        Double todayConsumption = energyDataRepository.sumPowerConsumptionForPeriod(installation, startOfDay, endOfDay);

        // Calculate week-to-date generation and consumption
        Double weekToDateGeneration = energyDataRepository.sumPowerGenerationForPeriod(installation, startOfWeek, endOfDay);
        Double weekToDateConsumption = energyDataRepository.sumPowerConsumptionForPeriod(installation, startOfWeek, endOfDay);

        // Calculate month-to-date generation and consumption
        Double monthToDateGeneration = energyDataRepository.sumPowerGenerationForPeriod(installation, startOfMonth,
                endOfDay);
        Double monthToDateConsumption = energyDataRepository.sumPowerConsumptionForPeriod(installation, startOfMonth,
                endOfDay);

        // Calculate year-to-date generation and consumption
        Double yearToDateGeneration = energyDataRepository.sumPowerGenerationForPeriod(installation, startOfYear, endOfDay);
        Double yearToDateConsumption = energyDataRepository.sumPowerConsumptionForPeriod(installation, startOfYear, endOfDay);

        // Convert kWh values (assuming readings are in watts and timestamps are in seconds)
        double todayGenerationKWh = (todayGeneration != null ? todayGeneration : 0) / 1000.0 / 3600.0;
        double todayConsumptionKWh = (todayConsumption != null ? todayConsumption : 0) / 1000.0 / 3600.0;
        double weekToDateGenerationKWh = (weekToDateGeneration != null ? weekToDateGeneration : 0) / 1000.0 / 3600.0;
        double weekToDateConsumptionKWh = (weekToDateConsumption != null ? weekToDateConsumption : 0) / 1000.0 / 3600.0;
        double monthToDateGenerationKWh = (monthToDateGeneration != null ? monthToDateGeneration : 0) / 1000.0 / 3600.0;
        double monthToDateConsumptionKWh = (monthToDateConsumption != null ? monthToDateConsumption : 0) / 1000.0
                / 3600.0;
        double yearToDateGenerationKWh = (yearToDateGeneration != null ? yearToDateGeneration : 0) / 1000.0 / 3600.0;
        double yearToDateConsumptionKWh = (yearToDateConsumption != null ? yearToDateConsumption : 0) / 1000.0 / 3600.0;

        // Calculate efficiency
        double currentEfficiency = 0;
        if (currentPowerConsumption > 0) {
            currentEfficiency = (currentPowerGeneration / currentPowerConsumption) * 100;
        }

        // Make sure efficiency is a percentage value (0-100 range)
        if (currentEfficiency > 0 && currentEfficiency <= 1.0) {
            currentEfficiency = currentEfficiency * 100.0; // Convert from decimal to percentage
        }

        // Cap efficiency at 100% for more reasonable values
        double cappedEfficiency = Math.min(100.0, currentEfficiency);

        // Calculate average efficiency based on utilization and capacity
        double averageEfficiency = 0;

        // Calculate utilization rate (currentGeneration as percentage of installed capacity)
        double utilizationRate = 0;
        if (installation.getInstalledCapacityKW() > 0) {
            utilizationRate = Math.min(1.0, currentPowerGeneration / (installation.getInstalledCapacityKW() * 1000));

            // Calculate average efficiency based on utilization rate
            // At high utilization (near capacity), efficiency should be close to 100%
            // At low utilization, use the capped efficiency value
            if (utilizationRate > 0.7) {
                // High production time - efficiency close to 100%
                averageEfficiency = 90.0 + (10.0 * utilizationRate);
            } else if (utilizationRate > 0.3) {
                // Medium production time - efficiency between 70-90%
                averageEfficiency = 70.0 + (20.0 * ((utilizationRate - 0.3) / 0.4));
            } else if (utilizationRate > 0) {
                // Low production time - efficiency between 0-70% based on utilization
                averageEfficiency = Math.max(cappedEfficiency, utilizationRate * 70.0 / 0.3);
            } else {
                // No production - use capped efficiency or 0
                averageEfficiency = cappedEfficiency;
            }
        }

        // Build the dashboard response
        DashboardResponse response = DashboardResponse.builder()
                .installationId(installationId)
                .currentPowerGenerationWatts(currentPowerGeneration)
                .currentPowerConsumptionWatts(currentPowerConsumption)
                .todayGenerationKWh(todayGenerationKWh)
                .todayConsumptionKWh(todayConsumptionKWh)
                .weekToDateGenerationKWh(weekToDateGenerationKWh)
                .weekToDateConsumptionKWh(weekToDateConsumptionKWh)
                .monthToDateGenerationKWh(monthToDateGenerationKWh)
                .monthToDateConsumptionKWh(monthToDateConsumptionKWh)
                .yearToDateGenerationKWh(yearToDateGenerationKWh)
                .yearToDateConsumptionKWh(yearToDateConsumptionKWh)
                .lifetimeGenerationKWh(installation.getInstalledCapacityKW() * 24 * 30 * 12) // Placeholder calculation
                .lifetimeConsumptionKWh(installation.getInstalledCapacityKW() * 24 * 30 * 12 * 0.8) // Placeholder calculation
                .currentEfficiencyPercentage(currentEfficiency)
                .averageEfficiencyPercentage(averageEfficiency)
                .lastUpdated(recentReadings.isEmpty() ? LocalDateTime.now() : recentReadings.get(0).getTimestamp())
                .recentReadings(recentReadings.stream()
                        .limit(10)
                        .map(this::convertToDTO)
                        .collect(Collectors.toList()))
                .installationDetails(convertToDTO(installation))
                .build();

        return response;
    }

    @Override
    public EnergyData calculateDerivedMetrics(EnergyData energyData) {
        // For now, we'll just return the data as is
        // In a real application, you might want to calculate additional metrics
        return energyData;
    }

    // Helper methods for DTO conversion
    private EnergyDataDTO convertToDTO(EnergyData energyData) {
        return EnergyDataDTO.builder()
                .id(energyData.getId())
                .installationId(energyData.getInstallation().getId())
                .powerGenerationWatts(energyData.getPowerGenerationWatts())
                .powerConsumptionWatts(energyData.getPowerConsumptionWatts())
                .timestamp(energyData.getTimestamp())
                .dailyYieldKWh(energyData.getDailyYieldKWh())
                .totalYieldKWh(energyData.getTotalYieldKWh())
                .isSimulated(energyData.isSimulated())
                .build();
    }

    private SolarInstallationDTO convertToDTO(SolarInstallation installation) {
        return SolarInstallationDTO.builder()
                .id(installation.getId())
                .userId(installation.getUser().getId())
                .username(installation.getUser().getEmail())
                .name(installation.getName())
                .installedCapacityKW(installation.getInstalledCapacityKW())
                .location(installation.getLocation())
                .installationDate(installation.getInstallationDate())
                .status(installation.getStatus())
                .tamperDetected(installation.isTamperDetected())
                .lastTamperCheck(installation.getLastTamperCheck())
                .type(installation.getType()) // Added the installation type here
                .build();
    }
}
