package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.dto.*;
import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.EnergySummaryRepository;
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
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnergyDataServiceImpl implements EnergyDataService {

    private final EnergyDataRepository energyDataRepository;
    private final SolarInstallationRepository installationRepository;
    private final UserRepository userRepository;
    private final SolarInstallationService installationService;
    private final WebSocketService webSocketService;
    private final EnergySummaryRepository energySummaryRepository;

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
        
        // Use efficiency from request if provided, otherwise calculate from capacity
        double efficiency = request.getEfficiencyPercentage();
        if (efficiency <= 0 && installation.getInstalledCapacityKW() > 0) {
            // Calculate efficiency as percentage of installed capacity
            double capacityWatts = installation.getInstalledCapacityKW() * 1000;
            efficiency = Math.min(100.0, (request.getPowerGenerationWatts() / capacityWatts) * 100);
        }
        energyData.setEfficiencyPercentage(efficiency);
        
        energyData.setSimulated(true); // Assuming all data is simulated for now

        // Calculate derived metrics
        energyData = calculateDerivedMetrics(energyData);

        // Save the energy data
        EnergyData savedData = energyDataRepository.save(energyData);

        // Convert to DTO
        EnergyDataDTO energyDataDTO = convertToDTO(savedData);
        energyDataDTO.setPowerUnit("W");
        energyDataDTO.setEnergyUnit("kWh");

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

        // Calculate today's generation and consumption via proper time integration
        List<EnergyData> todayAsc = energyDataRepository
                .findByInstallationAndTimestampBetweenOrderByTimestampAsc(installation, startOfDay, endOfDay);
        double[] todayIntegrated = integrateEnergy(todayAsc);
        double todayGenerationKWh = todayIntegrated[0];
        double todayConsumptionKWh = todayIntegrated[1];

        // Calculate week-to-date using DAILY summaries plus today's integration
        LocalDate startOfWeekDate = LocalDate.now().minusDays(LocalDate.now().getDayOfWeek().getValue() - 1);
        LocalDate todayDate = LocalDate.now();
        Double weekToDateGenFromSummaries = energySummaryRepository.sumTotalGenerationForPeriod(
                installation, com.solar.core_services.energy_monitoring.model.EnergySummary.SummaryPeriod.DAILY,
                startOfWeekDate, todayDate.minusDays(1));
        Double weekToDateConFromSummaries = energySummaryRepository.sumTotalConsumptionForPeriod(
                installation, com.solar.core_services.energy_monitoring.model.EnergySummary.SummaryPeriod.DAILY,
                startOfWeekDate, todayDate.minusDays(1));
        double weekToDateGenerationKWh = (weekToDateGenFromSummaries != null ? weekToDateGenFromSummaries : 0) + todayGenerationKWh;
        double weekToDateConsumptionKWh = (weekToDateConFromSummaries != null ? weekToDateConFromSummaries : 0) + todayConsumptionKWh;

        // Calculate month-to-date using DAILY summaries plus today
        LocalDate firstOfMonth = LocalDate.now().withDayOfMonth(1);
        Double monthToDateGenFromSummaries = energySummaryRepository.sumTotalGenerationForPeriod(
                installation, com.solar.core_services.energy_monitoring.model.EnergySummary.SummaryPeriod.DAILY,
                firstOfMonth, todayDate.minusDays(1));
        Double monthToDateConFromSummaries = energySummaryRepository.sumTotalConsumptionForPeriod(
                installation, com.solar.core_services.energy_monitoring.model.EnergySummary.SummaryPeriod.DAILY,
                firstOfMonth, todayDate.minusDays(1));
        double monthToDateGenerationKWh = (monthToDateGenFromSummaries != null ? monthToDateGenFromSummaries : 0) + todayGenerationKWh;
        double monthToDateConsumptionKWh = (monthToDateConFromSummaries != null ? monthToDateConFromSummaries : 0) + todayConsumptionKWh;

        // Calculate year-to-date using DAILY summaries plus today
        LocalDate firstOfYear = LocalDate.now().withDayOfYear(1);
        Double yearToDateGenFromSummaries = energySummaryRepository.sumTotalGenerationForPeriod(
                installation, com.solar.core_services.energy_monitoring.model.EnergySummary.SummaryPeriod.DAILY,
                firstOfYear, todayDate.minusDays(1));
        Double yearToDateConFromSummaries = energySummaryRepository.sumTotalConsumptionForPeriod(
                installation, com.solar.core_services.energy_monitoring.model.EnergySummary.SummaryPeriod.DAILY,
                firstOfYear, todayDate.minusDays(1));
        double yearToDateGenerationKWh = (yearToDateGenFromSummaries != null ? yearToDateGenFromSummaries : 0) + todayGenerationKWh;
        double yearToDateConsumptionKWh = (yearToDateConFromSummaries != null ? yearToDateConFromSummaries : 0) + todayConsumptionKWh;

        // Values already calculated in kWh via integration and summaries

        // Calculate REAL efficiency based on capacity utilization, not generation/consumption ratio
        // Efficiency = (actual output / rated capacity) * 100
        double currentEfficiency = 0;
        double capacityWatts = installation.getInstalledCapacityKW() * 1000;
        
        // First, try to get efficiency from the most recent reading (sent by Pi)
        if (!recentReadings.isEmpty() && recentReadings.get(0).getEfficiencyPercentage() > 0) {
            currentEfficiency = recentReadings.get(0).getEfficiencyPercentage();
        } else if (capacityWatts > 0 && currentPowerGeneration > 0) {
            // Calculate efficiency as percentage of installed capacity being used
            currentEfficiency = Math.min(100.0, (currentPowerGeneration / capacityWatts) * 100);
        }
        
        // Calculate average efficiency from today's readings
        double averageEfficiency = 0;
        if (!todayAsc.isEmpty()) {
            // Average the efficiency from all readings that have generation
            double totalEfficiency = 0;
            int countWithGeneration = 0;
            for (EnergyData reading : todayAsc) {
                if (reading.getEfficiencyPercentage() > 0) {
                    totalEfficiency += reading.getEfficiencyPercentage();
                    countWithGeneration++;
                } else if (reading.getPowerGenerationWatts() > 0 && capacityWatts > 0) {
                    // Calculate from power if efficiency not stored
                    double readingEfficiency = Math.min(100.0, 
                        (reading.getPowerGenerationWatts() / capacityWatts) * 100);
                    totalEfficiency += readingEfficiency;
                    countWithGeneration++;
                }
            }
            if (countWithGeneration > 0) {
                averageEfficiency = totalEfficiency / countWithGeneration;
            }
        }
        
        // If no average calculated, use current efficiency
        if (averageEfficiency == 0) {
            averageEfficiency = currentEfficiency;
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
                .lifetimeGenerationKWh(computeLifetimeGenerationKWh(installation))
                .lifetimeConsumptionKWh(computeLifetimeConsumptionKWh(installation))
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
                .efficiencyPercentage(energyData.getEfficiencyPercentage())
                .isSimulated(energyData.isSimulated())
                .powerUnit("W")
                .energyUnit("kWh")
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

    private double computeLifetimeGenerationKWh(SolarInstallation installation) {
        Double fromSummaries = energySummaryRepository.sumTotalGenerationForInstallation(installation);
        if (fromSummaries != null && fromSummaries > 0) return round3(fromSummaries);
        // Fallback: integrate across all readings
        List<EnergyData> allDesc = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);
        if (allDesc == null || allDesc.size() < 2) return 0.0;
        List<EnergyData> allAsc = new ArrayList<>(allDesc);
        allAsc.sort(Comparator.comparing(EnergyData::getTimestamp));
        return integrateEnergy(allAsc)[0];
    }

    private double computeLifetimeConsumptionKWh(SolarInstallation installation) {
        Double fromSummaries = energySummaryRepository.sumTotalConsumptionForInstallation(installation);
        if (fromSummaries != null && fromSummaries > 0) return round3(fromSummaries);
        List<EnergyData> allDesc = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);
        if (allDesc == null || allDesc.size() < 2) return 0.0;
        List<EnergyData> allAsc = new ArrayList<>(allDesc);
        allAsc.sort(Comparator.comparing(EnergyData::getTimestamp));
        return integrateEnergy(allAsc)[1];
    }

    // --- Aggregated chart series ---
    @Override
    public List<EnergyChartPointDTO> getChartSeries(Long installationId, LocalDateTime startDate, LocalDateTime endDate, String bucketStr) {
        // Verify installation
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        Bucket bucket = Bucket.from(bucketStr);
        List<EnergyData> readings = energyDataRepository
                .findByInstallationAndTimestampBetweenOrderByTimestampAsc(installation, startDate, endDate);

        if (readings.isEmpty()) return List.of();

        // Ensure sorted by timestamp ascending
        readings.sort(Comparator.comparing(EnergyData::getTimestamp));

        // Aggregate energy (kWh) per bucket by splitting intervals across bucket boundaries
        Map<LocalDateTime, BucketAccumulator> bucketMap = new LinkedHashMap<>();

        for (int i = 1; i < readings.size(); i++) {
            EnergyData prev = readings.get(i - 1);
            EnergyData curr = readings.get(i);
            LocalDateTime t0 = prev.getTimestamp();
            LocalDateTime t1 = curr.getTimestamp();
            if (!t1.isAfter(t0)) continue; // skip zero/negative intervals

            double gen0 = Math.max(0, prev.getPowerGenerationWatts());
            double gen1 = Math.max(0, curr.getPowerGenerationWatts());
            double con0 = Math.max(0, prev.getPowerConsumptionWatts());
            double con1 = Math.max(0, curr.getPowerConsumptionWatts());

            // Average power over the interval (trapezoidal)
            double avgGenW = (gen0 + gen1) / 2.0;
            double avgConW = (con0 + con1) / 2.0;

            LocalDateTime segStart = t0;
            while (segStart.isBefore(t1)) {
                LocalDateTime bucketStart = floorToBucket(segStart, bucket);
                LocalDateTime bucketEnd = nextBoundary(bucketStart, bucket);
                LocalDateTime segEnd = t1.isBefore(bucketEnd) ? t1 : bucketEnd;

                long seconds = ChronoUnit.SECONDS.between(segStart, segEnd);
                if (seconds > 0) {
                    double genKWh = avgGenW * seconds / 3600_000.0; // W * s -> Wh -> kWh
                    double conKWh = avgConW * seconds / 3600_000.0;
                    BucketAccumulator acc = bucketMap.computeIfAbsent(bucketStart, k -> new BucketAccumulator());
                    acc.generationKWh += genKWh;
                    acc.consumptionKWh += conKWh;
                }

                segStart = segEnd;
            }
        }

        List<EnergyChartPointDTO> result = new ArrayList<>(bucketMap.size());
        for (Map.Entry<LocalDateTime, BucketAccumulator> e : bucketMap.entrySet()) {
            BucketAccumulator acc = e.getValue();
            double hours = ChronoUnit.SECONDS.between(e.getKey(), nextBoundary(e.getKey(), bucket)) / 3600.0;
            double avgGenW = hours > 0 ? (acc.generationKWh / hours) * 1000.0 : 0;
            double avgConW = hours > 0 ? (acc.consumptionKWh / hours) * 1000.0 : 0;
            result.add(EnergyChartPointDTO.builder()
                    .bucketStart(e.getKey())
                    .generationKWh(round3(acc.generationKWh))
                    .consumptionKWh(round3(acc.consumptionKWh))
                    .avgGenerationWatts(round1(avgGenW))
                    .avgConsumptionWatts(round1(avgConW))
                    .powerUnit("W")
                    .energyUnit("kWh")
                    .build());
        }
        return result;
    }

    private static class BucketAccumulator { double generationKWh = 0; double consumptionKWh = 0; }

    private enum Bucket { MINUTE, HOUR, DAY, MONTH;
        static Bucket from(String s) {
            if (s == null) return HOUR;
            switch (s.toLowerCase()) {
                case "minute": case "min": case "m": return MINUTE;
                case "day": case "d": return DAY;
                case "month": case "mon": return MONTH;
                default: return HOUR;
            }
        }
    }

    private LocalDateTime floorToBucket(LocalDateTime ts, Bucket b) {
        switch (b) {
            case MINUTE: return ts.truncatedTo(ChronoUnit.MINUTES);
            case HOUR: return ts.truncatedTo(ChronoUnit.HOURS);
            case DAY: return LocalDateTime.of(ts.toLocalDate(), LocalTime.MIDNIGHT);
            case MONTH: return LocalDateTime.of(ts.getYear(), ts.getMonth(), 1, 0, 0);
            default: return ts.truncatedTo(ChronoUnit.HOURS);
        }
    }

    private LocalDateTime nextBoundary(LocalDateTime bucketStart, Bucket b) {
        switch (b) {
            case MINUTE: return bucketStart.plusMinutes(1);
            case HOUR: return bucketStart.plusHours(1);
            case DAY: return bucketStart.plusDays(1);
            case MONTH: return bucketStart.plusMonths(1);
            default: return bucketStart.plusHours(1);
        }
    }

    private static double[] integrateEnergy(List<EnergyData> ascReadings) {
        if (ascReadings == null || ascReadings.size() < 2) return new double[]{0, 0};
        double genKWh = 0;
        double conKWh = 0;
        for (int i = 1; i < ascReadings.size(); i++) {
            EnergyData a = ascReadings.get(i - 1);
            EnergyData b = ascReadings.get(i);
            if (!b.getTimestamp().isAfter(a.getTimestamp())) continue;
            long seconds = ChronoUnit.SECONDS.between(a.getTimestamp(), b.getTimestamp());
            double avgGenW = (Math.max(0, a.getPowerGenerationWatts()) + Math.max(0, b.getPowerGenerationWatts())) / 2.0;
            double avgConW = (Math.max(0, a.getPowerConsumptionWatts()) + Math.max(0, b.getPowerConsumptionWatts())) / 2.0;
            genKWh += avgGenW * seconds / 3600_000.0;
            conKWh += avgConW * seconds / 3600_000.0;
        }
        return new double[]{round3(genKWh), round3(conKWh)};
    }

    private static double round3(double v) { return Math.round(v * 1000.0) / 1000.0; }
    private static double round1(double v) { return Math.round(v * 10.0) / 10.0; }

    // --- System-wide aggregated series ---
    @Override
    public List<com.solar.core_services.energy_monitoring.dto.SystemSeriesPointDTO> getSystemSeries(
            LocalDateTime startDate, LocalDateTime endDate, String bucketStr) {
        Bucket bucket = Bucket.from(bucketStr);

        // Collect active installations
        List<SolarInstallation> installations = installationRepository.findAll().stream()
                .filter(i -> i.getStatus() == SolarInstallation.InstallationStatus.ACTIVE)
                .collect(Collectors.toList());

        Map<LocalDateTime, SysAcc> sysMap = new LinkedHashMap<>();

        for (SolarInstallation inst : installations) {
            List<EnergyData> readings = energyDataRepository
                    .findByInstallationAndTimestampBetweenOrderByTimestampAsc(inst, startDate, endDate);
            if (readings.size() < 2) continue;
            // Ensure sorted
            readings.sort(Comparator.comparing(EnergyData::getTimestamp));

            SolarInstallation.InstallationType type = inst.getType() != null ? inst.getType() : SolarInstallation.InstallationType.RESIDENTIAL;
            String typeKey = type.name();

            for (int i = 1; i < readings.size(); i++) {
                EnergyData prev = readings.get(i - 1);
                EnergyData curr = readings.get(i);
                LocalDateTime t0 = prev.getTimestamp();
                LocalDateTime t1 = curr.getTimestamp();
                if (!t1.isAfter(t0)) continue;

                double gen0 = Math.max(0, prev.getPowerGenerationWatts());
                double gen1 = Math.max(0, curr.getPowerGenerationWatts());
                double con0 = Math.max(0, prev.getPowerConsumptionWatts());
                double con1 = Math.max(0, curr.getPowerConsumptionWatts());
                double avgGenW = (gen0 + gen1) / 2.0;
                double avgConW = (con0 + con1) / 2.0;

                LocalDateTime segStart = t0;
                while (segStart.isBefore(t1)) {
                    LocalDateTime bStart = floorToBucket(segStart, bucket);
                    LocalDateTime bEnd = nextBoundary(bStart, bucket);
                    LocalDateTime segEnd = t1.isBefore(bEnd) ? t1 : bEnd;
                    long seconds = ChronoUnit.SECONDS.between(segStart, segEnd);
                    if (seconds > 0) {
                        double gKWh = avgGenW * seconds / 3600_000.0;
                        double cKWh = avgConW * seconds / 3600_000.0;
                        SysAcc acc = sysMap.computeIfAbsent(bStart, k -> new SysAcc());
                        acc.generationKWh += gKWh;
                        acc.consumptionKWh += cKWh;
                        acc.generationByTypeKWh.merge(typeKey, gKWh, Double::sum);
                        acc.consumptionByTypeKWh.merge(typeKey, cKWh, Double::sum);
                    }
                    segStart = segEnd;
                }
            }
        }

        List<com.solar.core_services.energy_monitoring.dto.SystemSeriesPointDTO> result = new ArrayList<>(sysMap.size());
        for (Map.Entry<LocalDateTime, SysAcc> e : sysMap.entrySet()) {
            LocalDateTime bStart = e.getKey();
            double hours = ChronoUnit.SECONDS.between(bStart, nextBoundary(bStart, bucket)) / 3600.0;
            SysAcc acc = e.getValue();
            double avgGenW = hours > 0 ? (acc.generationKWh / hours) * 1000.0 : 0;
            double avgConW = hours > 0 ? (acc.consumptionKWh / hours) * 1000.0 : 0;
            result.add(com.solar.core_services.energy_monitoring.dto.SystemSeriesPointDTO.builder()
                    .bucketStart(bStart)
                    .generationKWh(round3(acc.generationKWh))
                    .consumptionKWh(round3(acc.consumptionKWh))
                    .avgGenerationWatts(round1(avgGenW))
                    .avgConsumptionWatts(round1(avgConW))
                    .generationByTypeKWh(acc.generationByTypeKWh)
                    .consumptionByTypeKWh(acc.consumptionByTypeKWh)
                    .powerUnit("W")
                    .energyUnit("kWh")
                    .build());
        }

        return result;
    }

    private static class SysAcc {
        double generationKWh = 0;
        double consumptionKWh = 0;
        Map<String, Double> generationByTypeKWh = new LinkedHashMap<>();
        Map<String, Double> consumptionByTypeKWh = new LinkedHashMap<>();
    }
}
