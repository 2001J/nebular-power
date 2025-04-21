#!/bin/bash

# Run the Pi Simulation for Solar Monitoring System
# This script starts the Python-based simulation that sends realistic energy and security data
# to the solar monitoring backend for a specific installation.

# Set the directory to the pi_simulation folder
cd "$(dirname "$0")/pi_simulation"

echo "Starting Solar Pi Simulation..."
echo "Using configuration from config.json"
echo "Press Ctrl+C to stop the simulation"
echo ""

# Start the simulation
python3 main.py -c config.json

# Exit message in case the simulation is terminated
echo ""
echo "Simulation stopped."