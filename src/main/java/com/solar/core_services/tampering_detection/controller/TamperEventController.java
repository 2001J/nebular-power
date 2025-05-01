package com.solar.core_services.tampering_detection.controller;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.TamperEventCreateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventUpdateDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.service.TamperEventService;
import com.solar.user_management.model.User;
import com.solar.user_management.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
@Tag(name = "Tamper Events", description = "APIs for managing tamper events and alerts")
public class TamperEventController {

    private final TamperEventService tamperEventService;
    private final UserService userService;
    private final SolarInstallationRepository installationRepository;

    @PostMapping("/tamper-events")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create tamper event", description = "Create a new tamper event for a specific installation")
    public ResponseEntity<TamperEventDTO> createTamperEvent(@Valid @RequestBody TamperEventCreateDTO createDTO) {
        TamperEventDTO tamperEventDTO = tamperEventService.createTamperEvent(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(tamperEventDTO);
    }

    @GetMapping("/tamper-events/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(summary = "Get tamper event", description = "Get details for a specific tamper event by ID")
    public ResponseEntity<TamperEventDTO> getTamperEventById(@PathVariable Long id) {
        TamperEventDTO tamperEventDTO = tamperEventService.getTamperEventById(id);
        return ResponseEntity.ok(tamperEventDTO);
    }

    @GetMapping("/installations/{installationId}/events")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(summary = "Get installation events", description = "Get tamper events for a specific installation")
    public ResponseEntity<Page<TamperEventDTO>> getTamperEventsByInstallationId(
            @PathVariable Long installationId,
            Pageable pageable) {
        Page<TamperEventDTO> tamperEvents = tamperEventService.getTamperEventsByInstallationId(installationId, pageable);
        return ResponseEntity.ok(tamperEvents);
    }

    @GetMapping("/installations/{installationId}/events/time-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(summary = "Get events by time range", description = "Get tamper events for a specific installation within a time range")
    public ResponseEntity<List<TamperEventDTO>> getTamperEventsByInstallationAndTimeRange(
            @PathVariable Long installationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<TamperEventDTO> tamperEvents = tamperEventService.getTamperEventsByInstallationAndTimeRange(
                installationId, start, end);
        return ResponseEntity.ok(tamperEvents);
    }

    @GetMapping("/events")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Get current user events", description = "Get tamper events for the current authenticated user's installations")
    public ResponseEntity<Page<TamperEventDTO>> getTamperEventsByCurrentUser(Pageable pageable) {
        User currentUser = userService.getCurrentUser();
        List<SolarInstallation> userInstallations = installationRepository.findByUser(currentUser);

        if (userInstallations.isEmpty()) {
            return ResponseEntity.ok(Page.empty(pageable));
        }

        List<Long> installationIds = userInstallations.stream()
            .map(SolarInstallation::getId)
            .collect(Collectors.toList());

        return ResponseEntity.ok(tamperEventService.getTamperEventsByInstallationIds(installationIds, pageable));
    }

    @PutMapping("/events/{eventId}/acknowledge")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(summary = "Acknowledge event", description = "Acknowledge a tamper event")
    public ResponseEntity<TamperEventDTO> acknowledgeTamperEvent(@PathVariable Long eventId) {
        User currentUser = userService.getCurrentUser();
        String username = currentUser.getFullName();

        TamperEventUpdateDTO updateDTO = new TamperEventUpdateDTO();
        updateDTO.setStatus(TamperEvent.TamperEventStatus.ACKNOWLEDGED);
        updateDTO.setResolvedBy(username);

        TamperEventDTO tamperEventDTO = tamperEventService.updateTamperEventStatus(eventId, updateDTO);
        return ResponseEntity.ok(tamperEventDTO);
    }

    @GetMapping("/admin/alerts")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get unresolved events", description = "Get all unresolved tamper events with specified severities")
    public ResponseEntity<Page<TamperEventDTO>> getUnresolvedTamperEvents(
            @RequestParam(required = false) List<TamperEvent.TamperSeverity> severities,
            Pageable pageable) {
        // If no severities are provided, use all severities
        if (severities == null || severities.isEmpty()) {
            severities = List.of(
                    TamperEvent.TamperSeverity.LOW,
                    TamperEvent.TamperSeverity.MEDIUM,
                    TamperEvent.TamperSeverity.HIGH,
                    TamperEvent.TamperSeverity.CRITICAL
            );
        }

        Page<TamperEventDTO> tamperEvents = tamperEventService.getUnresolvedTamperEvents(severities, pageable);
        return ResponseEntity.ok(tamperEvents);
    }

    @GetMapping("/admin/all-alerts")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all events", description = "Get all tamper events, including resolved ones, with specified severities")
    public ResponseEntity<Page<TamperEventDTO>> getAllTamperEvents(
            @RequestParam(required = false) List<TamperEvent.TamperSeverity> severities,
            Pageable pageable) {
        // If no severities are provided, use all severities
        if (severities == null || severities.isEmpty()) {
            severities = List.of(
                    TamperEvent.TamperSeverity.LOW,
                    TamperEvent.TamperSeverity.MEDIUM,
                    TamperEvent.TamperSeverity.HIGH,
                    TamperEvent.TamperSeverity.CRITICAL
            );
        }

        Page<TamperEventDTO> tamperEvents = tamperEventService.getAllTamperEvents(severities, pageable);
        return ResponseEntity.ok(tamperEvents);
    }

    @PutMapping("/admin/events/{eventId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update event status", description = "Update the status of a tamper event")
    public ResponseEntity<TamperEventDTO> updateTamperEventStatus(
            @PathVariable Long eventId,
            @Valid @RequestBody TamperEventUpdateDTO updateDTO) {
        TamperEventDTO tamperEventDTO = tamperEventService.updateTamperEventStatus(eventId, updateDTO);
        return ResponseEntity.ok(tamperEventDTO);
    }

    @PostMapping("/admin/events/{eventId}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Resolve event", description = "Resolve a tamper event")
    public ResponseEntity<TamperEventDTO> resolveTamperEvent(
            @PathVariable Long eventId,
            @RequestParam String resolvedBy,
            @RequestParam(required = false) String resolutionNotes) {
        TamperEventDTO tamperEventDTO = tamperEventService.resolveTamperEvent(eventId, resolvedBy, resolutionNotes);
        return ResponseEntity.ok(tamperEventDTO);
    }
} 
