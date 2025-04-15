package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.dto.EnergySummaryDTO;
import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.EnergySummary;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.EnergySummaryRepository;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.energy_monitoring.service.EnergySummaryService;
import com.solar.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnergySummaryServiceImpl implements EnergySummaryService {

    private final EnergySummaryRepository summaryRepository;
    private final EnergyDataRepository energyDataRepository;
    private final SolarInstallationRepository installationRepository;

    @Override
    @Transactional
    public EnergySummaryDTO generateDailySummary(Long installationId, LocalDate date) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Check if a summary already exists for this date
        Optional<EnergySummary> existingSummary = summaryRepository.findByInstallationAndPeriodAndDate(
                installation, EnergySummary.SummaryPeriod.DAILY, date);
        
        if (existingSummary.isPresent()) {
            return convertToDTO(existingSummary.get());
        }
        
        // Get energy data for the day
        LocalDateTime startOfDay = LocalDateTime.of(date, LocalTime.MIDNIGHT);
        LocalDateTime endOfDay = LocalDateTime.of(date, LocalTime.MAX);
        
        List<EnergyData> dayData = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                installation, startOfDay, endOfDay);
        
        if (dayData.isEmpty()) {
            // No data for this day, create an empty summary
            EnergySummary emptySummary = createEmptySummary(installation, date, EnergySummary.SummaryPeriod.DAILY);
            emptySummary.setPeriodStart(date);
            emptySummary.setPeriodEnd(date);
            
            EnergySummary savedSummary = summaryRepository.save(emptySummary);
            return convertToDTO(savedSummary);
        }
        
        // Calculate summary metrics
        double totalGeneration = 0;
        double totalConsumption = 0;
        double peakGeneration = 0;
        double peakConsumption = 0;
        
        for (EnergyData data : dayData) {
            totalGeneration += data.getPowerGenerationWatts();
            totalConsumption += data.getPowerConsumptionWatts();
            
            if (data.getPowerGenerationWatts() > peakGeneration) {
                peakGeneration = data.getPowerGenerationWatts();
            }
            
            if (data.getPowerConsumptionWatts() > peakConsumption) {
                peakConsumption = data.getPowerConsumptionWatts();
            }
        }
        
        // Convert to kWh (assuming readings are in watts and we're averaging over the day)
        double totalGenerationKWh = totalGeneration / 1000.0 / dayData.size() * 24;
        double totalConsumptionKWh = totalConsumption / 1000.0 / dayData.size() * 24;
        
        // Calculate efficiency
        double efficiency = 0;
        if (totalConsumptionKWh > 0) {
            efficiency = (totalGenerationKWh / totalConsumptionKWh) * 100;
        }
        
        // Create and save the summary
        EnergySummary summary = new EnergySummary();
        summary.setInstallation(installation);
        summary.setDate(date);
        summary.setPeriod(EnergySummary.SummaryPeriod.DAILY);
        summary.setTotalGenerationKWh(totalGenerationKWh);
        summary.setTotalConsumptionKWh(totalConsumptionKWh);
        summary.setPeakGenerationWatts(peakGeneration);
        summary.setPeakConsumptionWatts(peakConsumption);
        summary.setEfficiencyPercentage(efficiency);
        summary.setReadingsCount(dayData.size());
        summary.setPeriodStart(date);
        summary.setPeriodEnd(date);
        
        EnergySummary savedSummary = summaryRepository.save(summary);
        return convertToDTO(savedSummary);
    }

    @Override
    @Transactional
    public EnergySummaryDTO generateWeeklySummary(Long installationId, LocalDate weekStartDate) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Check if a summary already exists for this week
        Optional<EnergySummary> existingSummary = summaryRepository.findByInstallationAndPeriodAndDate(
                installation, EnergySummary.SummaryPeriod.WEEKLY, weekStartDate);
        
        if (existingSummary.isPresent()) {
            return convertToDTO(existingSummary.get());
        }
        
        // Calculate the end of the week
        LocalDate weekEndDate = weekStartDate.plusDays(6);
        
        // Get daily summaries for the week
        List<EnergySummary> dailySummaries = summaryRepository.findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.DAILY, weekStartDate, weekEndDate);
        
        if (dailySummaries.isEmpty()) {
            // No daily summaries for this week, create an empty summary
            EnergySummary emptySummary = createEmptySummary(installation, weekStartDate, EnergySummary.SummaryPeriod.WEEKLY);
            emptySummary.setPeriodStart(weekStartDate);
            emptySummary.setPeriodEnd(weekEndDate);
            
            EnergySummary savedSummary = summaryRepository.save(emptySummary);
            return convertToDTO(savedSummary);
        }
        
        // Calculate weekly metrics by aggregating daily summaries
        double totalGenerationKWh = 0;
        double totalConsumptionKWh = 0;
        double peakGenerationWatts = 0;
        double peakConsumptionWatts = 0;
        int totalReadings = 0;
        
        for (EnergySummary dailySummary : dailySummaries) {
            totalGenerationKWh += dailySummary.getTotalGenerationKWh();
            totalConsumptionKWh += dailySummary.getTotalConsumptionKWh();
            
            if (dailySummary.getPeakGenerationWatts() > peakGenerationWatts) {
                peakGenerationWatts = dailySummary.getPeakGenerationWatts();
            }
            
            if (dailySummary.getPeakConsumptionWatts() > peakConsumptionWatts) {
                peakConsumptionWatts = dailySummary.getPeakConsumptionWatts();
            }
            
            totalReadings += dailySummary.getReadingsCount();
        }
        
        // Calculate efficiency
        double efficiency = 0;
        if (totalConsumptionKWh > 0) {
            efficiency = (totalGenerationKWh / totalConsumptionKWh) * 100;
        }
        
        // Create and save the weekly summary
        EnergySummary weeklySummary = new EnergySummary();
        weeklySummary.setInstallation(installation);
        weeklySummary.setDate(weekStartDate);
        weeklySummary.setPeriod(EnergySummary.SummaryPeriod.WEEKLY);
        weeklySummary.setTotalGenerationKWh(totalGenerationKWh);
        weeklySummary.setTotalConsumptionKWh(totalConsumptionKWh);
        weeklySummary.setPeakGenerationWatts(peakGenerationWatts);
        weeklySummary.setPeakConsumptionWatts(peakConsumptionWatts);
        weeklySummary.setEfficiencyPercentage(efficiency);
        weeklySummary.setReadingsCount(totalReadings);
        weeklySummary.setPeriodStart(weekStartDate);
        weeklySummary.setPeriodEnd(weekEndDate);
        
        EnergySummary savedSummary = summaryRepository.save(weeklySummary);
        return convertToDTO(savedSummary);
    }

    @Override
    @Transactional
    public EnergySummaryDTO generateMonthlySummary(Long installationId, LocalDate monthStartDate) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Check if a summary already exists for this month
        Optional<EnergySummary> existingSummary = summaryRepository.findByInstallationAndPeriodAndDate(
                installation, EnergySummary.SummaryPeriod.MONTHLY, monthStartDate);
        
        if (existingSummary.isPresent()) {
            return convertToDTO(existingSummary.get());
        }
        
        // Calculate the end of the month
        LocalDate monthEndDate = monthStartDate.with(TemporalAdjusters.lastDayOfMonth());
        
        // Get weekly summaries for the month
        List<EnergySummary> weeklySummaries = summaryRepository.findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.WEEKLY, monthStartDate, monthEndDate);
        
        if (weeklySummaries.isEmpty()) {
            // No weekly summaries for this month, create an empty summary
            EnergySummary emptySummary = createEmptySummary(installation, monthStartDate, EnergySummary.SummaryPeriod.MONTHLY);
            emptySummary.setPeriodStart(monthStartDate);
            emptySummary.setPeriodEnd(monthEndDate);
            
            EnergySummary savedSummary = summaryRepository.save(emptySummary);
            return convertToDTO(savedSummary);
        }
        
        // Calculate monthly metrics by aggregating weekly summaries
        double totalGenerationKWh = 0;
        double totalConsumptionKWh = 0;
        double peakGenerationWatts = 0;
        double peakConsumptionWatts = 0;
        int totalReadings = 0;
        
        for (EnergySummary weeklySummary : weeklySummaries) {
            totalGenerationKWh += weeklySummary.getTotalGenerationKWh();
            totalConsumptionKWh += weeklySummary.getTotalConsumptionKWh();
            
            if (weeklySummary.getPeakGenerationWatts() > peakGenerationWatts) {
                peakGenerationWatts = weeklySummary.getPeakGenerationWatts();
            }
            
            if (weeklySummary.getPeakConsumptionWatts() > peakConsumptionWatts) {
                peakConsumptionWatts = weeklySummary.getPeakConsumptionWatts();
            }
            
            totalReadings += weeklySummary.getReadingsCount();
        }
        
        // Calculate efficiency
        double efficiency = 0;
        if (totalConsumptionKWh > 0) {
            efficiency = (totalGenerationKWh / totalConsumptionKWh) * 100;
        }
        
        // Create and save the monthly summary
        EnergySummary monthlySummary = new EnergySummary();
        monthlySummary.setInstallation(installation);
        monthlySummary.setDate(monthStartDate);
        monthlySummary.setPeriod(EnergySummary.SummaryPeriod.MONTHLY);
        monthlySummary.setTotalGenerationKWh(totalGenerationKWh);
        monthlySummary.setTotalConsumptionKWh(totalConsumptionKWh);
        monthlySummary.setPeakGenerationWatts(peakGenerationWatts);
        monthlySummary.setPeakConsumptionWatts(peakConsumptionWatts);
        monthlySummary.setEfficiencyPercentage(efficiency);
        monthlySummary.setReadingsCount(totalReadings);
        monthlySummary.setPeriodStart(monthStartDate);
        monthlySummary.setPeriodEnd(monthEndDate);
        
        EnergySummary savedSummary = summaryRepository.save(monthlySummary);
        return convertToDTO(savedSummary);
    }

    @Override
    public List<EnergySummaryDTO> getSummariesByPeriod(Long installationId, EnergySummary.SummaryPeriod period) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Get summaries for the period
        List<EnergySummary> summaries = summaryRepository.findByInstallationAndPeriodOrderByDateDesc(installation, period);
        
        // Convert to DTOs and return
        return summaries.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<EnergySummaryDTO> getSummariesByPeriodAndDateRange(Long installationId, EnergySummary.SummaryPeriod period, LocalDate startDate, LocalDate endDate) {
        // Verify the installation exists
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Get summaries for the period and date range
        List<EnergySummary> summaries = summaryRepository.findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                installation, period, startDate, endDate);
        
        // Convert to DTOs and return
        return summaries.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Scheduled(cron = "0 0 1 * * ?") // Run at 1:00 AM every day
    public void scheduleAllSummaryGeneration() {
        // Get all installations
        List<SolarInstallation> installations = installationRepository.findAll();
        
        // Get yesterday's date
        LocalDate yesterday = LocalDate.now().minusDays(1);
        
        // Generate daily summaries for all installations
        for (SolarInstallation installation : installations) {
            try {
                generateDailySummary(installation.getId(), yesterday);
            } catch (Exception e) {
                // Log the error and continue with the next installation
                System.err.println("Error generating daily summary for installation " + installation.getId() + ": " + e.getMessage());
            }
        }
        
        // Check if it's the first day of the week (Monday)
        if (LocalDate.now().getDayOfWeek().getValue() == 1) {
            // Get last week's start date (previous Monday)
            LocalDate lastWeekStart = LocalDate.now().minusDays(7);
            
            // Generate weekly summaries for all installations
            for (SolarInstallation installation : installations) {
                try {
                    generateWeeklySummary(installation.getId(), lastWeekStart);
                } catch (Exception e) {
                    // Log the error and continue with the next installation
                    System.err.println("Error generating weekly summary for installation " + installation.getId() + ": " + e.getMessage());
                }
            }
        }
        
        // Check if it's the first day of the month
        if (LocalDate.now().getDayOfMonth() == 1) {
            // Get last month's start date
            LocalDate lastMonthStart = LocalDate.now().minusMonths(1).withDayOfMonth(1);
            
            // Generate monthly summaries for all installations
            for (SolarInstallation installation : installations) {
                try {
                    generateMonthlySummary(installation.getId(), lastMonthStart);
                } catch (Exception e) {
                    // Log the error and continue with the next installation
                    System.err.println("Error generating monthly summary for installation " + installation.getId() + ": " + e.getMessage());
                }
            }
        }
    }
    
    // Helper methods
    private EnergySummary createEmptySummary(SolarInstallation installation, LocalDate date, EnergySummary.SummaryPeriod period) {
        EnergySummary summary = new EnergySummary();
        summary.setInstallation(installation);
        summary.setDate(date);
        summary.setPeriod(period);
        summary.setTotalGenerationKWh(0);
        summary.setTotalConsumptionKWh(0);
        summary.setPeakGenerationWatts(0);
        summary.setPeakConsumptionWatts(0);
        summary.setEfficiencyPercentage(0);
        summary.setReadingsCount(0);
        return summary;
    }
    
    private EnergySummaryDTO convertToDTO(EnergySummary summary) {
        return EnergySummaryDTO.builder()
                .id(summary.getId())
                .installationId(summary.getInstallation().getId())
                .date(summary.getDate())
                .period(summary.getPeriod())
                .totalGenerationKWh(summary.getTotalGenerationKWh())
                .totalConsumptionKWh(summary.getTotalConsumptionKWh())
                .peakGenerationWatts(summary.getPeakGenerationWatts())
                .peakConsumptionWatts(summary.getPeakConsumptionWatts())
                .efficiencyPercentage(summary.getEfficiencyPercentage())
                .readingsCount(summary.getReadingsCount())
                .periodStart(summary.getPeriodStart())
                .periodEnd(summary.getPeriodEnd())
                .build();
    }
}