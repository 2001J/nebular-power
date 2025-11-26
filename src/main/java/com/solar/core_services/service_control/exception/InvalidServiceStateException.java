package com.solar.core_services.service_control.exception;

/**
 * Thrown when a service status transition is not allowed from the current state.
 */
public class InvalidServiceStateException extends RuntimeException {

    public InvalidServiceStateException(String message) {
        super(message);
    }

    public InvalidServiceStateException(String message, Throwable cause) {
        super(message, cause);
    }
}
