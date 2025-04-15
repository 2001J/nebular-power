package com.solar.exception;

/**
 * Exception thrown when a requested resource is not found.
 * This is used throughout the application to indicate when entities
 * like users, installations, or energy data cannot be found in the database.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s not found with %s: '%s'", resourceName, fieldName, fieldValue));
    }
} 