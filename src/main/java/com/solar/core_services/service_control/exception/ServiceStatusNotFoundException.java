package com.solar.core_services.service_control.exception;

/**
 * Thrown when the current active service status cannot be located for an installation.
 */
public class ServiceStatusNotFoundException extends RuntimeException {

    public ServiceStatusNotFoundException(String message) {
        super(message);
    }

    public ServiceStatusNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
