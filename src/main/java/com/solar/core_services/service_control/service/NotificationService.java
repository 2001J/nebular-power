package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.model.ServiceStatus;

public interface NotificationService {
    
    /**
     * Send notification about service status change
     */
    void sendStatusChangeNotification(Long installationId, ServiceStatus.ServiceState oldStatus, 
                                     ServiceStatus.ServiceState newStatus, String reason);
    
    /**
     * Send notification about scheduled maintenance
     */
    void sendMaintenanceNotification(Long installationId, java.time.LocalDateTime startTime, 
                                    java.time.LocalDateTime endTime, String reason);
    
    /**
     * Send notification about command execution
     */
    void sendCommandExecutionNotification(Long installationId, String command, boolean success, 
                                         String message);
    
    /**
     * Send notification about system alert
     */
    void sendSystemAlertNotification(Long installationId, String alertType, String message, 
                                    boolean critical);
    
    /**
     * Send notification to administrators
     */
    void sendAdminNotification(String subject, String message, boolean urgent);
    
    /**
     * Send notification to customer
     */
    void sendCustomerNotification(Long userId, String subject, String message);
} 