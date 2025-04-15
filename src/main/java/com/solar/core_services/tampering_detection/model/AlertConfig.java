package com.solar.core_services.tampering_detection.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "alert_configs")
public class AlertConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false, unique = true)
    private SolarInstallation installation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertLevel alertLevel = AlertLevel.MEDIUM;

    @ElementCollection
    @CollectionTable(
        name = "alert_notification_channels",
        joinColumns = @JoinColumn(name = "alert_config_id")
    )
    @Column(name = "notification_channel")
    @Enumerated(EnumType.STRING)
    private Set<NotificationChannel> notificationChannels;

    @Column(nullable = false)
    private boolean autoResponseEnabled = true;

    @Column(nullable = false)
    private double physicalMovementThreshold = 0.75;

    @Column(nullable = false)
    private double voltageFluctuationThreshold = 0.5;

    @Column(nullable = false)
    private double connectionInterruptionThreshold = 0.8;

    @Column(nullable = false)
    private int samplingRateSeconds = 60;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum AlertLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum NotificationChannel {
        EMAIL,
        SMS,
        PUSH,
        IN_APP
    }
} 