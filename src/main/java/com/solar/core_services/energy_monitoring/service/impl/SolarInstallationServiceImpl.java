package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.dto.DeviceStatusRequest;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.dto.SystemOverviewResponse;
import com.solar.core_services.energy_monitoring.dto.EnergyReadingDTO;
import com.solar.core_services.energy_monitoring.dto.TopProducerDTO;
import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.EnergySummary;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.EnergySummaryRepository;
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
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SolarInstallationServiceImpl implements SolarInstallationService {

    private final SolarInstallationRepository installationRepository;
    private final UserRepository userRepository;
    private final EnergyDataRepository energyDataRepository;
    private final EnergySummaryRepository energySummaryRepository;
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

        // Get active and suspended counts
        long activeCount = allInstallations.stream()
                .filter(i -> i.getStatus() == SolarInstallation.InstallationStatus.ACTIVE)
                .count();

        long suspendedCount = allInstallations.stream()
                .filter(i -> i.getStatus() == SolarInstallation.InstallationStatus.SUSPENDED)
                .count();

        // Get installations with tamper alerts
        List<SolarInstallation> tamperAlertInstallations = allInstallations.stream()
                .filter(SolarInstallation::isTamperDetected)
                .collect(Collectors.toList());

        // Calculate total capacity
        double totalCapacity = allInstallations.stream()
                .mapToDouble(SolarInstallation::getInstalledCapacityKW)
                .sum();

        // Define time periods
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        LocalDateTime endOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);

        // Get week-to-date data
        LocalDateTime startOfWeek = LocalDateTime.of(LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1), LocalTime.MIDNIGHT);

        // Get month-to-date data
        LocalDateTime startOfMonth = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIDNIGHT);

        // Get year-to-date data
        LocalDateTime startOfYear = LocalDateTime.of(LocalDate.now().withDayOfYear(1), LocalTime.MIDNIGHT);

        // Calculate system-wide values from actual data
        double currentSystemGeneration = 0;
        double todayTotalGeneration = 0;
        double todayTotalConsumption = 0;
        double weekToDateGeneration = 0;
        double weekToDateConsumption = 0;
        double monthToDateGeneration = 0;
        double monthToDateConsumption = 0;
        double yearToDateGeneration = 0;
        double yearToDateConsumption = 0;
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

            // Integrate today's generation and consumption accurately
            List<EnergyData> todayAsc = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampAsc(
                    installation, startOfDay, endOfDay);
            double[] todayIntegrated = integrateEnergy(todayAsc);
            todayTotalGeneration += todayIntegrated[0];
            todayTotalConsumption += todayIntegrated[1];
        }

        // Calculate average efficiency
        if (todayTotalConsumption > 0) {
            averageEfficiency = Math.min(100.0, (todayTotalGeneration / todayTotalConsumption) * 100);
        }

        // Compute WTD/MTD/YTD from DAILY summaries plus today's integrated values
        LocalDate todayDate = LocalDate.now();
        LocalDate startOfWeekDate = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
        LocalDate firstOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate firstOfYear = LocalDate.now().with(TemporalAdjusters.firstDayOfYear());

        if (todayDate.isAfter(startOfWeekDate)) {
            List<EnergySummary> weekSummaries = energySummaryRepository.findByPeriodAndDateBetween(
                    EnergySummary.SummaryPeriod.DAILY, startOfWeekDate, todayDate.minusDays(1));
            weekToDateGeneration = weekSummaries.stream().mapToDouble(EnergySummary::getTotalGenerationKWh).sum() + todayTotalGeneration;
            weekToDateConsumption = weekSummaries.stream().mapToDouble(EnergySummary::getTotalConsumptionKWh).sum() + todayTotalConsumption;
        } else {
            weekToDateGeneration = todayTotalGeneration;
            weekToDateConsumption = todayTotalConsumption;
        }

        if (todayDate.isAfter(firstOfMonth)) {
            List<EnergySummary> monthSummaries = energySummaryRepository.findByPeriodAndDateBetween(
                    EnergySummary.SummaryPeriod.DAILY, firstOfMonth, todayDate.minusDays(1));
            monthToDateGeneration = monthSummaries.stream().mapToDouble(EnergySummary::getTotalGenerationKWh).sum() + todayTotalGeneration;
            monthToDateConsumption = monthSummaries.stream().mapToDouble(EnergySummary::getTotalConsumptionKWh).sum() + todayTotalConsumption;
        } else {
            monthToDateGeneration = todayTotalGeneration;
            monthToDateConsumption = todayTotalConsumption;
        }

        if (todayDate.isAfter(firstOfYear)) {
            List<EnergySummary> yearDailySummaries = energySummaryRepository.findByPeriodAndDateBetween(
                    EnergySummary.SummaryPeriod.DAILY, firstOfYear, todayDate.minusDays(1));
            yearToDateGeneration = yearDailySummaries.stream().mapToDouble(EnergySummary::getTotalGenerationKWh).sum() + todayTotalGeneration;
            yearToDateConsumption = yearDailySummaries.stream().mapToDouble(EnergySummary::getTotalConsumptionKWh).sum() + todayTotalConsumption;
        } else {
            yearToDateGeneration = todayTotalGeneration;
            yearToDateConsumption = todayTotalConsumption;
        }

        // Get installations by status distribution
        Map<String, Long> installationsByStatus = allInstallations.stream()
                .collect(Collectors.groupingBy(
                        installation -> installation.getStatus().name(),
                        Collectors.counting()
                ));

        // Get recent readings from all installations (last reading from each active installation)
        List<EnergyReadingDTO> recentInstallationReadings = activeInstallations.stream()
                .map(installation -> {
                    List<EnergyData> readings = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);
                    if (readings.isEmpty()) {
                        return null;
                    }
                    EnergyData latestReading = readings.get(0);
                    return new EnergyReadingDTO(
                            installation.getId(),
                            latestReading.getTimestamp(),
                            latestReading.getPowerGenerationWatts(),
                            latestReading.getPowerConsumptionWatts()
                    );
                })
                .filter(reading -> reading != null)
                .collect(Collectors.toList());

        // Get top producers using integrated today's generation (kWh)
        List<TopProducerDTO> topProducers = activeInstallations.stream()
                .sorted((i1, i2) -> {
                    double g1 = 0;
                    double g2 = 0;
                    try {
                        List<EnergyData> a = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampAsc(i1, startOfDay, endOfDay);
                        g1 = integrateEnergy(a)[0];
                    } catch (Exception ignored) {}
                    try {
                        List<EnergyData> b = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampAsc(i2, startOfDay, endOfDay);
                        g2 = integrateEnergy(b)[0];
                    } catch (Exception ignored) {}
                    return Double.compare(g2, g1);
                })
                .limit(5)
                .map(installation -> {
                    // Integrated today's values for display
                    List<EnergyData> asc = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampAsc(
                            installation, startOfDay, endOfDay);
                    double[] integrated = integrateEnergy(asc);
                    double todayGenerationKWh = integrated[0];
                    double todayConsumptionKWh = integrated[1];

                    // Get most recent reading for current generation
                    List<EnergyData> recentReadings = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);
                    Double currentGenerationWatts = recentReadings.isEmpty() ? 0 : recentReadings.get(0).getPowerGenerationWatts();

                    // Calculate efficiency
                    Double efficiency = 0.0;
                    if (todayConsumptionKWh > 0) {
                        efficiency = (todayGenerationKWh / todayConsumptionKWh) * 100;
                    }

                    // Convert to TopProducerDTO; method expects Ws for todayGeneration, so convert kWh -> Ws
                    double todayGenerationWs = todayGenerationKWh * 1000.0 * 3600.0;
                    return convertToTopProducerDTO(installation, todayGenerationWs, currentGenerationWatts, efficiency);
                })
                .collect(Collectors.toList());

        // Build the system overview response
        SystemOverviewResponse response = SystemOverviewResponse.builder()
                .totalActiveInstallations((int) activeCount)
                .totalSuspendedInstallations((int) suspendedCount)
                .totalInstallationsWithTamperAlerts(tamperAlertInstallations.size())
                .totalSystemCapacityKW(totalCapacity)
                .currentSystemGenerationWatts(currentSystemGeneration)
                .todayTotalGenerationKWh(todayTotalGeneration)
                .todayTotalConsumptionKWh(todayTotalConsumption)
                .weekToDateGenerationKWh(weekToDateGeneration)
                .weekToDateConsumptionKWh(weekToDateConsumption)
                .monthToDateGenerationKWh(monthToDateGeneration)
                .monthToDateConsumptionKWh(monthToDateConsumption)
                .yearToDateGenerationKWh(yearToDateGeneration)
                .yearToDateConsumptionKWh(yearToDateConsumption)
                .averageSystemEfficiency(averageEfficiency)
                .lastUpdated(LocalDateTime.now())
                .recentlyActiveInstallations(allInstallations.stream()
                        .filter(i -> i.getStatus() == SolarInstallation.InstallationStatus.ACTIVE)
                        .limit(5)
                        .map(this::convertToDTO)
                        .collect(Collectors.toList()))
                .topProducers(topProducers)
                .recentInstallationReadings(recentInstallationReadings)
                .installationsByStatus(installationsByStatus)
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

    private TopProducerDTO convertToTopProducerDTO(SolarInstallation installation, Double todayGeneration, Double currentGenerationWatts, Double efficiencyValue) {
        // Calculate sensible default values if metrics are null
        double todayGenerationKWh = (todayGeneration != null ? todayGeneration : 0) / 1000.0 / 3600.0;
        double currentGeneration = (currentGenerationWatts != null ? currentGenerationWatts : 0);

        // Get the efficiency from energy summaries if current calculation is zero
        double efficiency = efficiencyValue != null ? efficiencyValue : 0;
        if (efficiency == 0) {
            // Try to get from recent daily summaries
            LocalDate today = LocalDate.now();
            Optional<EnergySummary> todaySummary = energySummaryRepository.findByInstallationAndPeriodAndDate(
                    installation, EnergySummary.SummaryPeriod.DAILY, today);

            if (todaySummary.isPresent() && todaySummary.get().getEfficiencyPercentage() > 0) {
                efficiency = todaySummary.get().getEfficiencyPercentage();
            } else {
                // If no daily summary for today, check weekly summary
                LocalDate startOfWeek = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
                Optional<EnergySummary> weeklySummary = energySummaryRepository.findByInstallationAndPeriodAndDate(
                        installation, EnergySummary.SummaryPeriod.WEEKLY, startOfWeek);

                if (weeklySummary.isPresent() && weeklySummary.get().getEfficiencyPercentage() > 0) {
                    efficiency = weeklySummary.get().getEfficiencyPercentage();
                }
            }
        }

        // Make sure efficiency is a percentage value (0-100 range)
        if (efficiency > 0 && efficiency <= 1.0) {
            efficiency = efficiency * 100.0; // Convert from decimal to percentage
        }

        // Cap efficiency at 100% for more reasonable values
        double cappedEfficiency = Math.min(100.0, efficiency);

        // Calculate average efficiency based on utilization and capacity
        double averageEfficiency = 0;

        // Calculate utilization rate (currentGeneration as percentage of installed capacity)
        double utilizationRate = 0;
        if (installation.getInstalledCapacityKW() > 0) {
            utilizationRate = Math.min(1.0, currentGeneration / (installation.getInstalledCapacityKW() * 1000));

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

        return TopProducerDTO.builder()
                .id(installation.getId())
                .name(installation.getName())
                .userId(installation.getUser() != null ? installation.getUser().getId() : null)
                .username(installation.getUser() != null ? installation.getUser().getEmail() : null)
                .location(installation.getLocation())
                .installedCapacityKW(installation.getInstalledCapacityKW())
                .type(installation.getType() != null ? installation.getType() : SolarInstallation.InstallationType.RESIDENTIAL)
                .currentPowerGenerationWatts(currentGeneration)
                .todayGenerationKWh(todayGenerationKWh)
                .efficiencyPercentage(efficiency)
                .averageEfficiencyPercentage(averageEfficiency)
                .utilizationRate(utilizationRate)
                .build();
    }

    // Integrate energy using trapezoidal rule over ascending time-ordered readings
    private static double[] integrateEnergy(List<EnergyData> ascReadings) {
        if (ascReadings == null || ascReadings.size() < 2) return new double[]{0, 0};
        double genKWh = 0;
        double conKWh = 0;
        for (int i = 1; i < ascReadings.size(); i++) {
            EnergyData a = ascReadings.get(i - 1);
            EnergyData b = ascReadings.get(i);
            if (!b.getTimestamp().isAfter(a.getTimestamp())) continue;
            long seconds = java.time.temporal.ChronoUnit.SECONDS.between(a.getTimestamp(), b.getTimestamp());
            double avgGenW = (Math.max(0, a.getPowerGenerationWatts()) + Math.max(0, b.getPowerGenerationWatts())) / 2.0;
            double avgConW = (Math.max(0, a.getPowerConsumptionWatts()) + Math.max(0, b.getPowerConsumptionWatts())) / 2.0;
            genKWh += avgGenW * seconds / 3600_000.0;
            conKWh += avgConW * seconds / 3600_000.0;
        }
        return new double[]{genKWh, conKWh};
    }
}
