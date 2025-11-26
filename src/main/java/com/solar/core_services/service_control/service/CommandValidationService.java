package com.solar.core_services.service_control.service;

import java.util.Map;

/**
 * Service for validating device commands and their parameters.
 * Ensures commands conform to expected schemas before transmission.
 */
public interface CommandValidationService {
    
    /**
     * Validates a command type and its parameters.
     * 
     * @param commandType The type of command (e.g., "REBOOT_DEVICE")
     * @param parameters The command parameters as a map
     * @throws IllegalArgumentException if command type is invalid or parameters don't match schema
     */
    void validateCommand(String commandType, Map<String, Object> parameters);
    
    /**
     * Checks if a command type is supported.
     * 
     * @param commandType The command type to check
     * @return true if command type is supported, false otherwise
     */
    boolean isCommandTypeSupported(String commandType);
    
    /**
     * Gets the parameter schema for a command type.
     * 
     * @param commandType The command type
     * @return Map describing required and optional parameters, or null if unknown
     */
    Map<String, Object> getCommandSchema(String commandType);
}
