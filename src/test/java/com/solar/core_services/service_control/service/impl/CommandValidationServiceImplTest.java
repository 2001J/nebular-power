package com.solar.core_services.service_control.service.impl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test for command validation service.
 */
class CommandValidationServiceImplTest {

    private CommandValidationServiceImpl validationService;

    @BeforeEach
    void setUp() {
        validationService = new CommandValidationServiceImpl();
    }

    @Test
    void testValidateCommand_RebootDevice_Valid() {
        // Given
        String commandType = "REBOOT_DEVICE";
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("force", true);
        parameters.put("delay_seconds", 10);

        // When & Then
        assertDoesNotThrow(() -> validationService.validateCommand(commandType, parameters));
    }

    @Test
    void testValidateCommand_UpdateFirmware_Valid() {
        // Given
        String commandType = "UPDATE_FIRMWARE";
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("firmware_version", "1.2.3");
        parameters.put("firmware_url", "https://example.com/firmware.bin");
        parameters.put("checksum", "abc123");

        // When & Then
        assertDoesNotThrow(() -> validationService.validateCommand(commandType, parameters));
    }

    @Test
    void testValidateCommand_UpdateFirmware_MissingRequired() {
        // Given
        String commandType = "UPDATE_FIRMWARE";
        Map<String, Object> parameters = new HashMap<>();
        // Missing required "firmware_version"

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                validationService.validateCommand(commandType, parameters)
        );

        assertTrue(exception.getMessage().contains("Missing required parameter 'firmware_version'"));
    }

    @Test
    void testValidateCommand_UpdateSettings_Valid() {
        // Given
        String commandType = "UPDATE_SETTINGS";
        Map<String, Object> parameters = new HashMap<>();
        Map<String, Object> settings = new HashMap<>();
        settings.put("power_limit", 5000);
        settings.put("auto_restart", true);
        parameters.put("settings", settings);

        // When & Then
        assertDoesNotThrow(() -> validationService.validateCommand(commandType, parameters));
    }

    @Test
    void testValidateCommand_UnsupportedCommand() {
        // Given
        String commandType = "DESTROY_UNIVERSE";
        Map<String, Object> parameters = new HashMap<>();

        // When & Then
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                validationService.validateCommand(commandType, parameters)
        );

        assertTrue(exception.getMessage().contains("Unsupported command type"));
    }

    @Test
    void testValidateCommand_NullParameters() {
        // Given
        String commandType = "REBOOT_DEVICE";
        Map<String, Object> parameters = null; // No parameters

        // When & Then - Should not throw for commands with no required parameters
        assertDoesNotThrow(() -> validationService.validateCommand(commandType, parameters));
    }

    @Test
    void testIsCommandTypeSupported() {
        // When & Then
        assertTrue(validationService.isCommandTypeSupported("REBOOT_DEVICE"));
        assertTrue(validationService.isCommandTypeSupported("REQUEST_DIAGNOSTICS"));
        assertTrue(validationService.isCommandTypeSupported("UPDATE_FIRMWARE"));
        assertTrue(validationService.isCommandTypeSupported("GET_LOGS"));
        assertFalse(validationService.isCommandTypeSupported("INVALID_COMMAND"));
    }

    @Test
    void testGetCommandSchema() {
        // When
        Map<String, Object> schema = validationService.getCommandSchema("UPDATE_FIRMWARE");

        // Then
        assertNotNull(schema);
        assertEquals("UPDATE_FIRMWARE", schema.get("command_type"));
        assertTrue(schema.containsKey("required_parameters"));
        assertTrue(schema.containsKey("optional_parameters"));
    }

    @Test
    void testGetCommandSchema_UnknownCommand() {
        // When
        Map<String, Object> schema = validationService.getCommandSchema("UNKNOWN_COMMAND");

        // Then
        assertNull(schema);
    }
}
