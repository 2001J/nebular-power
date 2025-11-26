package com.solar.core_services.service_control.config;

import com.solar.core_services.service_control.model.DeviceCommand;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * Custom converter for CommandStatus enum to handle case-insensitive conversion
 * from URL path variables and request parameters.
 * 
 * This allows the API to accept "pending", "PENDING", "Pending" etc.
 * and convert them all to the correct enum value.
 */
@Component
public class CommandStatusConverter implements Converter<String, DeviceCommand.CommandStatus> {

    @Override
    public DeviceCommand.CommandStatus convert(String source) {
        try {
            return DeviceCommand.CommandStatus.valueOf(source.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                "Invalid CommandStatus value: '" + source + "'. " +
                "Valid values are: PENDING, SENT, DELIVERED, EXECUTED, FAILED, EXPIRED, CANCELLED, QUEUED"
            );
        }
    }
}
