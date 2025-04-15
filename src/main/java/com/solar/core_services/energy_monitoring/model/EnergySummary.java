package com.solar.core_services.energy_monitoring.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@Entity
@Table(name = "energy_summaries")
public class EnergySummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SummaryPeriod period;

    @Column(nullable = false)
    private double totalGenerationKWh;

    @Column(nullable = false)
    private double totalConsumptionKWh;

    @Column(nullable = false)
    private double peakGenerationWatts;

    @Column(nullable = false)
    private double peakConsumptionWatts;

    @Column(nullable = false)
    private double efficiencyPercentage;

    @Column(nullable = false)
    private int readingsCount;

    @Column(nullable = false)
    private LocalDate periodStart;

    @Column(nullable = false)
    private LocalDate periodEnd;

    public enum SummaryPeriod {
        DAILY,
        WEEKLY,
        MONTHLY,
        YEARLY
    }
} 