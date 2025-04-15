package com.solar.core_services.service_control.service;

import com.solar.core_services.tampering_detection.model.TamperEvent;

public interface SecurityIntegrationService {
    
    /**
     * Handle tamper event
     */
    void handleTamperEvent(Long tamperEventId, TamperEvent.TamperEventType eventType, 
                          TamperEvent.TamperSeverity severity);
    
    /**
     * Process security response for a tamper event
     */
    void processSecurityResponse(Long tamperEventId);
    
    /**
     * Suspend service due to security concern
     */
    void suspendServiceForSecurity(Long installationId, String reason, Long tamperEventId);
    
    /**
     * Restore service after security issue resolved
     */
    void restoreServiceAfterSecurityResolution(Long installationId, Long tamperEventId);
    
    /**
     * Check if installation has active security issues
     */
    boolean hasActiveSecurityIssues(Long installationId);
    
    /**
     * Get security status for an installation
     */
    String getSecurityStatus(Long installationId);
} 