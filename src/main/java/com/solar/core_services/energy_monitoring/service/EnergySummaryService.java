package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.dto.EnergySummaryDTO;
import com.solar.core_services.energy_monitoring.model.EnergySummary;

import java.time.LocalDate;
import java.util.List;

public interface EnergySummaryService {
    /**
     * Generate daily summary for a specific installation and date
     * @param installationId The ID of the installation
     * @param date The date for the summary
     * @return The generated energy summary DTO
     */
    EnergySummaryDTO generateDailySummary(Long installationId, LocalDate date);
    
    /**
     * Generate weekly summary for a specific installation and week
     * @param installationId The ID of the installation
     * @param weekStartDate The start date of the week
     * @return The generated energy summary DTO
     */
    EnergySummaryDTO generateWeeklySummary(Long installationId, LocalDate weekStartDate);
    
    /**
     * Generate monthly summary for a specific installation and month
     * @param installationId The ID of the installation
     * @param monthStartDate The start date of the month
     * @return The generated energy summary DTO
     */
    EnergySummaryDTO generateMonthlySummary(Long installationId, LocalDate monthStartDate);
    
    /**
     * Get summaries for a specific installation and period type
     * @param installationId The ID of the installation
     * @param period The period type (DAILY, WEEKLY, MONTHLY, YEARLY)
     * @return A list of energy summary DTOs
     */
    List<EnergySummaryDTO> getSummariesByPeriod(Long installationId, EnergySummary.SummaryPeriod period);
    
    /**
     * Get summaries for a specific installation, period type, and date range
     * @param installationId The ID of the installation
     * @param period The period type (DAILY, WEEKLY, MONTHLY, YEARLY)
     * @param startDate The start date of the range
     * @param endDate The end date of the range
     * @return A list of energy summary DTOs
     */
    List<EnergySummaryDTO> getSummariesByPeriodAndDateRange(
            Long installationId, 
            EnergySummary.SummaryPeriod period, 
            LocalDate startDate, 
            LocalDate endDate);
    
    /**
     * Schedule the generation of all summary types
     * This method should be called by a scheduler to generate summaries automatically
     */
    void scheduleAllSummaryGeneration();
} 