#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Status Reporter Module

This module periodically reports the current service status of the installation
back to the server, ensuring the backend stays synchronized with the device state.
"""

import time
import json
import logging
from datetime import datetime
import requests
from requests.exceptions import RequestException

logger = logging.getLogger("StatusReporter")

def get_auth_helper():
    """Get the authentication helper instance (for test mocking)."""
    from auth_helper import get_auth_helper as _get_auth_helper
    return _get_auth_helper()

class StatusReporter:
    """Class for reporting service status to the backend."""
    
    def __init__(self, installation_id, server_url, command_handler):
        """Initialize the status reporter."""
        self.installation_id = installation_id
        self.server_url = server_url
        self.command_handler = command_handler
        
        # Status reporting interval (in seconds)
        self.interval = 30  # Report every 30 seconds
        self.report_interval = self.interval  # Alias for tests
        
        # Endpoint for status reports
        self.report_endpoint = f"{server_url}/api/service/status/device-report"
        
        # Track last reported status to avoid redundant reports
        self.last_reported_status = None
        self.last_reported_time = None
        
        # Force report every N intervals even if status unchanged
        self.force_report_after = 10  # Force report every 10 intervals (5 minutes)
        self.intervals_since_report = 0
        
        # Alternative naming for tests
        self.report_count = 0
        self.force_report_count = 10
        
        logger.info(f"Status reporter initialized for installation {installation_id}")
    
    def run_simulation(self, is_running):
        """Continuously report status to the server."""
        logger.info("Starting status reporter")
        
        # Send initial status report immediately
        self._report_current_status(force=True)
        
        while is_running():
            try:
                # Get current service status from command handler
                self._report_current_status()
                
                # Wait for next reporting interval with interruptible sleep
                sleep_remaining = self.interval
                while sleep_remaining > 0 and is_running():
                    sleep_time = min(0.5, sleep_remaining)
                    time.sleep(sleep_time)
                    sleep_remaining -= sleep_time
                
            except Exception as e:
                logger.error(f"Error in status reporting: {e}", exc_info=True)
                # Interruptible error recovery sleep
                for _ in range(10):  # 5 seconds total
                    if not is_running():
                        break
                    time.sleep(0.5)
        
        logger.info("Status reporter stopped gracefully")
    
    def _should_report(self):
        """Check if status should be reported based on changes and intervals."""
        service_state = self.command_handler.service_state
        current_status = service_state.get("status", "UNKNOWN")
        
        # Status changed
        if current_status != self.last_reported_status:
            return True
        
        # Force report after interval (use both naming conventions)
        if self.intervals_since_report >= self.force_report_after:
            return True
        if self.report_count >= self.force_report_count:
            return True
        
        return False
    
    def _report_status(self):
        """Report the current status to the backend (test-compatible method)."""
        self._report_current_status(force=True)
    
    def _report_current_status(self, force=False):
        """Report the current status to the backend."""
        try:
            # Get current service state from command handler
            service_state = self.command_handler.service_state
            current_status = service_state.get("status", "UNKNOWN")
            status_reason = service_state.get("reason", "")
            
            # Check if status has changed or force report
            self.intervals_since_report += 1
            self.report_count += 1
            
            if not force and not self._should_report():
                logger.debug(f"Status unchanged ({current_status}), skipping report")
                return
            
            # Prepare status report payload
            report_data = {
                "installationId": self.installation_id,
                "status": current_status,
                "reason": status_reason,
                "timestamp": datetime.now().isoformat(),
                "lastCommandId": service_state.get("last_command_id"),
                "deviceHealth": self._get_device_health()
            }
            
            # Get authentication headers
            auth_helper = get_auth_helper()
            headers = auth_helper.get_auth_headers()
            headers["Content-Type"] = "application/json"
            
            # Send status report with retry logic
            max_retries = 2
            timeout = 5  # Reduced from 10 seconds
            
            for attempt in range(max_retries):
                try:
                    response = requests.post(
                        self.report_endpoint,
                        json=report_data,
                        headers=headers,
                        timeout=timeout
                    )
                    
                    if response.status_code == 200 or response.status_code == 201:
                        logger.info(f"Status reported successfully: {current_status} - {status_reason}")
                        self.last_reported_status = current_status
                        self.last_reported_time = datetime.now()
                        self.intervals_since_report = 0
                        self.report_count = 0
                        return  # Success, exit retry loop
                    else:
                        logger.warning(f"Failed to report status: {response.status_code} - {response.text}")
                        if attempt < max_retries - 1:
                            time.sleep(1)
                
                except requests.Timeout:
                    logger.warning(f"Status report timeout (attempt {attempt + 1}/{max_retries})")
                    if attempt == max_retries - 1:
                        logger.error("Status report failed after all retries")
                except RequestException as e:
                    logger.error(f"Error reporting status: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(1)
                    break
        
        except Exception as e:
            logger.error(f"Unexpected error in status reporting: {e}", exc_info=True)
    
    def _get_device_health(self):
        """Get basic device health information."""
        import os
        try:
            # Try to get system uptime (works on Unix systems)
            with open('/proc/uptime', 'r') as f:
                uptime_seconds = float(f.readline().split()[0])
        except:
            # Fallback for non-Unix systems or if file not available
            uptime_seconds = time.time() - getattr(self, '_start_time', time.time())
            if not hasattr(self, '_start_time'):
                self._start_time = time.time()
        
        return {
            "online": True,
            "lastHeartbeat": datetime.now().isoformat(),
            "communicationStatus": "CONNECTED",
            "timestamp": datetime.now().isoformat(),
            "uptime": uptime_seconds
        }
    
    def report_immediate(self, status, reason):
        """Force an immediate status report (used for critical changes)."""
        logger.info(f"Forcing immediate status report: {status} - {reason}")
        
        # Update command handler state if needed
        self.command_handler.service_state["status"] = status
        self.command_handler.service_state["reason"] = reason
        self.command_handler.service_state["last_updated"] = datetime.now().isoformat()
        self.command_handler._save_service_state()
        
        # Send immediate report
        self._report_current_status(force=True)
