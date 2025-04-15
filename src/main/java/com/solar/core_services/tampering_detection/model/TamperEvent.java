package com.solar.core_services.tampering_detection.model;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tamper_events")
public class TamperEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TamperEventType eventType;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TamperSeverity severity;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false)
    private boolean resolved = false;

    @Column
    private LocalDateTime resolvedAt;

    @Column(length = 100)
    private String resolvedBy;

    @Column(nullable = false)
    private double confidenceScore;

    @Column(columnDefinition = "TEXT")
    private String rawSensorData;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TamperEventStatus status = TamperEventStatus.NEW;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    public enum TamperEventType {
        PHYSICAL_MOVEMENT,
        CONNECTION_TAMPERING,
        PANEL_ACCESS,
        VOLTAGE_FLUCTUATION,
        LOCATION_CHANGE,
        COMMUNICATION_INTERFERENCE,
        UNAUTHORIZED_ACCESS
    }

    public enum TamperSeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    public enum TamperEventStatus {
        NEW,
        ACKNOWLEDGED,
        INVESTIGATING,
        RESOLVED
    }
} 