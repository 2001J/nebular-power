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
@Table(name = "security_logs")
public class SecurityLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    @Column(nullable = false, length = 500)
    private String details;

    @Column(length = 45)
    private String ipAddress;

    @Column(length = 100)
    private String location;

    @Column(length = 100)
    private String userId;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    public enum ActivityType {
        SENSOR_READING,
        CONFIGURATION_CHANGE,
        ALERT_GENERATED,
        ALERT_ACKNOWLEDGED,
        ALERT_RESOLVED,
        SYSTEM_DIAGNOSTIC,
        SENSITIVITY_CHANGE,
        MANUAL_CHECK,
        REMOTE_ACCESS,
        FIRMWARE_UPDATE
    }
} 