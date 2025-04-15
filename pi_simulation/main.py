#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Solar Installation Simulator Main Script

This script coordinates all the simulation modules to create a comprehensive
simulation of a solar installation with real-time data, heartbeats, tamper events,
and command handling capabilities.
"""

import os
import sys
import time
import json
import random
import logging
import argparse
import threading
import signal
from datetime import datetime

# Import simulator modules
from energy_simulator import EnergySimulator
from heartbeat_simulator import HeartbeatSimulator
from tamper_simulator import TamperSimulator
from command_handler import CommandHandler

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('simulation.log')
    ]
)

logger = logging.getLogger("SolarSimulator")

class SolarSimulator:
    """Main simulator class that coordinates all simulation modules."""
    
    def __init__(self, config_file=None):
        """Initialize the solar simulator."""
        self.running = False
        self.threads = []
        
        # Load configuration
        self.config = self._load_config(config_file)
        logger.info(f"Loaded configuration: {self.config['general']['simulation_name']}")
        
        # Initialize simulator components
        self._init_components()
        
        # Flag for signaling threads to stop
        self._stop_event = threading.Event()
        
    def _load_config(self, config_file):
        """Load the configuration from file or use defaults."""
        default_config = {
            "general": {
                "simulation_name": "Solar Installation Simulator",
                "installation_id": "SIM-" + str(random.randint(1000, 9999)),
                "server_url": "http://localhost:8080",
                "simulation_speed": 1.0  # Multiplier for time-based events
            },
            "energy": {
                "enabled": True,
                "base_generation": 5000,  # Base watts generation
                "peak_generation": 10000,  # Peak watts 
                "consumption_min": 2000,   # Min watts consumption
                "consumption_max": 7000,   # Max watts consumption
                "interval": 10,            # Seconds between updates
                "simulate_weather": True   # Whether to simulate weather effects
            },
            "heartbeat": {
                "enabled": True,
                "interval": 30,            # Seconds between heartbeats
                "include_diagnostics": True,
                "device_id": "INVERTER-1", # Main device ID
                "battery_simulation": True # Whether to simulate battery levels
            },
            "tamper": {
                "enabled": True,
                "random_events": True,     # Generate random tamper events
                "min_interval": 1800,      # Min seconds between random events
                "max_interval": 7200,      # Max seconds between random events
                "physical_tamper_prob": 0.3,  # Probability of physical tamper
                "voltage_tamper_prob": 0.3,   # Probability of voltage tamper
                "connection_tamper_prob": 0.3,# Probability of connection tamper
                "location_tamper_prob": 0.1   # Probability of location tamper
            },
            "command": {
                "enabled": True,
                "polling_interval": 10,    # Seconds between command polls
                "success_rate": 0.95       # Command success rate (0.0-1.0)
            }
        }
        
        # If config file is provided, load and merge with defaults
        if config_file and os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    user_config = json.load(f)
                
                # Merge configs (simple recursive update)
                self._update_dict(default_config, user_config)
                logger.info(f"Loaded configuration from {config_file}")
            except Exception as e:
                logger.error(f"Error loading config file: {e}")
                logger.info("Using default configuration")
        else:
            logger.info("No config file provided or file not found. Using default configuration")
            
            # Save default config for reference
            try:
                with open('default_config.json', 'w') as f:
                    json.dump(default_config, f, indent=2)
                logger.info("Saved default configuration to default_config.json")
            except Exception as e:
                logger.warning(f"Could not save default configuration: {e}")
        
        return default_config
    
    def _update_dict(self, d, u):
        """Recursively update a dictionary."""
        for k, v in u.items():
            if isinstance(v, dict) and k in d and isinstance(d[k], dict):
                self._update_dict(d[k], v)
            else:
                d[k] = v
    
    def _init_components(self):
        """Initialize all simulator components."""
        config = self.config
        server_url = config["general"]["server_url"]
        installation_id = config["general"]["installation_id"]
        
        # Initialize Energy Simulator
        if config["energy"]["enabled"]:
            self.energy_simulator = EnergySimulator(
                installation_id=installation_id,
                server_url=server_url,
                base_generation=config["energy"]["base_generation"],
                peak_generation=config["energy"]["peak_generation"],
                consumption_min=config["energy"]["consumption_min"],
                consumption_max=config["energy"]["consumption_max"],
                interval=config["energy"]["interval"],
                simulate_weather=config["energy"]["simulate_weather"]
            )
        else:
            self.energy_simulator = None
            logger.info("Energy simulation disabled")
        
        # Initialize Heartbeat Simulator
        if config["heartbeat"]["enabled"]:
            self.heartbeat_simulator = HeartbeatSimulator(
                installation_id=installation_id,
                server_url=server_url,
                device_id=config["heartbeat"]["device_id"],
                interval=config["heartbeat"]["interval"],
                include_diagnostics=config["heartbeat"]["include_diagnostics"],
                battery_simulation=config["heartbeat"]["battery_simulation"]
            )
        else:
            self.heartbeat_simulator = None
            logger.info("Heartbeat simulation disabled")
        
        # Initialize Tamper Simulator
        if config["tamper"]["enabled"]:
            tamper_config = {
                "random_events": config["tamper"]["random_events"],
                "min_interval": config["tamper"]["min_interval"],
                "max_interval": config["tamper"]["max_interval"],
                "physical_tamper_prob": config["tamper"]["physical_tamper_prob"],
                "voltage_tamper_prob": config["tamper"]["voltage_tamper_prob"],
                "connection_tamper_prob": config["tamper"]["connection_tamper_prob"],
                "location_tamper_prob": config["tamper"]["location_tamper_prob"]
            }
            
            self.tamper_simulator = TamperSimulator(
                installation_id=installation_id,
                server_url=server_url,
                tamper_config=tamper_config
            )
        else:
            self.tamper_simulator = None
            logger.info("Tamper simulation disabled")
        
        # Initialize Command Handler
        if config["command"]["enabled"]:
            self.command_handler = CommandHandler(
                installation_id=installation_id,
                server_url=server_url
            )
            
            # Set command handler parameters
            self.command_handler.polling_interval = config["command"]["polling_interval"]
            self.command_handler.command_success_rate = config["command"]["success_rate"]
        else:
            self.command_handler = None
            logger.info("Command handling disabled")
    
    def start(self):
        """Start all simulation threads."""
        if self.running:
            logger.warning("Simulation already running")
            return
        
        self.running = True
        logger.info(f"Starting simulation: {self.config['general']['simulation_name']}")
        logger.info(f"Installation ID: {self.config['general']['installation_id']}")
        logger.info(f"Server URL: {self.config['general']['server_url']}")
        
        # Clear the stop event
        self._stop_event.clear()
        
        # Function to check if simulation is still running
        is_running = lambda: not self._stop_event.is_set()
        
        # Start energy simulation thread
        if self.energy_simulator:
            energy_thread = threading.Thread(
                target=self.energy_simulator.run_simulation,
                args=(is_running,),
                name="EnergySimulator"
            )
            energy_thread.daemon = True
            energy_thread.start()
            self.threads.append(energy_thread)
            logger.info("Energy simulation started")
        
        # Start heartbeat simulation thread
        if self.heartbeat_simulator:
            heartbeat_thread = threading.Thread(
                target=self.heartbeat_simulator.run_simulation,
                args=(is_running,),
                name="HeartbeatSimulator"
            )
            heartbeat_thread.daemon = True
            heartbeat_thread.start()
            self.threads.append(heartbeat_thread)
            logger.info("Heartbeat simulation started")
        
        # Start tamper simulation thread
        if self.tamper_simulator:
            tamper_thread = threading.Thread(
                target=self.tamper_simulator.run_simulation,
                args=(is_running,),
                name="TamperSimulator"
            )
            tamper_thread.daemon = True
            tamper_thread.start()
            self.threads.append(tamper_thread)
            logger.info("Tamper simulation started")
        
        # Start command handler thread
        if self.command_handler:
            command_thread = threading.Thread(
                target=self.command_handler.listen_for_commands,
                args=(is_running,),
                name="CommandHandler"
            )
            command_thread.daemon = True
            command_thread.start()
            self.threads.append(command_thread)
            logger.info("Command handler started")
        
        logger.info(f"Simulation running with {len(self.threads)} active components")
        
        # Register signal handlers for clean shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def stop(self):
        """Stop all simulation threads."""
        if not self.running:
            logger.warning("Simulation not running")
            return
        
        logger.info("Stopping simulation...")
        
        # Signal threads to stop
        self._stop_event.set()
        
        # Wait for threads to finish (with timeout)
        for thread in self.threads:
            thread.join(timeout=2.0)
            if thread.is_alive():
                logger.warning(f"Thread {thread.name} did not terminate gracefully")
        
        self.threads = []
        self.running = False
        logger.info("Simulation stopped")
    
    def trigger_tamper_event(self, event_type):
        """Manually trigger a tamper event."""
        if not self.tamper_simulator:
            logger.warning("Tamper simulator is not enabled")
            return False
        
        return self.tamper_simulator.trigger_tamper_event(event_type)
    
    def _signal_handler(self, sig, frame):
        """Handle signals for graceful shutdown."""
        logger.info(f"Received signal {sig}, shutting down...")
        self.stop()
        sys.exit(0)

def main():
    """Main function to run the simulator."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Solar Installation Simulator')
    parser.add_argument('-c', '--config', help='Path to configuration file')
    parser.add_argument('-u', '--url', help='Server URL (overrides config file)')
    parser.add_argument('-i', '--installation-id', help='Installation ID (overrides config file)')
    parser.add_argument('-t', '--trigger-tamper', choices=['physical', 'voltage', 'connection', 'location'],
                        help='Trigger a specific tamper event and exit')
    parser.add_argument('-d', '--device-id', help='Device ID for heartbeats (overrides config file)')
    args = parser.parse_args()
    
    # Create the simulator
    simulator = SolarSimulator(config_file=args.config)
    
    # Override config with command line arguments if provided
    if args.url:
        simulator.config["general"]["server_url"] = args.url
        logger.info(f"Overriding server URL with command line argument: {args.url}")
    
    if args.installation_id:
        simulator.config["general"]["installation_id"] = args.installation_id
        logger.info(f"Overriding installation ID with command line argument: {args.installation_id}")
    
    if args.device_id:
        simulator.config["heartbeat"]["device_id"] = args.device_id
        logger.info(f"Overriding device ID with command line argument: {args.device_id}")
    
    # Reinitialize components to apply changes
    simulator._init_components()
    
    # If a tamper event is specified, trigger it and exit
    if args.trigger_tamper:
        logger.info(f"Triggering {args.trigger_tamper} tamper event...")
        success = simulator.trigger_tamper_event(args.trigger_tamper)
        if success:
            logger.info(f"Successfully triggered {args.trigger_tamper} tamper event")
        else:
            logger.error(f"Failed to trigger {args.trigger_tamper} tamper event")
        sys.exit(0 if success else 1)
    
    # Start the simulator
    simulator.start()
    
    # Interactive mode for manual tamper events
    print("\nSolar Installation Simulator is running...")
    print("Press Ctrl+C to stop the simulation")
    print("Enter 'p' to trigger physical tamper, 'v' for voltage, 'c' for connection, 'l' for location, or 'q' to quit")
    
    try:
        # Keep the main thread alive with interactive input
        while simulator.running:
            try:
                user_input = input("> ").lower()
                if user_input == 'q':
                    print("Stopping simulation...")
                    simulator.stop()
                    break
                elif user_input == 'p':
                    print("Triggering physical tamper event...")
                    simulator.trigger_tamper_event("physical")
                elif user_input == 'v':
                    print("Triggering voltage tamper event...")
                    simulator.trigger_tamper_event("voltage")
                elif user_input == 'c':
                    print("Triggering connection tamper event...")
                    simulator.trigger_tamper_event("connection")
                elif user_input == 'l':
                    print("Triggering location tamper event...")
                    simulator.trigger_tamper_event("location")
            except EOFError:
                # Handle EOF (Ctrl+D)
                break
    except KeyboardInterrupt:
        # Handle Ctrl+C
        pass
    finally:
        # Ensure simulation is stopped
        simulator.stop()

if __name__ == "__main__":
    main() 