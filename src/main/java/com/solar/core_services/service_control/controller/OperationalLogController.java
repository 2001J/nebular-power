package com.solar.core_services.service_control.controller;

import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.OperationalLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/service/logs")
@RequiredArgsConstructor
@Tag(name = "Operational Logs", description = "APIs for retrieving operational logs")
public class OperationalLogController {

    private final OperationalLogService operationalLogService;

    @GetMapping("/{logId}")
    @Operation(
        summary = "Get log by ID",
        description = "Retrieves a specific operational log by its ID."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Log retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = OperationalLogDTO.class))),
        @ApiResponse(responseCode = "404", description = "Log not found", content = @Content)
    })
    public ResponseEntity<OperationalLogDTO> getLogById(
            @Parameter(description = "Log ID", required = true)
            @PathVariable Long logId) {
        
        OperationalLogDTO log = operationalLogService.getLogById(logId);
        return ResponseEntity.ok(log);
    }

    @GetMapping("/installation/{installationId}")
    @Operation(
        summary = "Get logs by installation",
        description = "Retrieves all operational logs for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Page<OperationalLogDTO>> getLogsByInstallation(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<OperationalLogDTO> logs = operationalLogService.getLogsByInstallation(installationId, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/operation/{operation}")
    @Operation(
        summary = "Get logs by operation type",
        description = "Retrieves all operational logs of a specific operation type."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully")
    })
    public ResponseEntity<Page<OperationalLogDTO>> getLogsByOperation(
            @Parameter(description = "Operation type", required = true)
            @PathVariable OperationalLog.OperationType operation,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<OperationalLogDTO> logs = operationalLogService.getLogsByOperation(operation, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/initiator/{initiator}")
    @Operation(
        summary = "Get logs by initiator",
        description = "Retrieves all operational logs initiated by a specific user or system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully")
    })
    public ResponseEntity<Page<OperationalLogDTO>> getLogsByInitiator(
            @Parameter(description = "Initiator (username or system identifier)", required = true)
            @PathVariable String initiator,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<OperationalLogDTO> logs = operationalLogService.getLogsByInitiator(initiator, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/time-range")
    @Operation(
        summary = "Get logs by time range",
        description = "Retrieves all operational logs within a specific time range."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid time range", content = @Content)
    })
    public ResponseEntity<List<OperationalLogDTO>> getLogsByTimeRange(
            @Parameter(description = "Start time (ISO format)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @Parameter(description = "End time (ISO format)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @PageableDefault(size = 20) Pageable pageable) {
        
        List<OperationalLogDTO> logs = operationalLogService.getLogsByTimeRange(start, end);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/user/{userId}")
    @Operation(
        summary = "Get logs by user ID",
        description = "Retrieves all operational logs associated with a specific user."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
    })
    public ResponseEntity<List<OperationalLogDTO>> getLogsByUserId(
            @Parameter(description = "User ID", required = true)
            @PathVariable Long userId,
            @PageableDefault(size = 20) Pageable pageable) {
        
        List<OperationalLogDTO> logs = operationalLogService.getLogsByUserId(userId);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/source-system/{sourceSystem}")
    @Operation(
        summary = "Get logs by source system",
        description = "Retrieves all operational logs from a specific source system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully")
    })
    public ResponseEntity<List<OperationalLogDTO>> getLogsBySourceSystem(
            @Parameter(description = "Source system identifier", required = true)
            @PathVariable String sourceSystem,
            @PageableDefault(size = 20) Pageable pageable) {
        
        List<OperationalLogDTO> logs = operationalLogService.getLogsBySourceSystem(sourceSystem);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/installation/{installationId}/operation/{operation}")
    @Operation(
        summary = "Get logs by installation and operation",
        description = "Retrieves all operational logs for a specific installation and operation type."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Page<OperationalLogDTO>> getLogsByInstallationAndOperation(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Operation type", required = true)
            @PathVariable OperationalLog.OperationType operation,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<OperationalLogDTO> logs = operationalLogService.getLogsByInstallationAndOperation(
                installationId, operation, pageable);
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/stats/operation-counts")
    @Operation(
        summary = "Get operation counts",
        description = "Retrieves counts of logs grouped by operation type."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Operation counts retrieved successfully")
    })
    public ResponseEntity<Map<OperationalLog.OperationType, Long>> getOperationCounts() {
        List<Object[]> operationCounts = operationalLogService.getOperationCounts();
        
        // Convert the list of Object[] to a Map
        Map<OperationalLog.OperationType, Long> countsMap = new HashMap<>();
        for (Object[] count : operationCounts) {
            countsMap.put((OperationalLog.OperationType) count[0], (Long) count[1]);
        }
        
        return ResponseEntity.ok(countsMap);
    }

    @GetMapping("/stats/success-counts")
    @Operation(
        summary = "Get success counts",
        description = "Retrieves counts of successful vs. failed operations."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Success counts retrieved successfully")
    })
    public ResponseEntity<Map<String, Long>> getSuccessCounts() {
        List<Object[]> successCounts = operationalLogService.getSuccessCounts();
        
        // Convert the list of Object[] to a Map
        Map<String, Long> countsMap = new HashMap<>();
        for (Object[] count : successCounts) {
            countsMap.put(((Boolean) count[0]) ? "success" : "failure", (Long) count[1]);
        }
        
        return ResponseEntity.ok(countsMap);
    }
} 