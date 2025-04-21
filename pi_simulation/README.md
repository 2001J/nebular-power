# Solar Installation Simulator for Raspberry Pi

A comprehensive simulation framework for generating realistic solar installation data, device heartbeats, tamper events, and command handling capabilities. This simulator is designed to run on a Raspberry Pi to emulate a real solar installation for testing and demonstration purposes.

## Features

- **Energy Simulation**: Generates realistic energy production and consumption data with daily patterns and weather influences
- **Device Heartbeats**: Simulates device status updates with battery levels, connection status, and diagnostic information
- **Tamper Events**: Generates various tamper scenarios including physical tampering, voltage fluctuations, connection interruptions, and location changes
- **Command Handling**: Listens for and processes commands from the server, with simulated execution time and realistic responses

## Requirements

- Python 3.7+
- Raspberry Pi (recommended) or any computer running Linux/macOS/Windows
- Required Python package:
  - requests

## Installation

1. Clone this repository to your Raspberry Pi or computer
2. Install required packages:
   ```
   pip install requests
   ```
3. Make the main script executable:
   ```
   chmod +x main.py
   ```

## Quick Start

Run the simulator with default settings:
```
python3 main.py
```

This will:
- Start sending energy data to `/monitoring/readings`
- Send device heartbeats to `/api/service/system/device-heartbeat`
- Listen for commands at `/api/service/commands/{installationId}`
- Occasionally generate random tamper events

## Usage Options

### Basic Usage

```
python main.py
```

### With Custom Configuration

```
python main.py -c config.json
```

### Override Server URL

```
python main.py -u http://your-server:8080
```

### Override Installation ID

```
python main.py -i 1234
```

### Override Device ID

```
python main.py -d INVERTER-ABC123
```

### Trigger a Single Tamper Event (Without Starting Simulation)

```
python main.py -t physical
python main.py -t voltage
python main.py -t connection
python main.py -t location
```

## Interactive Mode

When running the simulator, you can use the interactive console to:

- Press `p` to trigger a physical tamper event
- Press `v` to trigger a voltage tamper event
- Press `c` to trigger a connection tamper event 
- Press `l` to trigger a location tamper event
- Press `q` to quit the simulation

This is especially useful during demonstrations to trigger events on demand.

## Configuration

The simulator is highly configurable via a JSON configuration file. A sample `config.json` is provided with the following structure:

```json
{
  "general": {
    "simulation_name": "Raspberry Pi Solar Installation Demo",
    "installation_id": "RPi-DEMO-1234",
    "server_url": "http://localhost:8080",
    "simulation_speed": 1.0
  },
  "energy": {
    "enabled": true,
    "base_generation": 4500,
    "peak_generation": 9000,
    "consumption_min": 1800,
    "consumption_max": 6500,
    "interval": 15,
    "simulate_weather": true
  },
  "heartbeat": {
    "enabled": true,
    "interval": 45,
    "include_diagnostics": true,
    "device_id": "RPi-INVERTER-01",
    "battery_simulation": true
  },
  "tamper": {
    "enabled": true,
    "random_events": true,
    "min_interval": 900,
    "max_interval": 3600,
    "physical_tamper_prob": 0.4,
    "voltage_tamper_prob": 0.3,
    "connection_tamper_prob": 0.2,
    "location_tamper_prob": 0.1
  },
  "command": {
    "enabled": true,
    "polling_interval": 15,
    "success_rate": 0.98
  }
}
```

## Required Backend Endpoints

The simulator expects the following endpoints on your backend server:

### Energy Data
- `POST /monitoring/readings` - Receives energy generation/consumption data

### Device Heartbeats
- `POST /api/service/system/device-heartbeat` - Receives device status updates

### Tamper Events
- `POST /api/security/detection/installations/{id}/simulate/movement` - Physical tamper events
- `POST /api/security/detection/installations/{id}/simulate/voltage` - Voltage tamper events
- `POST /api/security/detection/installations/{id}/simulate/connection` - Connection tamper events
- `POST /api/security/detection/installations/{id}/simulate/location` - Location tamper events

### Commands
- `GET /api/service/commands/{installationId}` - Retrieves pending commands
- `POST /api/service/system/command-response` - Sends command execution responses

## Logging

The simulator logs all activities to both the console and a `simulation.log` file in the same directory. Log level is set to INFO by default.

## Stopping the Simulator

The simulator can be stopped by:
- Pressing `q` in the interactive console
- Pressing Ctrl+C in the terminal
- Sending a SIGTERM signal to the process

## Troubleshooting

- If the simulator can't connect to the server, check that the `server_url` is correct and accessible
- For debugging connection issues, check the `simulation.log` file for detailed error messages
- If a module is not working, try disabling other modules in the config file to isolate the issue
- Make sure your backend has implemented all the required endpoints

## Example Data

### Energy Data Example
```json
{
  "installationId": "RPi-DEMO-1234",
  "timestamp": "2023-03-21T15:30:45.123456",
  "powerGenerationWatts": 4235.75,
  "powerConsumptionWatts": 2850.25,
  "dailyYieldKWh": 12.456,
  "totalYieldKWh": 3456.789,
  "isSimulated": true
}
```

### Heartbeat Data Example
```json
{
  "installationId": "RPi-DEMO-1234",
  "deviceId": "RPi-INVERTER-01",
  "timestamp": "2023-03-21T15:31:00.123456",
  "status": "ONLINE",
  "batteryLevel": 85.5,
  "signalStrength": 92,
  "powerStatus": true,
  "connectionType": "WIFI",
  "firmwareVersion": "v1.2.3",
  "diagnostics": {
    "uptime": 3600,
    "memoryUsage": 42,
    "cpuTemperature": 52.3,
    "storageRemaining": 78,
    "solarCharging": true
  }
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 