package com.solar.core_services.energy_monitoring.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "energy_data")
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

    @Column(nullable = false)
    private boolean isSimulated = true;
} 