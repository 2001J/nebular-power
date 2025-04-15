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
        
        # Solar generation - bell curve from 6AM to 6PM
        if 6 <= hour <= 18:
            # Create a bell curve centered at noon (12)
            hour_factor = 1.0 - abs(hour - 12.0) / 6.0
            generation_factor = math.sin(hour_factor * math.pi)
            
            # Base generation calculation
            power_generation = self.base_generation + (
                (self.peak_generation - self.base_generation) * generation_factor
            )
            
            # Apply weather effects if enabled
            if self.simulate_weather:
                weather_factor = self.weather_conditions.get(self.weather_condition, 1.0)
                power_generation *= weather_factor
            
            # Add some random noise to make the curve look more natural
            power_generation *= random.uniform(0.95, 1.05)
        else:
            # Minimal generation during night hours (could be zero, but setting to a small value)
            power_generation = random.uniform(0, self.base_generation * 0.01)
        
        # Calculate consumption - more in the morning and evening, less during the day
        if hour < 7 or hour > 20:  # Night: low consumption
            base_consumption = self.consumption_min * 0.8
            variation = self.consumption_min * 0.4
        elif 7 <= hour < 9 or 17 <= hour <= 20:  # Morning/evening peaks
            base_consumption = self.consumption_max * 0.9
            variation = self.consumption_max * 0.2
        else:  # Daytime: medium consumption
            base_consumption = (self.consumption_min + self.consumption_max) / 2
            variation = self.consumption_min * 0.3
        
        power_consumption = base_consumption + random.uniform(-variation, variation)
        
        # Calculate yield in kWh for this interval (power in watts * hours)
        interval_hours = self.interval / 3600.0  # convert seconds to hours
        
        # Increase the daily and total yields
        interval_kwh = (power_generation / 1000.0) * interval_hours
        self.daily_yield_kwh += interval_kwh
        self.total_yield_kwh += interval_kwh
        
        # Create the energy data payload
        energy_data = {
            "installationId": self.installation_id,
            "timestamp": now.isoformat(),
            "powerGenerationWatts": round(power_generation, 2),
            "powerConsumptionWatts": round(power_consumption, 2),
            "dailyYieldKWh": round(self.daily_yield_kwh, 3),
            "totalYieldKWh": round(self.total_yield_kwh, 3),
            "isSimulated": True
        }
        
        logger.debug(f"Generated energy data: {energy_data}")
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
            headers = {"Content-Type": "application/json"}
            
            response = requests.post(
                self.energy_endpoint,
                json=energy_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.debug(f"Energy data sent successfully: {energy_data['timestamp']}")
            else:
                logger.warning(f"Failed to send energy data: {response.status_code} - {response.text}")
        
        except RequestException as e:
            logger.error(f"Error sending energy data: {e}") 