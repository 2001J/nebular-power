package com.solar.core_services.tampering_detection.service.impl;

import com.solar.core_services.tampering_detection.dto.TamperResponseDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.model.TamperResponse;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.repository.TamperResponseRepository;
import com.solar.core_services.tampering_detection.service.AlertConfigService;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.core_services.tampering_detection.service.TamperResponseService;
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
public class TamperResponseServiceImpl implements TamperResponseService {

    private final TamperResponseRepository tamperResponseRepository;
    private final TamperEventRepository tamperEventRepository;
    private final AlertConfigService alertConfigService;
    private final SecurityLogService securityLogService;

    @Override
    @Transactional
    public TamperResponseDTO createTamperResponse(Long tamperEventId, TamperResponse.ResponseType responseType, 
                                                String executedBy, String responseDetails) {
        log.info("Creating tamper response for tamper event ID: {} with response type: {}", tamperEventId, responseType);
        
        TamperEvent tamperEvent = tamperEventRepository.findById(tamperEventId)
                .orElseThrow(() -> new ResourceNotFoundException("Tamper event not found with ID: " + tamperEventId));
        
        TamperResponse tamperResponse = new TamperResponse();
        tamperResponse.setTamperEvent(tamperEvent);
        tamperResponse.setResponseType(responseType);
        tamperResponse.setExecutedAt(LocalDateTime.now());
        tamperResponse.setSuccess(true); // Assume success by default
        tamperResponse.setExecutedBy(executedBy != null ? executedBy : "SYSTEM");
        tamperResponse.setResponseDetails(responseDetails);
        
        TamperResponse savedResponse = tamperResponseRepository.save(tamperResponse);
        
        // Log the response action
        securityLogService.createSecurityLog(
                tamperEvent.getInstallation().getId(),
                responseType == TamperResponse.ResponseType.NOTIFICATION_SENT 
                    ? SecurityLog.ActivityType.ALERT_GENERATED 
                    : SecurityLog.ActivityType.SYSTEM_DIAGNOSTIC,
                "Tamper response executed: " + responseType + " for tamper event ID: " + tamperEventId,
                null,
                null,
                executedBy != null ? executedBy : "SYSTEM"
        );
        
        return convertToDTO(savedResponse);
    }

    @Override
    public TamperResponseDTO getTamperResponseById(Long id) {
        log.info("Getting tamper response by ID: {}", id);
        
        TamperResponse tamperResponse = tamperResponseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tamper response not found with ID: " + id));
        
        return convertToDTO(tamperResponse);
    }

    @Override
    public List<TamperResponseDTO> getTamperResponsesByTamperEventId(Long tamperEventId) {
        log.info("Getting tamper responses for tamper event ID: {}", tamperEventId);
        
        TamperEvent tamperEvent = tamperEventRepository.findById(tamperEventId)
                .orElseThrow(() -> new ResourceNotFoundException("Tamper event not found with ID: " + tamperEventId));
        
        List<TamperResponse> tamperResponses = tamperResponseRepository.findByTamperEventOrderByExecutedAtDesc(tamperEvent);
        
        return tamperResponses.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Page<TamperResponseDTO> getTamperResponsesByInstallationId(Long installationId, Pageable pageable) {
        log.info("Getting tamper responses for installation ID: {}", installationId);
        
        Page<TamperResponse> tamperResponses = tamperResponseRepository.findByInstallationId(installationId, pageable);
        
        return tamperResponses.map(this::convertToDTO);
    }

    @Override
    public Page<TamperResponseDTO> getTamperResponsesByUserId(Long userId, Pageable pageable) {
        log.info("This method is not implemented yet as it requires user management");
        return Page.empty(pageable);
    }

    @Override
    public List<TamperResponseDTO> getTamperResponsesByEventIdAndType(Long tamperEventId, TamperResponse.ResponseType responseType) {
        log.info("Getting tamper responses for tamper event ID: {} with response type: {}", tamperEventId, responseType);
        
        List<TamperResponse> tamperResponses = tamperResponseRepository.findByTamperEventIdAndResponseType(
                tamperEventId, responseType);
        
        return tamperResponses.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<TamperResponseDTO> getTamperResponsesByTimeRange(LocalDateTime start, LocalDateTime end) {
        log.info("Getting tamper responses between {} and {}", start, end);
        
        List<TamperResponse> tamperResponses = tamperResponseRepository.findByTimeRange(start, end);
        
        return tamperResponses.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public long countSuccessfulResponsesByTamperEventId(Long tamperEventId) {
        log.info("Counting successful responses for tamper event ID: {}", tamperEventId);
        
        return tamperResponseRepository.countSuccessfulResponsesByTamperEventId(tamperEventId);
    }

    @Override
    @Transactional
    public void executeAutomaticResponse(Long tamperEventId) {
        log.info("Executing automatic response for tamper event ID: {}", tamperEventId);
        
        TamperEvent tamperEvent = tamperEventRepository.findById(tamperEventId)
                .orElseThrow(() -> new ResourceNotFoundException("Tamper event not found with ID: " + tamperEventId));
        
        // Check if auto-response is enabled for this installation
        if (!alertConfigService.isAutoResponseEnabled(tamperEvent.getInstallation().getId())) {
            log.info("Auto-response is disabled for installation ID: {}", tamperEvent.getInstallation().getId());
            return;
        }
        
        // Determine appropriate response based on severity
        TamperResponse.ResponseType responseType;
        String responseDetails;
        
        switch (tamperEvent.getSeverity()) {
            case CRITICAL:
                responseType = TamperResponse.ResponseType.SERVICE_SUSPENDED;
                responseDetails = "Critical security event detected. Service automatically suspended pending investigation.";
                break;
            case HIGH:
                responseType = TamperResponse.ResponseType.ADMIN_ALERT;
                responseDetails = "High severity security event detected. Administrators have been notified.";
                break;
            case MEDIUM:
                responseType = TamperResponse.ResponseType.NOTIFICATION_SENT;
                responseDetails = "Medium severity security event detected. Notifications sent to relevant parties.";
                break;
            case LOW:
            default:
                responseType = TamperResponse.ResponseType.EVIDENCE_COLLECTION;
                responseDetails = "Low severity security event detected. Evidence collected for review.";
                break;
        }
        
        // Create the response
        createTamperResponse(tamperEventId, responseType, "SYSTEM", responseDetails);
        
        // Send notification
        sendNotification(tamperEventId, responseType.name());
    }

    @Override
    public void sendNotification(Long tamperEventId, String notificationType) {
        log.info("Sending notification for tamper event ID: {} with type: {}", tamperEventId, notificationType);
        
        TamperEvent tamperEvent = tamperEventRepository.findById(tamperEventId)
                .orElseThrow(() -> new ResourceNotFoundException("Tamper event not found with ID: " + tamperEventId));
        
        // In a real implementation, this would integrate with a notification service
        // For now, we'll just log the notification and create a response record
        
        String notificationDetails = "Notification sent: " + notificationType + 
                " for tamper event: " + tamperEvent.getEventType() + 
                " with severity: " + tamperEvent.getSeverity();
        
        // Create a notification response if one doesn't already exist
        List<TamperResponse> existingNotifications = tamperResponseRepository.findByTamperEventIdAndResponseType(
                tamperEventId, TamperResponse.ResponseType.NOTIFICATION_SENT);
        
        if (existingNotifications.isEmpty()) {
            createTamperResponse(
                    tamperEventId,
                    TamperResponse.ResponseType.NOTIFICATION_SENT,
                    "SYSTEM",
                    notificationDetails
            );
        }
        
        log.info(notificationDetails);
    }
    
    private TamperResponseDTO convertToDTO(TamperResponse tamperResponse) {
        TamperResponseDTO dto = new TamperResponseDTO();
        dto.setId(tamperResponse.getId());
        dto.setTamperEventId(tamperResponse.getTamperEvent().getId());
        dto.setResponseType(tamperResponse.getResponseType());
        dto.setExecutedAt(tamperResponse.getExecutedAt());
        dto.setSuccess(tamperResponse.isSuccess());
        dto.setFailureReason(tamperResponse.getFailureReason());
        dto.setExecutedBy(tamperResponse.getExecutedBy());
        dto.setResponseDetails(tamperResponse.getResponseDetails());
        return dto;
    }
} 