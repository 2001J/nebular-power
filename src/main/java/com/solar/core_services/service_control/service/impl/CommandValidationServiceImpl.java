package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.service_control.service.CommandValidationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Implementation of command validation service.
 * Defines schemas for supported command types and validates parameters.
 */
@Service
@Slf4j
public class CommandValidationServiceImpl implements CommandValidationService {
    
    // Supported command types
    private static final Set<String> SUPPORTED_COMMANDS = Set.of(
            "REBOOT_DEVICE",
            "REQUEST_DIAGNOSTICS",
            "UPDATE_SETTINGS",
            "RESET_INVERTER",
            "ENABLE_MAINTENANCE_MODE",
            "DISABLE_MAINTENANCE_MODE",
            "UPDATE_FIRMWARE",
            "GET_LOGS",
            "SUSPEND_SERVICE",
            "RESTORE_SERVICE",
            "RESTART_SERVICE"
    );
    
    // Command schemas (defining required and optional parameters)
    private static final Map<String, CommandSchema> COMMAND_SCHEMAS = new HashMap<>();
    
    static {
        // REBOOT_DEVICE: No parameters required
        COMMAND_SCHEMAS.put("REBOOT_DEVICE", new CommandSchema(
                Set.of(),
                Set.of("force", "delay_seconds")
        ));
        
        // REQUEST_DIAGNOSTICS: Optional filter
        COMMAND_SCHEMAS.put("REQUEST_DIAGNOSTICS", new CommandSchema(
                Set.of(),
                Set.of("include_logs", "diagnostic_type", "component")
        ));
        
        // UPDATE_SETTINGS: Requires settings object
        COMMAND_SCHEMAS.put("UPDATE_SETTINGS", new CommandSchema(
                Set.of("settings"),
                Set.of("validate_only", "apply_immediately")
        ));
        
        // RESET_INVERTER: Optional inverter ID
        COMMAND_SCHEMAS.put("RESET_INVERTER", new CommandSchema(
                Set.of(),
                Set.of("inverter_id", "preserve_config")
        ));
        
        // ENABLE_MAINTENANCE_MODE: Optional duration
        COMMAND_SCHEMAS.put("ENABLE_MAINTENANCE_MODE", new CommandSchema(
                Set.of(),
                Set.of("duration_hours", "reason")
        ));
        
        // DISABLE_MAINTENANCE_MODE: No parameters
        COMMAND_SCHEMAS.put("DISABLE_MAINTENANCE_MODE", new CommandSchema(
                Set.of(),
                Set.of("reason")
        ));
        
        // UPDATE_FIRMWARE: Requires firmware version
        COMMAND_SCHEMAS.put("UPDATE_FIRMWARE", new CommandSchema(
                Set.of("firmware_version"),
                Set.of("firmware_url", "checksum", "reboot_after")
        ));
        
        // GET_LOGS: Optional date range and log level
        COMMAND_SCHEMAS.put("GET_LOGS", new CommandSchema(
                Set.of(),
                Set.of("start_date", "end_date", "log_level", "max_lines")
        ));
        
        // SUSPEND_SERVICE: Optional reason and grace period
        COMMAND_SCHEMAS.put("SUSPEND_SERVICE", new CommandSchema(
                Set.of(),
                Set.of("reason", "gracePeriodExpired", "suspensionType", "requestedBy")
        ));
        
        // RESTORE_SERVICE: Optional reason and payment info
        COMMAND_SCHEMAS.put("RESTORE_SERVICE", new CommandSchema(
                Set.of(),
                Set.of("reason", "paymentId", "restorationReason", "requestedBy")
        ));
        
        // RESTART_SERVICE: Optional reason
        COMMAND_SCHEMAS.put("RESTART_SERVICE", new CommandSchema(
                Set.of(),
                Set.of("reason", "requestedBy")
        ));
    }
    
    @Override
    public void validateCommand(String commandType, Map<String, Object> parameters) {
        log.debug("Validating command: {} with parameters: {}", commandType, parameters);
        
        // Check if command type is supported
        if (!isCommandTypeSupported(commandType)) {
            throw new IllegalArgumentException("Unsupported command type: " + commandType);
        }
        
        // Get schema for command
        CommandSchema schema = COMMAND_SCHEMAS.get(commandType);
        if (schema == null) {
            // Command is supported but has no schema (shouldn't happen)
            log.warn("Command {} is supported but has no schema defined", commandType);
            return;
        }
        
        // Parameters can be null or empty for commands with no required parameters
        Map<String, Object> params = parameters != null ? parameters : Collections.emptyMap();
        
        // Check for required parameters
        for (String requiredParam : schema.requiredParams) {
            if (!params.containsKey(requiredParam) || params.get(requiredParam) == null) {
                throw new IllegalArgumentException(
                        String.format("Missing required parameter '%s' for command '%s'", 
                                requiredParam, commandType));
            }
        }
        
        // Check for unknown parameters (warn but don't fail)
        Set<String> allowedParams = new HashSet<>();
        allowedParams.addAll(schema.requiredParams);
        allowedParams.addAll(schema.optionalParams);
        
        for (String paramKey : params.keySet()) {
            if (!allowedParams.contains(paramKey)) {
                log.warn("Unknown parameter '{}' for command '{}'. Allowed: {}", 
                        paramKey, commandType, allowedParams);
            }
        }
        
        log.debug("Command validation successful for: {}", commandType);
    }
    
    @Override
    public boolean isCommandTypeSupported(String commandType) {
        return SUPPORTED_COMMANDS.contains(commandType);
    }
    
    @Override
    public Map<String, Object> getCommandSchema(String commandType) {
        CommandSchema schema = COMMAND_SCHEMAS.get(commandType);
        if (schema == null) {
            return null;
        }
        
        Map<String, Object> schemaMap = new HashMap<>();
        schemaMap.put("command_type", commandType);
        schemaMap.put("required_parameters", new ArrayList<>(schema.requiredParams));
        schemaMap.put("optional_parameters", new ArrayList<>(schema.optionalParams));
        
        return schemaMap;
    }
    
    /**
     * Internal class to represent command parameter schema.
     */
    private static class CommandSchema {
        final Set<String> requiredParams;
        final Set<String> optionalParams;
        
        CommandSchema(Set<String> requiredParams, Set<String> optionalParams) {
            this.requiredParams = requiredParams;
            this.optionalParams = optionalParams;
        }
    }
}
