package com.solar.core_services.energy_monitoring.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import org.springframework.boot.jackson.JsonComponent;

import java.io.IOException;

/**
 * Custom deserializer for InstallationType enum to handle case-insensitive values
 * This allows the frontend to send "Commercial" or "Residential" and have it properly
 * converted to COMMERCIAL or RESIDENTIAL enum values.
 */
@JsonComponent
public class InstallationTypeDeserializer extends StdDeserializer<SolarInstallation.InstallationType> {
    
    public InstallationTypeDeserializer() {
        super(SolarInstallation.InstallationType.class);
    }
    
    @Override
    public SolarInstallation.InstallationType deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getValueAsString();
        
        if (value == null || value.isEmpty()) {
            return SolarInstallation.InstallationType.RESIDENTIAL; // Default value
        }
        
        // Case-insensitive comparison
        for (SolarInstallation.InstallationType type : SolarInstallation.InstallationType.values()) {
            if (type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        
        // If no match is found, provide a helpful error message with allowed values
        throw new IllegalArgumentException("Invalid installation type: " + value + 
                ". Allowed values are: " + java.util.Arrays.toString(SolarInstallation.InstallationType.values()));
    }
}