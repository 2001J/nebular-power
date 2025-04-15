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
@Table(name = "device_commands")
public class DeviceCommand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Column(nullable = false, length = 100)
    private String command;

    @Column(columnDefinition = "TEXT")
    private String parameters;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommandStatus status;

    @Column(nullable = false)
    private LocalDateTime sentAt;

    @Column
    private LocalDateTime processedAt;

    @Column
    private LocalDateTime expiresAt;

    @Column(length = 500)
    private String responseMessage;

    @Column(length = 100)
    private String initiatedBy;

    @Column
    private Integer retryCount = 0;

    @Column
    private LocalDateTime lastRetryAt;

    @Column(length = 100)
    private String correlationId;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null) {
            sentAt = LocalDateTime.now();
        }
        if (status == null) {
            status = CommandStatus.PENDING;
        }
        if (expiresAt == null) {
            expiresAt = sentAt.plusHours(24); // Default 24-hour expiration
        }
    }

    public enum CommandStatus {
        PENDING,
        SENT,
        DELIVERED,
        EXECUTED,
        FAILED,
        EXPIRED,
        CANCELLED,
        QUEUED
    }
} 