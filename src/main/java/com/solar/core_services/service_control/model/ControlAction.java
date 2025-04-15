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
@Table(name = "control_actions")
public class ControlAction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installation_id", nullable = false)
    private SolarInstallation installation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActionType actionType;

    @Column(nullable = false)
    private LocalDateTime executedAt;

    @Column(length = 100)
    private String executedBy;

    @Column(nullable = false)
    private boolean success;

    @Column(length = 500)
    private String failureReason;

    @Column(length = 500)
    private String actionDetails;

    @Column(length = 100)
    private String sourceSystem;

    @Column(length = 100)
    private String sourceEvent;

    @PrePersist
    protected void onCreate() {
        if (executedAt == null) {
            executedAt = LocalDateTime.now();
        }
    }

    public enum ActionType {
        SUSPEND_SERVICE,
        RESTORE_SERVICE,
        REBOOT_DEVICE,
        ENABLE_MAINTENANCE_MODE,
        DISABLE_MAINTENANCE_MODE,
        LIMIT_POWER,
        RESTORE_POWER,
        FIRMWARE_UPDATE,
        CONFIGURATION_CHANGE,
        SECURITY_LOCKDOWN,
        SECURITY_RESTORE
    }
} 