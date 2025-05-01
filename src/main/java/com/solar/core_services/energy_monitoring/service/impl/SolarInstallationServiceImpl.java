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

            // Get today's generation and consumption
            Double installationTodayGeneration = energyDataRepository.sumPowerGenerationForPeriod(
                    installation, startOfDay, endOfDay);
            Double installationTodayConsumption = energyDataRepository.sumPowerConsumptionForPeriod(
                    installation, startOfDay, endOfDay);

            // Get week-to-date generation and consumption
            Double installationWeekGeneration = energyDataRepository.sumPowerGenerationForPeriod(
                    installation, startOfWeek, endOfDay);
            Double installationWeekConsumption = energyDataRepository.sumPowerConsumptionForPeriod(
                    installation, startOfWeek, endOfDay);

            // Get month-to-date generation and consumption
            Double installationMonthGeneration = energyDataRepository.sumPowerGenerationForPeriod(
                    installation, startOfMonth, endOfDay);
            Double installationMonthConsumption = energyDataRepository.sumPowerConsumptionForPeriod(
                    installation, startOfMonth, endOfDay);

            // Get year-to-date generation and consumption
            Double installationYearGeneration = energyDataRepository.sumPowerGenerationForPeriod(
                    installation, startOfYear, endOfDay);
            Double installationYearConsumption = energyDataRepository.sumPowerConsumptionForPeriod(
                    installation, startOfYear, endOfDay);

            // Add to totals (convert from Watt-seconds to kWh)
            todayTotalGeneration += (installationTodayGeneration != null ? installationTodayGeneration : 0) / 1000.0 / 3600.0;
            todayTotalConsumption += (installationTodayConsumption != null ? installationTodayConsumption : 0) / 1000.0 / 3600.0;
            weekToDateGeneration += (installationWeekGeneration != null ? installationWeekGeneration : 0) / 1000.0 / 3600.0;
            weekToDateConsumption += (installationWeekConsumption != null ? installationWeekConsumption : 0) / 1000.0 / 3600.0;
            monthToDateGeneration += (installationMonthGeneration != null ? installationMonthGeneration : 0) / 1000.0 / 3600.0;
            monthToDateConsumption += (installationMonthConsumption != null ? installationMonthConsumption : 0) / 1000.0 / 3600.0;
            yearToDateGeneration += (installationYearGeneration != null ? installationYearGeneration : 0) / 1000.0 / 3600.0;
            yearToDateConsumption += (installationYearConsumption != null ? installationYearConsumption : 0) / 1000.0 / 3600.0;
        }

        // Calculate average efficiency
        if (todayTotalConsumption > 0) {
            averageEfficiency = Math.min(100.0, (todayTotalGeneration / todayTotalConsumption) * 100);
        }

        // Fall back to energy summaries if raw data isn't sufficient
        if (todayTotalGeneration == 0) {
            // Try to get daily summaries for today
            LocalDate today = LocalDate.now();
            List<EnergySummary> dailySummaries = energySummaryRepository.findByPeriodAndDate(
                    EnergySummary.SummaryPeriod.DAILY, today);

            if (!dailySummaries.isEmpty()) {
                todayTotalGeneration = dailySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalGenerationKWh)
                        .sum();
                todayTotalConsumption = dailySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalConsumptionKWh)
                        .sum();
            }
        }

        // Fall back to summaries for week-to-date if raw data isn't sufficient
        if (weekToDateGeneration == 0) {
            // Try to get weekly summaries for this week
            LocalDate startOfWeekDate = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
            List<EnergySummary> weeklySummaries = energySummaryRepository.findByPeriodAndDate(
                    EnergySummary.SummaryPeriod.WEEKLY, startOfWeekDate);

            if (!weeklySummaries.isEmpty()) {
                weekToDateGeneration = weeklySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalGenerationKWh)
                        .sum();
                weekToDateConsumption = weeklySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalConsumptionKWh)
                        .sum();
            }
        }

        // Fall back to summaries for month-to-date if raw data isn't sufficient
        if (monthToDateGeneration == 0) {
            // Try to get monthly summaries for this month
            LocalDate firstOfMonth = LocalDate.now().withDayOfMonth(1);
            List<EnergySummary> monthlySummaries = energySummaryRepository.findByPeriodAndDate(
                    EnergySummary.SummaryPeriod.MONTHLY, firstOfMonth);

            if (!monthlySummaries.isEmpty()) {
                monthToDateGeneration = monthlySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalGenerationKWh)
                        .sum();
                monthToDateConsumption = monthlySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalConsumptionKWh)
                        .sum();
            }
        }

        // Fall back to summaries for year-to-date if raw data isn't sufficient
        if (yearToDateGeneration == 0) {
            // Try to get yearly summaries for this year or monthly summaries and sum them up
            LocalDate firstOfYear = LocalDate.now().with(TemporalAdjusters.firstDayOfYear());

            // First try yearly summaries
            List<EnergySummary> yearlySummaries = energySummaryRepository.findByPeriodAndDate(
                    EnergySummary.SummaryPeriod.YEARLY, firstOfYear);

            if (!yearlySummaries.isEmpty()) {
                yearToDateGeneration = yearlySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalGenerationKWh)
                        .sum();
                yearToDateConsumption = yearlySummaries.stream()
                        .mapToDouble(EnergySummary::getTotalConsumptionKWh)
                        .sum();
            } else {
                // Fall back to monthly summaries for this year
                List<EnergySummary> thisYearMonthlySummaries = energySummaryRepository.findByPeriodAndDateBetween(
                        EnergySummary.SummaryPeriod.MONTHLY, 
                        firstOfYear, 
                        LocalDate.now());

                if (!thisYearMonthlySummaries.isEmpty()) {
                    yearToDateGeneration = thisYearMonthlySummaries.stream()
                            .mapToDouble(EnergySummary::getTotalGenerationKWh)
                            .sum();
                    yearToDateConsumption = thisYearMonthlySummaries.stream()
                            .mapToDouble(EnergySummary::getTotalConsumptionKWh)
                            .sum();
                }
            }
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

        // Get top producers
        List<TopProducerDTO> topProducers = activeInstallations.stream()
                .sorted((i1, i2) -> {
                    Double i1Gen = energyDataRepository.sumPowerGenerationForPeriod(i1, startOfDay, endOfDay);
                    Double i2Gen = energyDataRepository.sumPowerGenerationForPeriod(i2, startOfDay, endOfDay);
                    return Double.compare(
                            i2Gen != null ? i2Gen : 0,
                            i1Gen != null ? i1Gen : 0
                    );
                })
                .limit(5)
                .map(installation -> {
                    // Get installation's generation data
                    Double todayGeneration = energyDataRepository.sumPowerGenerationForPeriod(
                            installation, startOfDay, endOfDay);
                    Double todayConsumption = energyDataRepository.sumPowerConsumptionForPeriod(
                            installation, startOfDay, endOfDay);

                    // Get most recent reading for current generation
                    List<EnergyData> recentReadings = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);
                    Double currentGenerationWatts = recentReadings.isEmpty() ? 0 : recentReadings.get(0).getPowerGenerationWatts();

                    // Calculate efficiency
                    Double efficiency = 0.0;
                    if (todayConsumption != null && todayConsumption > 0) {
                        efficiency = (todayGeneration / todayConsumption) * 100;
                    }

                    // Convert to TopProducerDTO with production and efficiency metrics
                    return convertToTopProducerDTO(installation, todayGeneration, currentGenerationWatts, efficiency);
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

        // Calculate utilization rate (currentGeneration as percentage of installed capacity)
        double utilizationRate = 0;
        if (installation.getInstalledCapacityKW() > 0) {
            utilizationRate = Math.min(1.0, currentGeneration / (installation.getInstalledCapacityKW() * 1000));
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
                .utilizationRate(utilizationRate)
                .build();
    }
}
