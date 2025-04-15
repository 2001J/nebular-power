package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.tampering_detection.dto.TamperResponseDTO;
import com.solar.core_services.tampering_detection.model.TamperResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface TamperResponseService {
    
    TamperResponseDTO createTamperResponse(Long tamperEventId, TamperResponse.ResponseType responseType, 
                                          String executedBy, String responseDetails);
    
    TamperResponseDTO getTamperResponseById(Long id);
    
    List<TamperResponseDTO> getTamperResponsesByTamperEventId(Long tamperEventId);
    
    Page<TamperResponseDTO> getTamperResponsesByInstallationId(Long installationId, Pageable pageable);
    
    Page<TamperResponseDTO> getTamperResponsesByUserId(Long userId, Pageable pageable);
    
    List<TamperResponseDTO> getTamperResponsesByEventIdAndType(Long tamperEventId, TamperResponse.ResponseType responseType);
    
    List<TamperResponseDTO> getTamperResponsesByTimeRange(LocalDateTime start, LocalDateTime end);
    
    long countSuccessfulResponsesByTamperEventId(Long tamperEventId);
    
    void executeAutomaticResponse(Long tamperEventId);
    
    void sendNotification(Long tamperEventId, String notificationType);
} 