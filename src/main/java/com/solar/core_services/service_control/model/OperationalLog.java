package com.solar.core_services.service_control.model;

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
@Table(name = "operational_logs")
public class OperationalLog {
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
    private OperationType operation;

    @Column(length = 100)
    private String initiator;

    @Column(length = 500)
    private String details;

    @Column(length = 100)
    private String sourceSystem;

    @Column(length = 100)
    private String sourceAction;

    @Column(length = 100)
    private String ipAddress;

    @Column(length = 100)
    private String userAgent;

    @Column
    private boolean success;

    @Column(length = 500)
    private String errorDetails;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    public enum OperationType {
        SERVICE_STATUS_CHANGE,
        COMMAND_SENT,
        COMMAND_RESPONSE,
        DEVICE_HEARTBEAT,
        DEVICE_CONFIGURATION,
        DEVICE_FIRMWARE_UPDATE,
        DEVICE_REBOOT,
        DEVICE_POWER_CHANGE,
        MAINTENANCE_MODE,
        SECURITY_ACTION,
        PAYMENT_ACTION,
        SYSTEM_ALERT,
        USER_ACTION,
        
        // Additional operation types needed by controllers
        SERVICE_STATUS_UPDATE,
        SERVICE_SUSPENSION,
        SERVICE_RESTORATION,
        STATUS_CHANGE_SCHEDULED,
        SCHEDULED_CHANGE_CANCELLED,
        COMMAND_CANCELLED,
        COMMAND_RETRIED,
        PAYMENT_STATUS_CHANGE,
        PROCESS_OVERDUE_PAYMENTS,
        TAMPER_EVENT_RECEIVED,
        SECURITY_RESPONSE_PROCESSED
    }
} 