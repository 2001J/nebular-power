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
        
        # Reference to status reporter (set by main.py after initialization)
        self.status_reporter = None
        
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
                    
                    # Fix: Reset to "Initial state" only if last update was more than 5 minutes ago
                    # This indicates simulator was stopped and restarted (not just a service restart command)
                    last_updated_str = self.service_state.get("last_updated")
                    if last_updated_str:
                        try:
                            # Parse ISO format timestamp
                            # Handle both with and without microseconds, with and without timezone
                            last_updated_str_clean = last_updated_str.replace('Z', '+00:00')
                            if '.' in last_updated_str_clean and '+' in last_updated_str_clean:
                                # Has microseconds and timezone
                                last_updated = datetime.fromisoformat(last_updated_str_clean.split('+')[0])
                            elif '.' in last_updated_str_clean:
                                # Has microseconds, no timezone
                                last_updated = datetime.fromisoformat(last_updated_str_clean)
                            elif '+' in last_updated_str_clean or '-' in last_updated_str_clean.split('T')[1]:
                                # Has timezone, no microseconds
                                last_updated = datetime.fromisoformat(last_updated_str_clean.rsplit('+', 1)[0].rsplit('-', 1)[0])
                            else:
                                # Plain ISO format
                                last_updated = datetime.fromisoformat(last_updated_str_clean)
                            
                            time_since_update = (datetime.now() - last_updated).total_seconds()
                            
                            # If last update was more than 5 minutes ago, this is a simulator restart
                            if time_since_update > 300:  # 5 minutes
                                logger.info(f"Last state update was {int(time_since_update)}s ago - resetting to 'Initial state'")
                                self.service_state["reason"] = "Initial state"
                                self.service_state["last_updated"] = datetime.now().isoformat()
                                self._save_service_state()
                            else:
                                logger.info(f"Last state update was {int(time_since_update)}s ago - keeping current reason: '{self.service_state.get('reason')}'")
                        except Exception as e:
                            logger.debug(f"Could not parse last_updated timestamp: {e}")
                            # Fallback: if we can't parse, reset to initial state to be safe
                            self.service_state["reason"] = "Initial state"
                            self.service_state["last_updated"] = datetime.now().isoformat()
                            self._save_service_state()
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
    
    def _trigger_immediate_status_report(self):
        """Trigger an immediate status report to update the backend."""
        if self.status_reporter:
            try:
                logger.info("Triggering immediate status report after service state change")
                # Force immediate report with current state
                self.status_reporter._report_current_status(force=True)
            except Exception as e:
                logger.error(f"Error triggering immediate status report: {e}")
        else:
            logger.warning("Status reporter not available for immediate report")
    
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
                
                # Wait for next polling interval with interruptible sleep
                sleep_remaining = self.polling_interval
                while sleep_remaining > 0 and is_running():
                    sleep_time = min(0.5, sleep_remaining)
                    time.sleep(sleep_time)
                    sleep_remaining -= sleep_time
                
            except Exception as e:
                logger.error(f"Error in command processing: {e}", exc_info=True)
                # Interruptible error recovery sleep
                for _ in range(10):  # 5 seconds total
                    if not is_running():
                        break
                    time.sleep(0.5)
        
        logger.info("Command handler stopped gracefully")
    
    def _poll_for_commands(self):
        """Poll the server for new commands."""
        try:
            # Get authentication headers
            from auth_helper import get_auth_helper
            headers = get_auth_helper().get_auth_headers()
            
            response = requests.get(
                self.command_endpoint,
                headers=headers,
                timeout=5  # Reduced from 10 seconds
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
        # Backend sends 'command' field, not 'commandType'
        command_type = command.get("command", command.get("commandType", "unknown"))
        target_device = command.get("deviceId", "unknown")
        correlation_id = command.get("correlationId", str(command_id))
        
        # Parameters might be a JSON string or a dict
        parameters = command.get("parameters", {})
        if isinstance(parameters, str):
            try:
                parameters = json.loads(parameters) if parameters else {}
            except json.JSONDecodeError:
                logger.error(f"Failed to parse parameters as JSON: {parameters}")
                parameters = {}
        elif parameters is None:
            parameters = {}
        
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
            logger.info(f"Simulating device REBOOT for {target_device}")
            logger.warning("⚠️  DEVICE REBOOT INITIATED - Raspberry Pi will be offline for 2-5 minutes")
            logger.info("Note: Solar panels, inverter, and battery continue operating autonomously")
            
            # In a real scenario, this would trigger an actual system reboot
            # For simulation, we'll just pause for a realistic duration
            reboot_duration = random.uniform(120, 300)  # 2-5 minutes in seconds
            logger.info(f"Simulating {int(reboot_duration)} seconds of downtime...")
            
            # This would actually stop all monitoring threads in a real implementation
            # For now, just simulate the delay
            time.sleep(min(5, reboot_duration))  # Cap at 5 seconds for simulation speed
            
            logger.info("✅ DEVICE REBOOT COMPLETED - Monitoring systems back online")
            logger.info("All hardware components maintained autonomous operation during reboot")
            
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - DEVICE REBOOTED - Duration: {int(reboot_duration)}s\n")
        
        elif command_type == "REQUEST_DIAGNOSTICS":
            logger.info(f"Collecting diagnostics for {target_device}")
            diagnostic_types = parameters.get("diagnostic_types", ["system", "power", "network"])
            logger.info(f"Gathering diagnostic data: {', '.join(diagnostic_types)}")
            # Simulate diagnostic collection
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - DIAGNOSTICS REQUESTED - Types: {', '.join(diagnostic_types)}\n")
        
        elif command_type == "UPDATE_SETTINGS":
            logger.info(f"Updating settings for {target_device}: {parameters}")
            # Extract setting parameters
            settings_to_update = {k: v for k, v in parameters.items() if k not in ['requestedBy']}
            logger.info(f"Applying {len(settings_to_update)} setting changes")
            # Simulate settings update
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SETTINGS UPDATED - Changes: {settings_to_update}\n")
        
        elif command_type == "RESET_INVERTER":
            logger.info(f"Resetting inverter for {target_device}")
            logger.warning("INVERTER RESET INITIATED - Power output temporarily interrupted")
            time.sleep(0.5)  # Simulate reset time
            logger.info("INVERTER RESET COMPLETED - Power generation resumed")
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - INVERTER RESET COMPLETED\n")
        
        elif command_type == "GET_LOGS":
            logger.info(f"Retrieving logs for {target_device}")
            log_types = parameters.get("log_types", ["system", "error"])
            start_date = parameters.get("start_date")
            end_date = parameters.get("end_date")
            logger.info(f"Collecting logs - Types: {log_types}, Period: {start_date} to {end_date}")
            # Simulate log retrieval
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - LOGS RETRIEVED - Types: {log_types}\n")
        
        elif command_type == "UPDATE_FIRMWARE":
            firmware_version = parameters.get("version", "unknown")
            firmware_url = parameters.get("firmware_url", "")
            logger.info(f"Simulating firmware update to version {firmware_version} for {target_device}")
            logger.warning("FIRMWARE UPDATE STARTED - Device will be unavailable")
            time.sleep(2)  # Simulate longer update time
            logger.info(f"FIRMWARE UPDATE COMPLETED - Version: {firmware_version}")
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - FIRMWARE UPDATED - Version: {firmware_version}\n")
        
        elif command_type == "RESTART_SERVICE":
            reason = parameters.get("reason", "Service restart requested")
            requested_by = parameters.get("requestedBy", "SYSTEM")
            logger.info(f"Service restart for installation {self.installation_id}, reason: {reason}, requested by: {requested_by}")
            
            # Update service state to transitioning
            self.service_state["status"] = "TRANSITIONING"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = f"Restarting: {reason}"
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            self._trigger_immediate_status_report()  # Send status update immediately
            
            logger.info("SERVICE RESTART INITIATED - Simulating service interruption")
            time.sleep(2)  # Simulate restart time
            
            # Update service state back to active
            self.service_state["status"] = "ACTIVE"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = "Service restarted successfully"
            self._save_service_state()
            self._trigger_immediate_status_report()  # Send status update immediately
            
            logger.info("SERVICE RESTART COMPLETED - Service is now active")
            
            # Write to simulation log
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE RESTARTED - Reason: {reason}\n")
        
        elif command_type == "ADJUST_SETTINGS":
            logger.info(f"Simulating settings adjustment for {target_device}: {parameters}")
            # Legacy command type, redirect to UPDATE_SETTINGS behavior
        
        elif command_type == "COLLECT_DIAGNOSTICS":
            logger.info(f"Simulating diagnostic collection for {target_device}")
            # Legacy command type, redirect to REQUEST_DIAGNOSTICS behavior
        
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
            self._trigger_immediate_status_report()  # Send status update immediately
            
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
            self._trigger_immediate_status_report()  # Send status update immediately
            
            # Simulate enabling power output
            logger.info("POWER OUTPUT ENABLED - Installation active after payment")
            
            # Write to simulation log for monitoring
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE RESTORED - Payment ID: {payment_id}\n")
        
        elif command_type == "START_SERVICE":
            logger.info(f"Starting service for installation {self.installation_id}")
            
            # Update service state
            old_status = self.service_state.get("status", "UNKNOWN")
            self.service_state["status"] = "ACTIVE"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = "Service started via admin command"
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            
            # Simulate starting the service
            logger.info(f"SERVICE STARTED - Previous status: {old_status}")
            
            # Write to simulation log
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE STARTED - Previous: {old_status}\n")
        
        elif command_type == "STOP_SERVICE":
            logger.info(f"Stopping service for installation {self.installation_id}")
            
            # Update service state
            old_status = self.service_state.get("status", "ACTIVE")
            self.service_state["status"] = "SUSPENDED_MAINTENANCE"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = "Service stopped via admin command"
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            
            # Simulate stopping the service
            logger.warning(f"SERVICE STOPPED - Previous status: {old_status}")
            
            # Write to simulation log
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE STOPPED - Previous: {old_status}\n")
        
        elif command_type == "RESTART_SERVICE":
            logger.info(f"Restarting service for installation {self.installation_id}")
            
            # Update service state to transitioning
            old_status = self.service_state.get("status", "ACTIVE")
            self.service_state["status"] = "TRANSITIONING"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = "Service restarting via admin command"
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            
            # Simulate restart sequence
            logger.info("SERVICE RESTARTING - Phase 1: Stopping services")
            
            # Write to simulation log
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE RESTART INITIATED - Previous: {old_status}\n")
            
            # Simulate restart delay (in real scenario, this would be actual service restart)
            time.sleep(2)
            
            # Complete restart
            self.service_state["status"] = "ACTIVE"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = "Service restarted successfully"
            self._save_service_state()
            
            logger.info("SERVICE RESTARTED - All systems operational")
            
            # Write completion to log
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - SERVICE RESTART COMPLETED\n")
        
        elif command_type == "ENABLE_MAINTENANCE_MODE":
            logger.info(f"Enabling maintenance mode for installation {self.installation_id}")
            requested_by = parameters.get("requestedBy", "system")
            duration_hours = parameters.get("duration_hours")
            
            # Update service state
            old_status = self.service_state.get("status", "ACTIVE")
            self.service_state["status"] = "SUSPENDED_MAINTENANCE"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = f"Maintenance mode enabled by {requested_by}"
            if duration_hours:
                self.service_state["reason"] += f" for {duration_hours} hours"
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            self._trigger_immediate_status_report()  # Send status update immediately
            
            # Simulate entering maintenance mode
            logger.warning(f"MAINTENANCE MODE ENABLED - Previous status: {old_status}")
            logger.info("Device entering safe mode - limited operations")
            
            # Write to simulation log
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - MAINTENANCE MODE ENABLED - Previous: {old_status}, By: {requested_by}\n")
        
        elif command_type == "DISABLE_MAINTENANCE_MODE":
            logger.info(f"Disabling maintenance mode for installation {self.installation_id}")
            requested_by = parameters.get("requestedBy", "system")
            
            # Update service state
            old_status = self.service_state.get("status", "SUSPENDED_MAINTENANCE")
            self.service_state["status"] = "ACTIVE"
            self.service_state["last_updated"] = datetime.now().isoformat()
            self.service_state["reason"] = f"Maintenance mode disabled by {requested_by}"
            self.service_state["last_command_id"] = command_id
            self._save_service_state()
            self._trigger_immediate_status_report()  # Send status update immediately
            
            # Simulate exiting maintenance mode
            logger.info(f"MAINTENANCE MODE DISABLED - Resuming normal operations")
            logger.info("Device restored to full operational capacity")
            
            # Write to simulation log
            with open("simulation.log", "a") as f:
                f.write(f"{datetime.now().isoformat()} - MAINTENANCE MODE DISABLED - Resumed: ACTIVE, By: {requested_by}\n")
        
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
        # Use 'command' field (backend standard), fallback to 'commandType'
        command_type = command.get("command", command.get("commandType", "unknown"))
        
        # Generate response data
        response_data = {
            "commandId": command_id,
            "correlationId": correlation_id,
            "installationId": self.installation_id,
            "timestamp": datetime.now().isoformat(),
            "success": success,
            "message": f"Command {command_type} processed successfully" if success else f"Command {command_type} failed",
            "errorCode": None if success else f"ERR-{random.randint(100, 999)}",
            "errorDetails": None if success else self._generate_error_details(command),
            "result": self._generate_result(command, command_type) if success else None
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
                timeout=5  # Reduced from 10 seconds
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
            "REQUEST_DIAGNOSTICS": [
                "Diagnostic service unavailable",
                "Insufficient storage for diagnostic data",
                "Sensor communication error"
            ],
            "UPDATE_SETTINGS": [
                "Invalid parameter value",
                "Setting locked by administrator",
                "Configuration validation failed"
            ],
            "RESET_INVERTER": [
                "Inverter not responding",
                "Safety interlock engaged",
                "Grid connection unstable"
            ],
            "GET_LOGS": [
                "Log file corrupted",
                "Insufficient permissions",
                "Log service not running"
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
            ],
            "ENABLE_MAINTENANCE_MODE": [
                "Cannot enter maintenance mode during critical operation",
                "Safety systems prevent maintenance mode activation",
                "Device must be in ACTIVE state"
            ],
            "DISABLE_MAINTENANCE_MODE": [
                "Maintenance tasks still in progress",
                "Safety check failed",
                "Device not in maintenance mode"
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
    
    def _generate_result(self, command, command_type=None):
        """Generate a realistic result object for successful commands."""
        if not command_type:
            command_type = command.get("command", command.get("commandType", ""))
        device_id = command.get("deviceId", "unknown")
        
        # Parse parameters if they're a string
        params = command.get("parameters", {})
        if isinstance(params, str):
            try:
                params = json.loads(params) if params else {}
            except json.JSONDecodeError:
                params = {}
        
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
            result["systemStatus"] = "operational"
        
        elif command_type == "REQUEST_DIAGNOSTICS":
            diagnostic_types = params.get("diagnostic_types", params.get("diagnostic_type", "full"))
            component = params.get("component", "all")
            result["diagnosticTypes"] = diagnostic_types if isinstance(diagnostic_types, list) else [diagnostic_types]
            result["component"] = component
            result["diagnosticId"] = f"DIAG-{random.randint(10000, 99999)}"
            result["collectionDuration"] = random.randint(1, 30)
            # Simulate diagnostic data
            result["diagnostics"] = {
                "systemHealth": "good",
                "cpuUsage": f"{random.randint(10, 60)}%",
                "memoryUsage": f"{random.randint(30, 80)}%",
                "temperature": f"{random.randint(35, 65)}°C",
                "diskSpace": f"{random.randint(40, 90)}% used",
                "networkLatency": f"{random.randint(5, 50)}ms",
                "inverterStatus": "operational",
                "panelVoltage": f"{random.uniform(200, 300):.1f}V",
                "batteryLevel": f"{random.randint(50, 100)}%"
            }
            if params.get("include_logs"):
                result["logsIncluded"] = True
                result["logEntries"] = random.randint(50, 200)
        
        elif command_type == "UPDATE_SETTINGS":
            settings = {k: v for k, v in params.items() if k not in ['requestedBy']}
            result["appliedSettings"] = settings
            result["settingsCount"] = len(settings)
            result["requiresReboot"] = random.choice([True, False])
        
        elif command_type == "RESET_INVERTER":
            result["resetTime"] = datetime.now().isoformat()
            result["inverterStatus"] = "operational"
            result["powerOutputResumed"] = True
            result["resetDuration"] = random.randint(500, 2000)  # milliseconds
        
        elif command_type == "GET_LOGS":
            log_types = params.get("log_types", ["system"])
            result["logTypes"] = log_types
            result["totalLogEntries"] = random.randint(50, 500)
            result["logSize"] = random.randint(1000, 50000)  # bytes
            result["logId"] = f"LOG-{random.randint(10000, 99999)}"
        
        elif command_type == "UPDATE_FIRMWARE":
            result["previousVersion"] = params.get("currentVersion", "1.0.0")
            result["newVersion"] = params.get("version", params.get("firmware_version", "2.0.0"))
            result["updateDuration"] = random.randint(30, 300)  # seconds
            result["updateSuccess"] = True
            result["deviceRebooted"] = True
        
        elif command_type == "ADJUST_SETTINGS" or command_type == "COLLECT_DIAGNOSTICS":
            # Legacy commands - provide basic result
            result["legacyCommand"] = True
            result["modernEquivalent"] = "UPDATE_SETTINGS" if command_type == "ADJUST_SETTINGS" else "REQUEST_DIAGNOSTICS"
        
        elif command_type == "SUSPEND_SERVICE":
            result["suspensionTime"] = datetime.now().isoformat()
            result["gracePeriodApplied"] = params.get("gracePeriodExpired", False)
            result["currentStatus"] = "SUSPENDED"
            result["affectedDevices"] = random.randint(1, 5)
        
        elif command_type == "RESTORE_SERVICE":
            result["restorationTime"] = datetime.now().isoformat()
            result["powerRestored"] = True
            result["currentStatus"] = "ACTIVE"
            result["resumedDevices"] = random.randint(1, 5)
        
        elif command_type == "RESTART_SERVICE":
            result["restartTime"] = datetime.now().isoformat()
            result["restartDuration"] = random.randint(2, 5)  # seconds
            result["currentStatus"] = "ACTIVE"
            result["servicesRestarted"] = ["monitoring", "data_collection", "command_handler"]
        
        elif command_type == "ENABLE_MAINTENANCE_MODE":
            result["maintenanceModeEnabled"] = True
            result["activationTime"] = datetime.now().isoformat()
            result["currentStatus"] = "SUSPENDED_MAINTENANCE"
            result["safeMode"] = True
            duration = params.get("duration_hours")
            if duration:
                result["expectedDurationHours"] = duration
        
        elif command_type == "DISABLE_MAINTENANCE_MODE":
            result["maintenanceModeDisabled"] = True
            result["restorationTime"] = datetime.now().isoformat()
            result["currentStatus"] = "ACTIVE"
            result["fullOperationalCapacity"] = True
        
        return result
    
    def get_service_status(self):
        """Return the current service status."""
        return self.service_state["status"]