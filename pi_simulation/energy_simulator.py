#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Energy Data Simulator

Simulates energy generation and consumption data from a solar installation,
including daily patterns, weather effects, and realistic power curves.
"""

import time
import math
import json
import random
import logging
from datetime import datetime
import requests
from requests.exceptions import RequestException

logger = logging.getLogger("EnergySimulator")

class EnergySimulator:
    """Class for simulating energy production and consumption data."""
    
    def __init__(self, installation_id, server_url, base_generation=5000, peak_generation=10000,
                 consumption_min=2000, consumption_max=7000, interval=10, simulate_weather=True):
        """Initialize the energy simulator."""
        self.installation_id = installation_id
        self.server_url = server_url
        self.base_generation = base_generation
        self.peak_generation = peak_generation
        self.consumption_min = consumption_min
        self.consumption_max = consumption_max
        self.interval = interval
        self.simulate_weather = simulate_weather
        
        # Endpoint for sending energy data
        self.energy_endpoint = f"{server_url}/monitoring/readings"
        
        # Initialize state variables
        self.total_yield_kwh = random.uniform(1000, 5000)  # Starting total yield in kWh
        self.daily_yield_kwh = 0.0
        self.last_reset_day = datetime.now().day
        
        # Weather simulation params
        self.weather_condition = "SUNNY"  # Initial condition
        self.weather_change_probability = 0.05  # 5% chance per interval
        self.weather_conditions = {
            "SUNNY": 1.0,       # Full generation
            "PARTLY_CLOUDY": 0.7,  # 70% generation
            "CLOUDY": 0.4,      # 40% generation
            "RAINY": 0.2,       # 20% generation
            "STORMY": 0.1       # 10% generation
        }
        
        logger.info(f"Energy simulator initialized for installation {installation_id}")
    
    def run_simulation(self, is_running):
        """Run the energy data simulation."""
        logger.info("Starting energy data simulation")
        
        while is_running():
            try:
                # Check if we need to reset daily yield (new day)
                now = datetime.now()
                if now.day != self.last_reset_day:
                    logger.info(f"New day: Resetting daily yield. Previous yield: {self.daily_yield_kwh:.2f} kWh")
                    self.daily_yield_kwh = 0.0
                    self.last_reset_day = now.day
                
                # Generate energy data
                energy_data = self._generate_energy_data()
                
                # Send the data
                self._send_energy_data(energy_data)
                
                # Wait for the next interval
                time.sleep(self.interval)
                
            except Exception as e:
                logger.error(f"Error in energy simulation: {e}", exc_info=True)
                time.sleep(5)  # Wait a bit before retrying
    
    def _generate_energy_data(self):
        """Generate realistic energy data based on time of day and simulated weather."""
        now = datetime.now()
        
        # Update weather if simulating weather
        if self.simulate_weather and random.random() < self.weather_change_probability:
            self._update_weather()
        
        # Calculate power generation based on time of day
        # Realistic solar curve (bell-shaped peaking at noon)
        hour = now.hour + now.minute / 60.0  # Decimal hour
        
        # Solar generation - bell curve from sunrise to sunset
        # For April, approximate sunrise at 6AM and sunset at 7PM
        if 6 <= hour <= 19:  # Daylight hours
            # Create a bell curve centered at 1PM (solar noon in April)
            hour_factor = 1.0 - abs(hour - 13.0) / 7.0
            generation_factor = math.sin(hour_factor * math.pi)
            
            # Calculate base generation - more realistic values for a 5.5kW system
            # Peak capacity is typically 80-90% of rated capacity in optimal conditions
            max_realistic_output = self.peak_generation * 0.85  # ~85% of rated peak is realistic
            
            # Base generation calculation with more realistic curve
            power_generation = max_realistic_output * generation_factor
            
            # Apply weather effects if enabled
            if self.simulate_weather:
                weather_factor = self.weather_conditions.get(self.weather_condition, 1.0)
                power_generation *= weather_factor
            
            # Add some random noise to make the curve look more natural
            power_generation *= random.uniform(0.92, 1.08)
            
            # Ensure morning/evening ramp-up/down is more gradual
            if hour < 7:  # Early morning
                power_generation *= (hour - 6) / 1.0  # Gradual ramp-up
            elif hour > 18:  # Evening
                power_generation *= (19 - hour) / 1.0  # Gradual ramp-down
        else:
            # Near-zero generation during night hours (occasional tiny values for sensor noise)
            power_generation = random.uniform(0, 5)  # 0-5 watts representing noise/minimal moonlight
        
        # Calculate consumption - more realistic pattern for a residential home
        # Average home uses 1-2kW as base load, with peaks in morning and evening
        if 5 <= hour < 9:  # Morning peak (getting ready for work/school)
            base_consumption = 3000  # ~3kW
            variation = 800
        elif 17 <= hour < 22:  # Evening peak (dinner, TV, etc.)
            base_consumption = 3500  # ~3.5kW
            variation = 1000
        elif 22 <= hour or hour < 5:  # Night (sleeping)
            base_consumption = 800  # ~0.8kW base load (refrigerator, standby devices)
            variation = 200
        else:  # Daytime (most people at work/school)
            base_consumption = 1200  # ~1.2kW
            variation = 300
        
        # Add randomization to consumption
        power_consumption = base_consumption + random.uniform(-variation, variation)
        
        # Calculate yield in kWh for this interval (power in watts * hours)
        interval_hours = self.interval / 3600.0  # convert seconds to hours
        
        # Increase the daily and total yields
        interval_kwh = (power_generation / 1000.0) * interval_hours
        self.daily_yield_kwh += interval_kwh
        self.total_yield_kwh += interval_kwh
        
        # Generate battery level between 10% and 100%
        # Make battery level correlate with solar production (higher during day)
        if 10 <= hour <= 16:  # Peak solar hours
            battery_level = random.uniform(70.0, 100.0)
        elif (7 <= hour < 10) or (16 < hour <= 19):  # Morning/afternoon
            battery_level = random.uniform(50.0, 85.0)
        else:  # Night
            battery_level = random.uniform(30.0, 60.0)
        
        # Generate voltage around nominal values with small variations
        # 110V in US, 220-240V in most other countries
        voltage = random.uniform(235.0, 245.0)  # Assuming European standard
        
        # Generate current based on power and voltage (P = VI)
        current_amps = power_consumption / voltage if voltage > 0 else 0
        
        # Create the energy data payload
        energy_data = {
            "installationId": self.installation_id,
            "deviceToken": f"SIM-TOKEN-{self.installation_id}",
            "timestamp": now.isoformat(),
            "powerGenerationWatts": round(power_generation, 2),
            "powerConsumptionWatts": round(power_consumption, 2),
            "dailyYieldKWh": round(self.daily_yield_kwh, 3),
            "totalYieldKWh": round(self.total_yield_kwh, 3),
            "batteryLevel": round(battery_level, 1),
            "voltage": round(voltage, 1),
            "currentAmps": round(current_amps, 2),
            "isSimulated": True
        }
        
        if power_generation > 100:  # Only log significant generation
            logger.debug(f"Generated energy data: {energy_data['timestamp']} - Generation: {round(power_generation, 2)}W, Consumption: {round(power_consumption, 2)}W")
        
        return energy_data
    
    def _update_weather(self):
        """Simulate weather changes."""
        # Weights to make transitions more realistic
        current_idx = list(self.weather_conditions.keys()).index(self.weather_condition)
        weights = []
        
        for i, condition in enumerate(self.weather_conditions.keys()):
            # More likely to change to an adjacent weather state
            # Less likely to have extreme changes
            distance = abs(current_idx - i)
            if distance == 0:
                weight = 0.6  # 60% chance to stay the same
            elif distance == 1:
                weight = 0.3  # 30% chance to move one step
            else:
                weight = 0.1 / (len(self.weather_conditions) - 2)  # Remaining probability distributed
            weights.append(weight)
        
        # Normalize weights
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]
        
        # Choose new weather condition
        new_condition = random.choices(
            list(self.weather_conditions.keys()),
            weights=weights,
            k=1
        )[0]
        
        if new_condition != self.weather_condition:
            logger.info(f"Weather changed from {self.weather_condition} to {new_condition}")
            self.weather_condition = new_condition
    
    def _send_energy_data(self, energy_data):
        """Send energy data to the server."""
        try:
            # Get authentication headers
            from auth_helper import get_auth_helper
            headers = get_auth_helper().get_auth_headers()
            
            response = requests.post(
                self.energy_endpoint,
                json=energy_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200 or response.status_code == 201:
                logger.debug(f"Energy data sent successfully: {energy_data['timestamp']}")
            else:
                logger.warning(f"Failed to send energy data: {response.status_code} - {response.text}")
        
        except RequestException as e:
            logger.error(f"Error sending energy data: {e}")