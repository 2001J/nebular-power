package com.solar.core_services.service_control.config;

import com.solar.core_services.service_control.model.DeviceCommand;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for CommandStatusConverter to ensure case-insensitive enum conversion
 */
class CommandStatusConverterTest {

    private CommandStatusConverter converter;

    @BeforeEach
    void setUp() {
        converter = new CommandStatusConverter();
    }

    @Test
    void shouldConvertLowercaseToEnum() {
        DeviceCommand.CommandStatus result = converter.convert("pending");
        assertEquals(DeviceCommand.CommandStatus.PENDING, result);
    }

    @Test
    void shouldConvertUppercaseToEnum() {
        DeviceCommand.CommandStatus result = converter.convert("PENDING");
        assertEquals(DeviceCommand.CommandStatus.PENDING, result);
    }

    @Test
    void shouldConvertMixedCaseToEnum() {
        DeviceCommand.CommandStatus result = converter.convert("Pending");
        assertEquals(DeviceCommand.CommandStatus.PENDING, result);
        
        result = converter.convert("DeliVered");
        assertEquals(DeviceCommand.CommandStatus.DELIVERED, result);
    }

    @Test
    void shouldConvertAllValidStatuses() {
        assertEquals(DeviceCommand.CommandStatus.PENDING, converter.convert("pending"));
        assertEquals(DeviceCommand.CommandStatus.SENT, converter.convert("sent"));
        assertEquals(DeviceCommand.CommandStatus.DELIVERED, converter.convert("delivered"));
        assertEquals(DeviceCommand.CommandStatus.EXECUTED, converter.convert("executed"));
        assertEquals(DeviceCommand.CommandStatus.FAILED, converter.convert("failed"));
        assertEquals(DeviceCommand.CommandStatus.EXPIRED, converter.convert("expired"));
        assertEquals(DeviceCommand.CommandStatus.CANCELLED, converter.convert("cancelled"));
        assertEquals(DeviceCommand.CommandStatus.QUEUED, converter.convert("queued"));
    }

    @Test
    void shouldThrowExceptionForInvalidStatus() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> converter.convert("invalid_status")
        );
        
        assertTrue(exception.getMessage().contains("Invalid CommandStatus value"));
        assertTrue(exception.getMessage().contains("invalid_status"));
    }

    @Test
    void shouldProvideHelpfulErrorMessage() {
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> converter.convert("unknown")
        );
        
        String message = exception.getMessage();
        assertTrue(message.contains("Valid values are"));
        assertTrue(message.contains("PENDING"));
        assertTrue(message.contains("SENT"));
        assertTrue(message.contains("DELIVERED"));
    }
}
