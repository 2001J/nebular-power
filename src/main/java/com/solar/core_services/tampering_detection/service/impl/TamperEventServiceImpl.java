package com.solar.core_services.tampering_detection.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.TamperEventCreateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventUpdateDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.core_services.tampering_detection.service.TamperEventService;
import com.solar.exception.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TamperEventServiceImpl implements TamperEventService {

    private final TamperEventRepository tamperEventRepository;
    private final SolarInstallationRepository solarInstallationRepository;
    private final SecurityLogService securityLogService;

    @Override
    @Transactional
    public TamperEventDTO createTamperEvent(TamperEventCreateDTO createDTO) {
        log.info("Creating tamper event for installation ID: {}", createDTO.getInstallationId());

        // Validate the event
        validateTamperEvent(createDTO);

        // Check if it's likely a false positive
        if (isLikelyFalsePositive(createDTO)) {
            log.info("Tamper event for installation ID: {} was identified as a likely false positive and will not be created", 
                    createDTO.getInstallationId());
            return null;
        }

        // Get the installation
        SolarInstallation installation = solarInstallationRepository.findById(createDTO.getInstallationId())
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + createDTO.getInstallationId()));

        // Create the tamper event
        TamperEvent tamperEvent = new TamperEvent();
        tamperEvent.setInstallation(installation);
        tamperEvent.setEventType(createDTO.getEventType());
        tamperEvent.setTimestamp(LocalDateTime.now());
        tamperEvent.setSeverity(createDTO.getSeverity());
        tamperEvent.setDescription(createDTO.getDescription());
        tamperEvent.setConfidenceScore(createDTO.getConfidenceScore());
        tamperEvent.setRawSensorData(createDTO.getRawSensorData());
        tamperEvent.setStatus(TamperEvent.TamperEventStatus.NEW);

        // Save the tamper event
        TamperEvent savedEvent = tamperEventRepository.save(tamperEvent);

        // Update the installation's tamper status
        installation.setTamperDetected(true);
        installation.setLastTamperCheck(LocalDateTime.now());
        solarInstallationRepository.save(installation);

        // Log the tamper event creation
        securityLogService.logTamperEventCreated(
                installation.getId(), 
                savedEvent.getId(), 
                "Tamper event created: " + createDTO.getEventType() + " with severity " + createDTO.getSeverity(),
                null
        );

        return convertToDTO(savedEvent);
    }

    @Override
    public TamperEventDTO getTamperEventById(Long id) {
        log.info("Getting tamper event by ID: {}", id);

        TamperEvent tamperEvent = tamperEventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tamper event not found with ID: " + id));

        return convertToDTO(tamperEvent);
    }

    @Override
    public Page<TamperEventDTO> getTamperEventsByInstallationId(Long installationId, Pageable pageable) {
        log.info("Getting tamper events for installation ID: {}", installationId);

        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        Page<TamperEvent> tamperEvents = tamperEventRepository.findByInstallationOrderByTimestampDesc(installation, pageable);

        return tamperEvents.map(this::convertToDTO);
    }

    @Override
    public Page<TamperEventDTO> getTamperEventsByUserId(Long userId, Pageable pageable) {
        log.info("This method is not implemented yet as it requires user management");
        return Page.empty(pageable);
    }

    @Override
    public Page<TamperEventDTO> getTamperEventsByInstallationIds(List<Long> installationIds, Pageable pageable) {
        log.info("Getting tamper events for installation IDs: {}", installationIds);

        if (installationIds.isEmpty()) {
            return Page.empty(pageable);
        }

        List<SolarInstallation> installations = solarInstallationRepository.findAllById(installationIds);

        // Use a custom query to get events for multiple installations
        Page<TamperEvent> tamperEvents = tamperEventRepository.findByInstallationInOrderByTimestampDesc(
                installations, pageable);

        return tamperEvents.map(this::convertToDTO);
    }

    @Override
    public Page<TamperEventDTO> getUnresolvedTamperEvents(List<TamperEvent.TamperSeverity> severities, Pageable pageable) {
        log.info("Getting unresolved tamper events with severities: {}", severities);

        Page<TamperEvent> tamperEvents = tamperEventRepository.findByResolvedFalseAndSeverityInOrderBySeverityDescTimestampDesc(
                severities, pageable);

        return tamperEvents.map(this::convertToDTO);
    }

    @Override
    public Page<TamperEventDTO> getAllTamperEvents(List<TamperEvent.TamperSeverity> severities, Pageable pageable) {
        log.info("Getting all tamper events with severities: {}", severities);

        Page<TamperEvent> tamperEvents;

        if (severities != null && !severities.isEmpty()) {
            // If severities are provided, filter by them
            tamperEvents = tamperEventRepository.findBySeverityInOrderBySeverityDescTimestampDesc(severities, pageable);
        } else {
            // Otherwise, get all events
            tamperEvents = tamperEventRepository.findAll(pageable);
        }

        return tamperEvents.map(this::convertToDTO);
    }

    @Override
    public List<TamperEventDTO> getTamperEventsByInstallationAndTimeRange(Long installationId, LocalDateTime start, LocalDateTime end) {
        log.info("Getting tamper events for installation ID: {} between {} and {}", installationId, start, end);

        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        List<TamperEvent> tamperEvents = tamperEventRepository.findByInstallationAndTimeRange(installation, start, end);

        return tamperEvents.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TamperEventDTO updateTamperEventStatus(Long id, TamperEventUpdateDTO updateDTO) {
        log.info("Updating tamper event status for ID: {} to {}", id, updateDTO.getStatus());

        TamperEvent tamperEvent = tamperEventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tamper event not found with ID: " + id));

        // Update the status
        tamperEvent.setStatus(updateDTO.getStatus());

        // If the status is RESOLVED, mark it as resolved
        if (updateDTO.getStatus() == TamperEvent.TamperEventStatus.RESOLVED) {
            tamperEvent.setResolved(true);
            tamperEvent.setResolvedAt(LocalDateTime.now());
            tamperEvent.setResolvedBy(updateDTO.getResolvedBy());

            // Check if this was the last unresolved event for this installation
            long unresolvedCount = tamperEventRepository.countUnresolvedByInstallation(tamperEvent.getInstallation());

            if (unresolvedCount <= 1) { // Including the current one that's being resolved
                // Reset the installation's tamper status
                SolarInstallation installation = tamperEvent.getInstallation();
                installation.setTamperDetected(false);
                installation.setLastTamperCheck(LocalDateTime.now());
                solarInstallationRepository.save(installation);
            }
        }

        TamperEvent updatedEvent = tamperEventRepository.save(tamperEvent);

        // Log the status change
        securityLogService.logTamperEventStatusChange(
                tamperEvent.getInstallation().getId(),
                tamperEvent.getId(),
                "Tamper event status updated to: " + updateDTO.getStatus(),
                updateDTO.getResolvedBy()
        );

        return convertToDTO(updatedEvent);
    }

    @Override
    @Transactional
    public TamperEventDTO resolveTamperEvent(Long id, String resolvedBy, String resolutionNotes) {
        log.info("Resolving tamper event ID: {} by {}", id, resolvedBy);

        TamperEventUpdateDTO updateDTO = new TamperEventUpdateDTO();
        updateDTO.setStatus(TamperEvent.TamperEventStatus.RESOLVED);
        updateDTO.setResolvedBy(resolvedBy);
        updateDTO.setResolutionNotes(resolutionNotes);

        return updateTamperEventStatus(id, updateDTO);
    }

    @Override
    public long countUnresolvedTamperEventsByInstallation(Long installationId) {
        log.info("Counting unresolved tamper events for installation ID: {}", installationId);

        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));

        return tamperEventRepository.countUnresolvedByInstallation(installation);
    }

    @Override
    public void validateTamperEvent(TamperEventCreateDTO createDTO) {
        // Validate that the installation exists
        solarInstallationRepository.findById(createDTO.getInstallationId())
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + createDTO.getInstallationId()));

        // Validate confidence score is between 0 and 1
        if (createDTO.getConfidenceScore() < 0 || createDTO.getConfidenceScore() > 1) {
            throw new IllegalArgumentException("Confidence score must be between 0 and 1");
        }

        // Additional validation logic can be added here
    }

    @Override
    public boolean isLikelyFalsePositive(TamperEventCreateDTO createDTO) {
        // Simple false positive detection based on confidence score
        // In a real implementation, this would be more sophisticated
        return createDTO.getConfidenceScore() < 0.3;
    }

    private TamperEventDTO convertToDTO(TamperEvent tamperEvent) {
        TamperEventDTO dto = new TamperEventDTO();
        dto.setId(tamperEvent.getId());
        dto.setInstallationId(tamperEvent.getInstallation().getId());
        dto.setInstallationLocation(tamperEvent.getInstallation().getLocation());
        dto.setEventType(tamperEvent.getEventType());
        dto.setTimestamp(tamperEvent.getTimestamp());
        dto.setSeverity(tamperEvent.getSeverity());
        dto.setDescription(tamperEvent.getDescription());
        dto.setResolved(tamperEvent.isResolved());
        dto.setResolvedAt(tamperEvent.getResolvedAt());
        dto.setResolvedBy(tamperEvent.getResolvedBy());
        dto.setConfidenceScore(tamperEvent.getConfidenceScore());
        dto.setStatus(tamperEvent.getStatus());
        return dto;
    }
} 
