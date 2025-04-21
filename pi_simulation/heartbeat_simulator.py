#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Device Heartbeat Simulator

Simulates heartbeats from solar installation devices, providing status updates,
battery levels, error conditions, and diagnostic information.
"""

import time
import json
import random
import logging
from datetime import datetime
import requests
from requests.exceptions import RequestException

logger = logging.getLogger("HeartbeatSimulator")

class HeartbeatSimulator:
    """Class for simulating device heartbeats."""
    
    def __init__(self, installation_id, server_url, device_id="INVERTER-1", 
                 interval=30, include_diagnostics=True, battery_simulation=True):
        """Initialize the heartbeat simulator."""
        self.installation_id = installation_id
        self.server_url = server_url
        self.device_id = device_id
        self.interval = interval
        self.include_diagnostics = include_diagnostics
        self.battery_simulation = battery_simulation
        
        # Endpoint for sending heartbeats
        self.heartbeat_endpoint = f"{server_url}/api/service/system/device-heartbeat"
        
        # Initialize device state
        self.battery_level = random.uniform(85.0, 100.0)
        self.signal_strength = random.randint(80, 100)
        self.firmware_version = "v1.2.3"
        self.connection_type = random.choice(["WIFI", "CELLULAR", "ETHERNET"])
        self.power_status = True
        self.uptime_seconds = 0
        
        # Error simulation parameters
        self.error_probability = 0.05  # 5% chance of an error on any heartbeat
        self.error_duration = 2  # Number of heartbeats an error persists
        self.current_error = None
        self.error_countdown = 0
        
        # Battery drain simulation
        self.battery_drain_rate = random.uniform(0.01, 0.05)  # % per heartbeat
        self.solar_charging = True
        self.charging_rate = random.uniform(0.02, 0.08)  # % per heartbeat when sunny
        
        # Error codes and their descriptions
        self.possible_errors = {
            "E001": "Communication module failure",
            "E002": "Sensor data corruption",
            "E003": "Configuration file corrupted",
            "E004": "Memory allocation failure",
            "E005": "Persistent storage error",
            "E006": "Real-time clock drift",
            "E007": "Temperature sensor failure",
            "E008": "Voltage sensor calibration error",
            "E009": "Current sensor reading out of range",
            "E010": "Internal fan failure"
        }
        
        logger.info(f"Heartbeat simulator initialized for installation {installation_id}, device {device_id}")
    
    def run_simulation(self, is_running):
        """Run the heartbeat simulation."""
        logger.info("Starting heartbeat simulation")
        
        while is_running():
            try:
                # Update device state
                self._update_device_state()
                
                # Generate and send heartbeat
                self._send_heartbeat()
                
                # Wait for the next interval
                time.sleep(self.interval)
                
            except Exception as e:
                logger.error(f"Error in heartbeat simulation: {e}", exc_info=True)
                time.sleep(5)  # Wait a bit before retrying
    
    def _update_device_state(self):
        """Update the internal state of the device."""
        # Update uptime
        self.uptime_seconds += self.interval
        
        # Simulate battery level changes
        if self.battery_simulation:
            # Always drain the battery slightly
            self.battery_level -= self.battery_drain_rate
            
            # Potentially charge the battery if solar power is available
            hour = datetime.now().hour
            if 8 <= hour <= 16:  # Daytime hours for solar charging
                self.solar_charging = random.random() < 0.8  # 80% chance of charging during day
                
                if self.solar_charging:
                    self.battery_level += self.charging_rate
            else:
                self.solar_charging = False
            
            # Ensure battery level is within valid range
            self.battery_level = max(0.0, min(100.0, self.battery_level))
        
        # Randomly vary signal strength
        self.signal_strength += random.randint(-5, 5)
        self.signal_strength = max(0, min(100, self.signal_strength))
        
        # Occasionally switch connection type
        if random.random() < 0.02:  # 2% chance
            self.connection_type = random.choice(["WIFI", "CELLULAR", "ETHERNET"])
        
        # Occasionally toggle power status
        if random.random() < 0.01:  # 1% chance
            self.power_status = not self.power_status
        
        # Handle error simulation
        if self.error_countdown > 0:
            self.error_countdown -= 1
            if self.error_countdown == 0:
                logger.info(f"Error condition {self.current_error} resolved")
                self.current_error = None
        elif random.random() < self.error_probability:
            self.current_error = random.choice(list(self.possible_errors.keys()))
            self.error_countdown = self.error_duration
            logger.info(f"Simulating error condition: {self.current_error} - {self.possible_errors[self.current_error]}")
    
    def _send_heartbeat(self):
        """Generate and send a heartbeat message."""
        # Base heartbeat data
        heartbeat_data = {
            "installationId": self.installation_id,
            "deviceId": self.device_id,
            "timestamp": datetime.now().isoformat(),
            "status": "ERROR" if self.current_error else "ONLINE",
            "batteryLevel": round(self.battery_level, 1),
            "signalStrength": self.signal_strength,
            "powerStatus": self.power_status,
            "connectionType": self.connection_type,
            "firmwareVersion": self.firmware_version
        }
        
        # Add diagnostics if enabled
        if self.include_diagnostics:
            diagnostics = {
                "uptime": self.uptime_seconds,
                "memoryUsage": random.randint(20, 80),
                "cpuTemperature": random.uniform(40.0, 70.0),
                "storageRemaining": random.randint(50, 95),
                "solarCharging": self.solar_charging
            }
            
            # Add error information if there's an error
            if self.current_error:
                diagnostics["errorCode"] = self.current_error
                diagnostics["errorDescription"] = self.possible_errors[self.current_error]
                diagnostics["errorTimestamp"] = datetime.now().isoformat()
            
            heartbeat_data["diagnostics"] = diagnostics
        
        # Send the heartbeat
        try:
            # Get authentication headers
            from auth_helper import get_auth_helper
            headers = get_auth_helper().get_auth_headers()
            
            response = requests.post(
                self.heartbeat_endpoint,
                json=heartbeat_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200 or response.status_code == 201:
                logger.debug(f"Heartbeat sent successfully for device {self.device_id}")
            else:
                logger.warning(f"Failed to send heartbeat for device {self.device_id}: "
                             f"{response.status_code} - {response.text}")
        
        except RequestException as e:
            logger.error(f"Error sending heartbeat for device {self.device_id}: {e}")