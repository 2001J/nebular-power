#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Command Handler Module

This module handles commands sent from the server to the solar installation,
processes them, and sends responses back to the server.
"""

import time
import json
import logging
import random
from datetime import datetime
import requests
from requests.exceptions import RequestException
import os

logger = logging.getLogger("CommandHandler")

class CommandHandler:
    """Class for handling and responding to device commands."""
    
    def __init__(self, installation_id, server_url):
        """Initialize the command handler."""
        self.installation_id = installation_id
        self.server_url = server_url
        
        # Command polling interval (in seconds)
        self.polling_interval = 10
        
        # Command processing delay (simulates processing time)
        self.min_processing_delay = 1  # seconds
        self.max_processing_delay = 5  # seconds
        
        # Success rate for commands (percentage)
        self.command_success_rate = 0.95  # 95% success rate by default
        
        # Endpoints
        self.command_endpoint = f"{server_url}/api/service/commands/{installation_id}/pending"
        self.response_endpoint = f"{server_url}/api/service/system/command-response"
        
        # Command processing stats
        self.commands_processed = 0
        self.commands_succeeded = 0
        self.commands_failed = 0
        
        # Service state tracking
        self.service_state_file = f"service_state_{installation_id}.json"
        self._load_service_state()
        
        logger.info(f"Command handler initialized for installation {installation_id} with service state: {self.service_state['status']}")
    
    def _load_service_state(self):
        """Load the service state from file or create default."""
        try:
            if os.path.exists(self.service_state_file):
                with open(self.service_state_file, 'r') as f:
                    self.service_state = json.load(f)
                    logger.info(f"Loaded service state: {self.service_state}")
            else:
                self.service_state = {
                    "status": "ACTIVE",
                    "last_updated": datetime.now().isoformat(),
                    "reason": "Initial state",
                    "last_command_id": None
                }
                self._save_service_state()
        except Exception as e:
            logger.error(f"Error loading service state: {e}")
            self.service_state = {
                "status": "ACTIVE",
                "last_updated": datetime.now().isoformat(),
                "reason": "Error recovery default state",
                "last_command_id": None
            }
            self._save_service_state()
    
    def _save_service_state(self):
        """Save the current service state to file."""
        try:
            with open(self.service_state_file, 'w') as f:
                json.dump(self.service_state, f)
        except Exception as e:
            logger.error(f"Error saving service state: {e}")
    
    def listen_for_commands(self, is_running):
        """Listen for commands from the server and process them."""
        logger.info("Starting command listener")
        
        while is_running():
            try:
                # Poll for new commands
                commands = self._poll_for_commands()
                
                # Process each command
                for command in commands:
                    if not is_running():
                        break
                    
                    # If command is a string, try to parse it as JSON
                    if isinstance(command, str):
                        try:
                            command = json.loads(command)
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse command as JSON: {command}")
                            continue
                    
                    # Process the command
                    success = self._process_command(command)
                    
                    # Send response
                    self._send_command_response(command, success)
                
                # Wait for next polling interval
                time.sleep(self.polling_interval)
                
            except Exception as e:
                logger.error(f"Error in command processing: {e}", exc_info=True)
                time.sleep(5)  # Wait a bit before retrying
    
    def _poll_for_commands(self):
        """Poll the server for new commands."""
        try:
            # Get authentication headers
            from auth_helper import get_auth_helper
            headers = get_auth_helper().get_auth_headers()
            
            response = requests.get(
                self.command_endpoint,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                # Parse the response data
                response_data = response.json()
                
                # Check if the response is paginated
                if isinstance(response_data, dict) and "content" in response_data:
                    # Extract the content (list of commands) from paginated response
                    commands = response_data.get("content", [])
                    if commands:
                        logger.info(f"Received {len(commands)} new commands")
                    return commands
                else:
                    # Handle case where the response is a direct list of commands
                    if response_data:
                        logger.info(f"Received {len(response_data)} new commands")
                    return response_data
            else:
                logger.warning(f"Failed to poll for commands: {response.status_code} - {response.text}")
                return []
        
        except RequestException as e:
            logger.error(f"Error polling for commands: {e}")
            return []
    
    def _process_command(self, command):
        """Process a command and return success status."""
        command_id = command.get("id", "unknown")
        command_type = command.get("commandType", "unknown")
        target_device = command.get("deviceId", "unknown")
        correlation_id = command.get("correlationId", str(command_id))
        parameters = command.get("parameters", {})
        
        logger.info(f"Processing command {command_id} of type {command_type} for device {target_device}")
        
        # Increment processed count
        self.commands_processed += 1
        
        # Simulate command processing time
        processing_time = random.uniform(self.min_processing_delay, self.max_processing_delay)
        time.sleep(processing_time)
        
        # Determine if the command is successful based on success rate
        success = random.random() < self.command_success_rate
        
        # Handle specific command types
        if command_type == "REBOOT_DEVICE":
            logger.info(f"Simulating device reboot for {target_device}")
            # In a real system, this would actually reboot the device
        
        elif command_type == "UPDATE_FIRMWARE":
            firmware_version = parameters.get("version", "unknown")
            logger.info(f"Simulating firmware update to version {firmware_version} for {target_device}")
            # In a real system, this would perform a firmware update
        
        elif command_type == "ADJUST_SETTINGS":
            logger.info(f"Simulating settings adjustment for {target_device}: {parameters}")
            # In a real system, this would adjust device settings
        
        elif command_type == "COLLECT_DIAGNOSTICS":
            logger.info(f"Simulating diagnostic collection for {target_device}")
            # In a real system, this would collect diagnostic information
        
        elif command_type == "SUSPEND_SERVICE":
            reason = parameters.get("reason", "unknown")
            grace_period = parameters.get("gracePeriodExpired", False)
            logger.info(f"Service suspension for installation {self.installation_id}, reason: {reason}, grace period expired: {grace_period}")
            
            # Update service state
            self.service_state["status"] = "SUSPENDED"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = reason
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            
            # Simulate disabling power output
            logger.info("POWER OUTPUT DISABLED - Installation suspended due to payment issues")
            
            # Write to simulation log for monitoring
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE SUSPENDED - Reason: {reason}\n")
            
        elif command_type == "RESTORE_SERVICE":
            payment_id = parameters.get("paymentId", "unknown")
            restoration_reason = parameters.get("restorationReason", "unknown")
            logger.info(f"Service restoration for installation {self.installation_id}, payment ID: {payment_id}, reason: {restoration_reason}")
            
            # Update service state
            self.service_state["status"] = "ACTIVE"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = f"Service restored: {restoration_reason}"
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            
            # Simulate enabling power output
            logger.info("POWER OUTPUT ENABLED - Installation active after payment")
            
            # Write to simulation log for monitoring
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE RESTORED - Payment ID: {payment_id}\n")
        
        else:
            logger.warning(f"Unknown command type: {command_type}")
        
        # Update success/failure counts
        if success:
            self.commands_succeeded += 1
            logger.info(f"Command {command_id} executed successfully")
        else:
            self.commands_failed += 1
            logger.warning(f"Command {command_id} failed to execute")
        
        return success
    
    def _send_command_response(self, command, success):
        """Send a response for a processed command."""
        command_id = command.get("id", "unknown")
        correlation_id = command.get("correlationId", str(command_id))
        command_type = command.get("commandType", "unknown")
        
        # Generate response data
        response_data = {
            "commandId": command_id,
            "correlationId": correlation_id,
            "installationId": self.installation_id,
            "timestamp": datetime.now().isoformat(),
            "success": success,
            "message": f"Command {command_type} processed" if success else "Command failed",
            "errorCode": None if success else f"ERR-{random.randint(100, 999)}",
            "errorDetails": None if success else self._generate_error_details(command),
            "result": self._generate_result(command) if success else None
        }
        
        logger.debug(f"Sending response for command {command_id}: success={success}")
        
        try:
            # Get authentication headers
            from auth_helper import get_auth_helper
            headers = get_auth_helper().get_auth_headers()
            headers["Content-Type"] = "application/json"
            
            response = requests.post(
                self.response_endpoint,
                json=response_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.debug(f"Command response sent successfully for {command_id}")
            else:
                logger.warning(f"Failed to send command response for {command_id}: "
                             f"{response.status_code} - {response.text}")
        
        except RequestException as e:
            logger.error(f"Error sending command response for {command_id}: {e}")
    
    def _generate_error_details(self, command):
        """Generate realistic error details for failed commands."""
        command_type = command.get("commandType", "")
        
        error_details = {
            "REBOOT_DEVICE": [
                "Device unresponsive during reboot sequence",
                "Insufficient power to complete reboot",
                "Critical process preventing shutdown"
            ],
            "UPDATE_FIRMWARE": [
                "Firmware package integrity check failed",
                "Insufficient storage space for update",
                "Device in emergency mode, update rejected",
                "Incompatible firmware version"
            ],
            "ADJUST_SETTINGS": [
                "Parameter validation failed",
                "Setting locked by system administrator",
                "Value out of acceptable range"
            ],
            "COLLECT_DIAGNOSTICS": [
                "Diagnostic service unavailable",
                "Insufficient permissions to access system logs",
                "Device busy with critical operation"
            ],
            "SUSPEND_SERVICE": [
                "Safety mechanism preventing suspension",
                "Device in recovery mode",
                "Administrative lock preventing suspension"
            ],
            "RESTORE_SERVICE": [
                "Hardware check failed, service locked",
                "Required component offline",
                "System integrity verification failed"
            ]
        }
        
        default_errors = [
            "Communication timeout",
            "Internal device error",
            "Operation not supported in current state"
        ]
        
        # Get appropriate error messages for the command type
        possible_errors = error_details.get(command_type, default_errors)
        
        # Return a random error from the list
        return random.choice(possible_errors)
    
    def _generate_result(self, command):
        """Generate a realistic result object for successful commands."""
        command_type = command.get("commandType", "")
        device_id = command.get("deviceId", "unknown")
        
        # Base result with timestamp
        result = {
            "timestamp": datetime.now().isoformat(),
            "processingTimeMs": random.randint(100, 3000)
        }
        
        # Add command-specific results
        if command_type == "REBOOT_DEVICE":
            result["bootTime"] = datetime.now().isoformat()
            result["uptime"] = 0
            result["bootCount"] = random.randint(1, 100)
        
        elif command_type == "UPDATE_FIRMWARE":
            result["previousVersion"] = command.get("parameters", {}).get("currentVersion", "1.0.0")
            result["newVersion"] = command.get("parameters", {}).get("version", "2.0.0")
            result["updateDuration"] = random.randint(30, 300)  # seconds
        
        elif command_type == "ADJUST_SETTINGS":
            params = command.get("parameters", {})
            result["appliedSettings"] = params
            result["effectiveAfterReboot"] = random.choice([True, False])
        
        elif command_type == "COLLECT_DIAGNOSTICS":
            result["logSize"] = random.randint(1000, 100000)
            result["diagnosticId"] = f"DIAG-{random.randint(10000, 99999)}"
            result["collectionDuration"] = random.randint(1, 30)  # seconds
        
        elif command_type == "SUSPEND_SERVICE":
            result["suspensionTime"] = datetime.now().isoformat()
            result["gracePeriodApplied"] = command.get("parameters", {}).get("gracePeriodExpired", False)
            result["currentStatus"] = "SUSPENDED"
            result["affectedDevices"] = random.randint(1, 5)
        
        elif command_type == "RESTORE_SERVICE":
            result["restorationTime"] = datetime.now().isoformat()
            result["powerRestored"] = True
            result["currentStatus"] = "ACTIVE"
            result["resumedDevices"] = random.randint(1, 5)
        
        return result
    
    def get_service_status(self):
        """Return the current service status."""
        return self.service_state["status"]