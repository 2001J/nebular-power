package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.tampering_detection.dto.TamperEventCreateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventUpdateDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface TamperEventService {
    
    TamperEventDTO createTamperEvent(TamperEventCreateDTO createDTO);
    
    TamperEventDTO getTamperEventById(Long id);
    
    Page<TamperEventDTO> getTamperEventsByInstallationId(Long installationId, Pageable pageable);
    
    Page<TamperEventDTO> getTamperEventsByUserId(Long userId, Pageable pageable);
    
    Page<TamperEventDTO> getTamperEventsByInstallationIds(List<Long> installationIds, Pageable pageable);
    
    Page<TamperEventDTO> getUnresolvedTamperEvents(List<TamperEvent.TamperSeverity> severities, Pageable pageable);
    
    List<TamperEventDTO> getTamperEventsByInstallationAndTimeRange(Long installationId, LocalDateTime start, LocalDateTime end);
    
    TamperEventDTO updateTamperEventStatus(Long id, TamperEventUpdateDTO updateDTO);
    
    TamperEventDTO resolveTamperEvent(Long id, String resolvedBy, String resolutionNotes);
    
    long countUnresolvedTamperEventsByInstallation(Long installationId);
    
    void validateTamperEvent(TamperEventCreateDTO createDTO);
    
    boolean isLikelyFalsePositive(TamperEventCreateDTO createDTO);
} 