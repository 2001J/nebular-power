package com.solar.core_services.energy_monitoring.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "energy_data", indexes = {
        @Index(name = "idx_energy_data_install_ts", columnList = "installation_id,timestamp")
})
public class EnergyData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Column(nullable = false)
    private double powerGenerationWatts;

    @Column(nullable = false)
    private double powerConsumptionWatts;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(nullable = false)
    private double dailyYieldKWh;

    @Column(nullable = false)
    private double totalYieldKWh;

    /**
     * Panel efficiency percentage (0-100).
     * Calculated as: (currentGeneration / installedCapacity) * 100
     * This represents how much of the rated capacity is being utilized.
     * A value of 85% means the panels are producing 85% of their rated capacity.
     */
    @Column(nullable = false)
    private double efficiencyPercentage = 0.0;

    @Column(nullable = false)
    private boolean isSimulated = true;
} 
