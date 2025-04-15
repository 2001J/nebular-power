package com.solar.core_services.service_control.dto;

import com.solar.core_services.service_control.model.ControlAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ControlActionDTO {
    private Long id;
    private Long installationId;
    private String installationName;
    private ControlAction.ActionType actionType;
    private LocalDateTime executedAt;
    private String executedBy;
    private boolean success;
    private String failureReason;
    private String actionDetails;
    private String sourceSystem;
    private String sourceEvent;
    
    /**
     * Convert entity to DTO
     */
    public static ControlActionDTO fromEntity(ControlAction controlAction) {
        if (controlAction == null) {
            return null;
        }
        
        return ControlActionDTO.builder()
                .id(controlAction.getId())
                .installationId(controlAction.getInstallation().getId())
                .installationName(controlAction.getInstallation().getName())
                .actionType(controlAction.getActionType())
                .executedAt(controlAction.getExecutedAt())
                .executedBy(controlAction.getExecutedBy())
                .success(controlAction.isSuccess())
                .failureReason(controlAction.getFailureReason())
                .actionDetails(controlAction.getActionDetails())
                .sourceSystem(controlAction.getSourceSystem())
                .sourceEvent(controlAction.getSourceEvent())
                .build();
    }
} 