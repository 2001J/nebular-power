package com.solar.core_services.energy_monitoring.dto;

import com.solar.core_services.energy_monitoring.model.EnergySummary;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergySummaryDTO {
    private Long id;
    private Long installationId;
    private LocalDate date;
    private EnergySummary.SummaryPeriod period;
    private double totalGenerationKWh;
    private double totalConsumptionKWh;
    private double peakGenerationWatts;
    private double peakConsumptionWatts;
    private double efficiencyPercentage;
    private int readingsCount;
    private LocalDate periodStart;
    private LocalDate periodEnd;
} 