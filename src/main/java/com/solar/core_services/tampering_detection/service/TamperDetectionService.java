package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent;

public interface TamperDetectionService {
    
    void startMonitoring(Long installationId);
    
    void stopMonitoring(Long installationId);
    
    boolean isMonitoring(Long installationId);
    
    TamperEventDTO processPhysicalMovementData(Long installationId, double movementValue, String rawData);
    
    TamperEventDTO processVoltageFluctuationData(Long installationId, double voltageValue, String rawData);
    
    TamperEventDTO processConnectionInterruptionData(Long installationId, boolean connected, String rawData);
    
    TamperEventDTO processLocationChangeData(Long installationId, String newLocation, String previousLocation, String rawData);
    
    TamperEventDTO detectTampering(Long installationId, TamperEvent.TamperEventType eventType, 
                                  double confidenceScore, String description, String rawData);
    
    void runDiagnostics(Long installationId);
    
    void adjustSensitivity(Long installationId, String eventType, double newThreshold);
} 