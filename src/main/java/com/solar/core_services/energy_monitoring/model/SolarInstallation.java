 package com.solar.core_services.energy_monitoring.model;

import com.solar.user_management.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@Entity
@Table(name = "solar_installations")
public class SolarInstallation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private double capacity;

    @Column(name = "installed_capacity_kw")
    private double installedCapacityKW;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private LocalDateTime installationDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InstallationStatus status = InstallationStatus.ACTIVE;

    @Column(nullable = false)
    private boolean tamperDetected = false;

    @Column(nullable = false)
    private LocalDateTime lastTamperCheck = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public enum InstallationStatus {
        ACTIVE,
        SUSPENDED,
        MAINTENANCE
    }
} 