package com.solar.core_services.service_control.controller;

import com.solar.core_services.service_control.dto.BatchCommandRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.service.DeviceCommandService;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.model.OperationalLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/service/commands")
@RequiredArgsConstructor
@Tag(name = "Device Commands", description = "APIs for managing device commands")
public class DeviceCommandController {

    private final DeviceCommandService deviceCommandService;
    private final OperationalLogService operationalLogService;

    @PostMapping("/{installationId}")
    @Operation(
        summary = "Send command to device",
        description = "Sends a command to a device associated with a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Command sent successfully", 
                    content = @Content(schema = @Schema(implementation = DeviceCommandDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid command request", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<DeviceCommandDTO> sendCommand(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Command to send", required = true)
            @RequestParam String command,
            @Parameter(description = "Command parameters")
            @RequestBody(required = false) Map<String, Object> parameters,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        DeviceCommandDTO commandDTO = deviceCommandService.sendCommand(installationId, command, parameters, username);
        
        // Log the operation
        operationalLogService.logOperation(
                installationId,
                OperationalLog.OperationType.COMMAND_SENT,
                username,
                "Sent command: " + command + " with parameters: " + parameters,
                "SERVICE_CONTROL",
                "SEND_COMMAND",
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok(commandDTO);
    }

    @PostMapping("/batch")
    @Operation(
        summary = "Send batch command",
        description = "Sends the same command to multiple installations at once."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Batch command sent successfully", 
                    content = @Content(schema = @Schema(implementation = List.class))),
        @ApiResponse(responseCode = "400", description = "Invalid batch command request", content = @Content)
    })
    public ResponseEntity<List<DeviceCommandDTO>> sendBatchCommand(
            @Parameter(description = "Batch command details", required = true)
            @Valid @RequestBody BatchCommandRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        // Set the initiator
        request.setInitiatedBy(username);
        
        List<DeviceCommandDTO> commands = deviceCommandService.sendBatchCommand(request);
        
        // Log the operation
        operationalLogService.logOperation(
                null, // No specific installation
                OperationalLog.OperationType.COMMAND_SENT,
                username,
                "Sent batch command: " + request.getCommand() + " to " + request.getInstallationIds().size() + " installations",
                "SERVICE_CONTROL",
                "SEND_BATCH_COMMAND",
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok(commands);
    }

    @GetMapping("/{installationId}")
    @Operation(
        summary = "Get commands by installation",
        description = "Retrieves all commands sent to a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Commands retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Page<DeviceCommandDTO>> getCommandsByInstallation(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<DeviceCommandDTO> commands = deviceCommandService.getCommandsByInstallation(installationId, pageable);
        return ResponseEntity.ok(commands);
    }

    @GetMapping("/status/{status}")
    @Operation(
        summary = "Get commands by status",
        description = "Retrieves all commands with a specific status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Commands retrieved successfully")
    })
    public ResponseEntity<Page<DeviceCommandDTO>> getCommandsByStatus(
            @Parameter(description = "Command status", required = true)
            @PathVariable DeviceCommand.CommandStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<DeviceCommandDTO> commands = deviceCommandService.getCommandsByStatus(status, pageable);
        return ResponseEntity.ok(commands);
    }

    @GetMapping("/{installationId}/pending")
    @Operation(
        summary = "Get pending commands",
        description = "Retrieves all pending commands for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Pending commands retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<List<DeviceCommandDTO>> getPendingCommands(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId) {
        
        List<DeviceCommandDTO> pendingCommands = deviceCommandService.getPendingCommands(installationId);
        return ResponseEntity.ok(pendingCommands);
    }

    @GetMapping("/id/{commandId}")
    @Operation(
        summary = "Get command by ID",
        description = "Retrieves a specific command by its ID."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Command retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = DeviceCommandDTO.class))),
        @ApiResponse(responseCode = "404", description = "Command not found", content = @Content)
    })
    public ResponseEntity<DeviceCommandDTO> getCommandById(
            @Parameter(description = "Command ID", required = true)
            @PathVariable Long commandId) {
        
        DeviceCommandDTO command = deviceCommandService.getCommandById(commandId);
        return ResponseEntity.ok(command);
    }

    @GetMapping("/correlation/{correlationId}")
    @Operation(
        summary = "Get command by correlation ID",
        description = "Retrieves a specific command by its correlation ID."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Command retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = DeviceCommandDTO.class))),
        @ApiResponse(responseCode = "404", description = "Command not found", content = @Content)
    })
    public ResponseEntity<DeviceCommandDTO> getCommandByCorrelationId(
            @Parameter(description = "Correlation ID", required = true)
            @PathVariable String correlationId) {
        
        DeviceCommandDTO command = deviceCommandService.getCommandByCorrelationId(correlationId);
        return ResponseEntity.ok(command);
    }

    @PostMapping("/{commandId}/cancel")
    @Operation(
        summary = "Cancel command",
        description = "Cancels a pending command."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Command cancelled successfully", 
                    content = @Content(schema = @Schema(implementation = DeviceCommandDTO.class))),
        @ApiResponse(responseCode = "400", description = "Command cannot be cancelled", content = @Content),
        @ApiResponse(responseCode = "404", description = "Command not found", content = @Content)
    })
    public ResponseEntity<DeviceCommandDTO> cancelCommand(
            @Parameter(description = "Command ID", required = true)
            @PathVariable Long commandId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        DeviceCommandDTO cancelledCommand = deviceCommandService.cancelCommand(commandId, username);
        
        // Log the operation
        operationalLogService.logOperation(
                null, // Will be filled in service layer based on command
                OperationalLog.OperationType.COMMAND_CANCELLED,
                username,
                "Cancelled command with ID: " + commandId,
                "SERVICE_CONTROL",
                "CANCEL_COMMAND",
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok(cancelledCommand);
    }

    @PostMapping("/{commandId}/retry")
    @Operation(
        summary = "Retry command",
        description = "Retries a failed command."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Command retry initiated successfully", 
                    content = @Content(schema = @Schema(implementation = DeviceCommandDTO.class))),
        @ApiResponse(responseCode = "400", description = "Command cannot be retried", content = @Content),
        @ApiResponse(responseCode = "404", description = "Command not found", content = @Content)
    })
    public ResponseEntity<DeviceCommandDTO> retryCommand(
            @Parameter(description = "Command ID", required = true)
            @PathVariable Long commandId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        DeviceCommandDTO retriedCommand = deviceCommandService.retryCommand(commandId, username);
        
        // Log the operation
        operationalLogService.logOperation(
                null, // Will be filled in service layer based on command
                OperationalLog.OperationType.COMMAND_RETRIED,
                username,
                "Retried command with ID: " + commandId,
                "SERVICE_CONTROL",
                "RETRY_COMMAND",
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok(retriedCommand);
    }

    @GetMapping("/stats/status-counts")
    @Operation(
        summary = "Get command status counts",
        description = "Retrieves counts of commands grouped by status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Command status counts retrieved successfully")
    })
    public ResponseEntity<Map<DeviceCommand.CommandStatus, Long>> getCommandStatusCounts() {
        List<Object[]> statusCounts = deviceCommandService.getCommandStatusCounts();
        
        // Convert the list of Object[] to a Map
        Map<DeviceCommand.CommandStatus, Long> countsMap = new HashMap<>();
        for (Object[] count : statusCounts) {
            countsMap.put((DeviceCommand.CommandStatus) count[0], (Long) count[1]);
        }
        
        return ResponseEntity.ok(countsMap);
    }
} 