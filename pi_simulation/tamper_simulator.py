#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Tamper Event Simulator

Simulates various tampering events for solar panels, including:
- Physical movement/vibration detection
- Voltage fluctuations
- Connection interruptions
- Location changes
"""

import time
import json
import logging
import random
from datetime import datetime
import requests
from requests.exceptions import RequestException

logger = logging.getLogger("TamperSimulator")

class TamperSimulator:
    """Class for simulating tamper events on solar installations."""
    
    def __init__(self, installation_id, server_url, tamper_config=None):
        """Initialize the tamper simulator."""
        self.installation_id = installation_id
        self.server_url = server_url
        self.tamper_config = tamper_config or {}
        
        # Configuration for random events
        self.random_events = self.tamper_config.get("random_events", True)
        self.min_interval = self.tamper_config.get("min_interval", 1800)  # 30 minutes
        self.max_interval = self.tamper_config.get("max_interval", 7200)  # 2 hours
        
        # Probability of each event type (must sum to 1.0)
        self.physical_tamper_prob = self.tamper_config.get("physical_tamper_prob", 0.3)
        self.voltage_tamper_prob = self.tamper_config.get("voltage_tamper_prob", 0.3)
        self.connection_tamper_prob = self.tamper_config.get("connection_tamper_prob", 0.3)
        self.location_tamper_prob = self.tamper_config.get("location_tamper_prob", 0.1)
        
        # Normalize probabilities if they don't sum to 1.0
        total_prob = self.physical_tamper_prob + self.voltage_tamper_prob + \
                     self.connection_tamper_prob + self.location_tamper_prob
        if total_prob != 1.0:
            self.physical_tamper_prob /= total_prob
            self.voltage_tamper_prob /= total_prob
            self.connection_tamper_prob /= total_prob
            self.location_tamper_prob /= total_prob
        
        # Map of event types to their endpoint and parameters
        self.event_types = {
            "physical": {
                "endpoint": f"/api/security/detection/installations/{installation_id}/simulate/movement",
                "params": {
                    "movementValue": lambda: random.uniform(0.5, 10.0),  # g-force (acceleration)
                }
            },
            "voltage": {
                "endpoint": f"/api/security/detection/installations/{installation_id}/simulate/voltage",
                "params": {
                    "voltageValue": lambda: random.choice([
                        random.uniform(60, 170),  # undervoltage or overvoltage
                        random.uniform(350, 450)  # severe overvoltage
                    ]),
                }
            },
            "connection": {
                "endpoint": f"/api/security/detection/installations/{installation_id}/simulate/connection",
                "params": {
                    "connected": lambda: False,  # Always disconnected for a tamper event
                }
            },
            "location": {
                "endpoint": f"/api/security/detection/installations/{installation_id}/simulate/location",
                "params": {
                    "newLocation": lambda: f"{random.uniform(-90, 90):.6f},{random.uniform(-180, 180):.6f}",
                    "previousLocation": lambda: f"{random.uniform(-90, 90):.6f},{random.uniform(-180, 180):.6f}",
                }
            }
        }
        
        logger.info(f"Tamper simulator initialized for installation {installation_id}")
    
    def run_simulation(self, is_running):
        """Run the tamper event simulation."""
        logger.info("Starting tamper event simulation")
        
        last_event_time = time.time()
        
        while is_running():
            current_time = time.time()
            elapsed = current_time - last_event_time
            
            # Check if it's time for a random event
            if self.random_events and elapsed > self.min_interval:
                # Determine if an event should be triggered based on elapsed time
                max_probability = min(1.0, (elapsed - self.min_interval) / (self.max_interval - self.min_interval))
                
                if random.random() < max_probability:
                    # Choose an event type based on probabilities
                    r = random.random()
                    
                    if r < self.physical_tamper_prob:
                        event_type = "physical"
                    elif r < self.physical_tamper_prob + self.voltage_tamper_prob:
                        event_type = "voltage"
                    elif r < self.physical_tamper_prob + self.voltage_tamper_prob + self.connection_tamper_prob:
                        event_type = "connection"
                    else:
                        event_type = "location"
                    
                    # Trigger the event
                    self.trigger_tamper_event(event_type)
                    last_event_time = time.time()
            
            # Sleep to avoid high CPU usage
            time.sleep(5)
    
    def trigger_tamper_event(self, event_type):
        """Trigger a tamper event of the specified type."""
        if event_type not in self.event_types:
            logger.error(f"Unknown tamper event type: {event_type}")
            return False
        
        event_info = self.event_types[event_type]
        endpoint = event_info["endpoint"]
        full_url = f"{self.server_url}{endpoint}"
        
        # Generate parameter values
        params = {}
        for param_name, param_generator in event_info["params"].items():
            params[param_name] = param_generator()
        
        # Generate raw sensor data
        raw_data = self._generate_raw_data(event_type, params)
        if raw_data:
            params["rawData"] = json.dumps(raw_data)
        
        logger.info(f"Triggering {event_type} tamper event: {params}")
        
        try:
            # Get authentication headers
            from auth_helper import get_auth_helper
            headers = get_auth_helper().get_auth_headers()
            
            response = requests.post(full_url, params=params, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"Successfully sent {event_type} tamper event. Response: {response.json()}")
                return True
            else:
                logger.error(f"Failed to send {event_type} tamper event. Status: {response.status_code}, "
                           f"Response: {response.text}")
                return False
        
        except RequestException as e:
            logger.error(f"Error sending {event_type} tamper event: {e}")
            return False
    
    def _generate_raw_data(self, event_type, params):
        """Generate raw sensor data for the tamper event."""
        timestamp = datetime.now().isoformat()
        
        if event_type == "physical":
            # Generate accelerometer data
            movement_value = params["movementValue"]
            return {
                "timestamp": timestamp,
                "sensor": "accelerometer",
                "x": movement_value * random.uniform(0.7, 1.3),
                "y": movement_value * random.uniform(0.7, 1.3),
                "z": movement_value * random.uniform(0.7, 1.3),
                "vectorMagnitude": movement_value,
                "normalThreshold": 0.5,
                "sampleRate": "100Hz",
                "deviceOrientation": random.choice(["horizontal", "vertical", "tilted"]),
                "vibrationDuration": random.uniform(0.5, 3.0)
            }
        
        elif event_type == "voltage":
            # Generate voltage data
            voltage_value = params["voltageValue"]
            return {
                "timestamp": timestamp,
                "sensor": "voltmeter",
                "voltage": voltage_value,
                "normalRange": {"min": 180, "max": 280},
                "readingHistory": [
                    voltage_value * random.uniform(0.95, 1.05) for _ in range(5)
                ],
                "sampleRate": "10Hz",
                "voltageThreshold": {"low": 180, "high": 280},
                "powerMode": random.choice(["grid", "battery"]),
                "unitOfMeasure": "V"
            }
        
        elif event_type == "connection":
            # Generate connection data
            return {
                "timestamp": timestamp,
                "sensor": "connectionMonitor",
                "connected": False,
                "lastConnectedTime": (datetime.now().timestamp() - random.uniform(10, 300)) * 1000,
                "connectionType": random.choice(["WiFi", "Cellular", "Ethernet"]),
                "signalStrength": random.randint(0, 20),
                "disconnectReason": random.choice([
                    "SIGNAL_LOSS", "UNAUTHORIZED_DISCONNECT", "POWER_FAILURE",
                    "NETWORK_TIMEOUT", "MANUAL_DISCONNECT"
                ]),
                "attemptedReconnects": random.randint(0, 5)
            }
        
        elif event_type == "location":
            # Generate location data
            new_location = params["newLocation"]
            previous_location = params["previousLocation"]
            return {
                "timestamp": timestamp,
                "sensor": "gps",
                "currentLocation": new_location,
                "previousLocation": previous_location,
                "accuracy": random.uniform(1.0, 5.0),
                "altitude": random.uniform(0, 500),
                "speed": random.uniform(0, 10),
                "heading": random.uniform(0, 360),
                "locationSource": random.choice(["GPS", "NETWORK", "CELL_TOWER"]),
                "distanceMoved": random.uniform(10, 1000)
            }
        
        return None