package com.solar.core_services.energy_monitoring.dto;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SolarInstallationDTO {
    private Long id;

    @NotNull(message = "User ID is required")
    private Long userId;

    private String username;

    @NotBlank(message = "Installation name is required")
    private String name;

    @Positive(message = "Installed capacity must be positive")
    private double installedCapacityKW;

    @NotBlank(message = "Installation location is required")
    private String location;

    private LocalDateTime installationDate;
    private SolarInstallation.InstallationStatus status;
    private boolean tamperDetected;
    private LocalDateTime lastTamperCheck;
    private SolarInstallation.InstallationType type; // Updated to use enum type
}