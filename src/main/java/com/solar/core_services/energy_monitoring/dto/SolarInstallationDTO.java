package com.solar.core_services.energy_monitoring.dto;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SolarInstallationDTO {
    private Long id;
    private Long userId;
    private String username;
    private double installedCapacityKW;
    private String location;
    private LocalDateTime installationDate;
    private SolarInstallation.InstallationStatus status;
    private boolean tamperDetected;
    private LocalDateTime lastTamperCheck;
} 