package com.solar.core_services.tampering_detection.controller;

import com.solar.core_services.tampering_detection.dto.TamperResponseDTO;
import com.solar.core_services.tampering_detection.model.TamperResponse;
import com.solar.core_services.tampering_detection.service.TamperResponseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/security/responses")
@RequiredArgsConstructor
@Tag(name = "Tamper Responses", description = "APIs for managing responses to tamper events")
@SecurityRequirement(name = "bearerAuth")
public class TamperResponseController {

    private final TamperResponseService tamperResponseService;

    @PostMapping("/events/{tamperEventId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Create tamper response",
        description = "Creates a new response to a tamper event. This endpoint allows administrators to record actions taken in response to a detected tampering event."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Response created successfully", 
                    content = @Content(schema = @Schema(implementation = TamperResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input parameters", content = @Content),
        @ApiResponse(responseCode = "404", description = "Tamper event not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<TamperResponseDTO> createTamperResponse(
            @Parameter(description = "ID of the tamper event to respond to", required = true)
            @PathVariable Long tamperEventId,
            
            @Parameter(description = "Type of response being executed (e.g., SYSTEM_RESET, NOTIFICATION_SENT)", required = true)
            @RequestParam TamperResponse.ResponseType responseType,
            
            @Parameter(description = "Name or ID of the person/system that executed the response")
            @RequestParam(required = false) String executedBy,
            
            @Parameter(description = "Additional details about the response actions taken")
            @RequestParam(required = false) String responseDetails) {
        TamperResponseDTO tamperResponseDTO = tamperResponseService.createTamperResponse(
                tamperEventId, responseType, executedBy, responseDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(tamperResponseDTO);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get tamper response by ID",
        description = "Retrieves details of a specific tamper response by its unique identifier."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Response found", 
                    content = @Content(schema = @Schema(implementation = TamperResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "Response not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<TamperResponseDTO> getTamperResponseById(
            @Parameter(description = "ID of the tamper response to retrieve", required = true)
            @PathVariable Long id) {
        TamperResponseDTO tamperResponseDTO = tamperResponseService.getTamperResponseById(id);
        return ResponseEntity.ok(tamperResponseDTO);
    }

    @GetMapping("/events/{tamperEventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(
        summary = "Get responses by event ID",
        description = "Retrieves all responses associated with a specific tamper event. This allows tracking all actions taken in response to a particular event."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Responses retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Tamper event not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<TamperResponseDTO>> getTamperResponsesByTamperEventId(
            @Parameter(description = "ID of the tamper event to get responses for", required = true)
            @PathVariable Long tamperEventId) {
        List<TamperResponseDTO> tamperResponses = tamperResponseService.getTamperResponsesByTamperEventId(tamperEventId);
        return ResponseEntity.ok(tamperResponses);
    }

    @GetMapping("/installations/{installationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(
        summary = "Get responses by installation ID",
        description = "Retrieves all tamper responses for a specific solar installation, with pagination support."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Responses retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Page<TamperResponseDTO>> getTamperResponsesByInstallationId(
            @Parameter(description = "ID of the installation to get responses for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Pagination parameters (page, size, sort)")
            Pageable pageable) {
        Page<TamperResponseDTO> tamperResponses = tamperResponseService.getTamperResponsesByInstallationId(
                installationId, pageable);
        return ResponseEntity.ok(tamperResponses);
    }

    @GetMapping("/events/{tamperEventId}/type/{responseType}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get responses by event ID and type",
        description = "Retrieves all responses of a specific type for a particular tamper event."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Responses retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Tamper event not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<TamperResponseDTO>> getTamperResponsesByEventIdAndType(
            @Parameter(description = "ID of the tamper event to get responses for", required = true)
            @PathVariable Long tamperEventId,
            
            @Parameter(description = "Type of response to filter by", required = true)
            @PathVariable TamperResponse.ResponseType responseType) {
        List<TamperResponseDTO> tamperResponses = tamperResponseService.getTamperResponsesByEventIdAndType(
                tamperEventId, responseType);
        return ResponseEntity.ok(tamperResponses);
    }

    @GetMapping("/time-range")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get responses by time range",
        description = "Retrieves all tamper responses that occurred within a specified time range."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Responses retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid time range parameters", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<TamperResponseDTO>> getTamperResponsesByTimeRange(
            @Parameter(description = "Start date-time of the range (ISO format)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            
            @Parameter(description = "End date-time of the range (ISO format)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<TamperResponseDTO> tamperResponses = tamperResponseService.getTamperResponsesByTimeRange(start, end);
        return ResponseEntity.ok(tamperResponses);
    }

    @PostMapping("/events/{tamperEventId}/auto-response")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Execute automatic response",
        description = "Triggers the system to execute an automatic response to a tamper event based on predefined rules."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Automatic response executed successfully"),
        @ApiResponse(responseCode = "404", description = "Tamper event not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Void> executeAutomaticResponse(
            @Parameter(description = "ID of the tamper event to respond to", required = true)
            @PathVariable Long tamperEventId) {
        tamperResponseService.executeAutomaticResponse(tamperEventId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/events/{tamperEventId}/notify")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Send notification",
        description = "Sends a notification about a tamper event to relevant stakeholders."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Notification sent successfully"),
        @ApiResponse(responseCode = "404", description = "Tamper event not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Void> sendNotification(
            @Parameter(description = "ID of the tamper event to send notification for", required = true)
            @PathVariable Long tamperEventId,
            
            @Parameter(description = "Type of notification to send (e.g., EMAIL, SMS, PUSH)", required = true)
            @RequestParam String notificationType) {
        tamperResponseService.sendNotification(tamperEventId, notificationType);
        return ResponseEntity.ok().build();
    }
} 