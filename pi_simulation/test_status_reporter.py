#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Unit tests for status_reporter.py module
"""

import unittest
from unittest.mock import Mock, patch, MagicMock, call
import time
import json
from datetime import datetime
from status_reporter import StatusReporter


class TestStatusReporter(unittest.TestCase):
    """Test cases for StatusReporter class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.installation_id = "TEST-001"
        self.server_url = "http://localhost:8080"
        
        # Mock command handler
        self.mock_command_handler = Mock()
        self.mock_command_handler.service_state = {
            "installation_id": self.installation_id,
            "status": "ACTIVE",
            "reason": "Test reason",
            "last_updated": datetime.now().isoformat(),
            "last_command_id": 123
        }
        
        self.status_reporter = StatusReporter(
            self.installation_id,
            self.server_url,
            self.mock_command_handler
        )
    
    def test_initialization(self):
        """Test StatusReporter initialization"""
        self.assertEqual(self.status_reporter.installation_id, self.installation_id)
        self.assertEqual(self.status_reporter.server_url, self.server_url)
        self.assertEqual(self.status_reporter.command_handler, self.mock_command_handler)
        self.assertEqual(self.status_reporter.report_interval, 30)
        self.assertIsNone(self.status_reporter.last_reported_status)
    
    @patch('status_reporter.requests.post')
    @patch('status_reporter.get_auth_helper')
    def test_report_status_success(self, mock_auth_helper, mock_post):
        """Test successful status report"""
        # Setup
        mock_auth = Mock()
        mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer token"}
        mock_auth_helper.return_value = mock_auth
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # Execute
        self.status_reporter._report_status()
        
        # Verify
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        # Check endpoint
        self.assertEqual(
            call_args[0][0],
            f"{self.server_url}/api/service/status/device-report"
        )
        
        # Check payload
        payload = call_args[1]['json']
        self.assertEqual(payload['installationId'], self.installation_id)
        self.assertEqual(payload['status'], 'ACTIVE')
        self.assertEqual(payload['reason'], 'Test reason')
        self.assertEqual(payload['lastCommandId'], 123)
    
    @patch('status_reporter.requests.post')
    @patch('status_reporter.get_auth_helper')
    def test_report_status_with_device_health(self, mock_auth_helper, mock_post):
        """Test status report includes device health"""
        # Setup
        mock_auth = Mock()
        mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer token"}
        mock_auth_helper.return_value = mock_auth
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # Execute
        self.status_reporter._report_status()
        
        # Verify device health is included
        payload = mock_post.call_args[1]['json']
        self.assertIn('deviceHealth', payload)
        device_health = payload['deviceHealth']
        
        # Check health metrics exist
        self.assertIn('timestamp', device_health)
        self.assertIn('uptime', device_health)
    
    def test_should_report_status_changed(self):
        """Test reporting when status changes"""
        # First report - should always report
        self.assertTrue(self.status_reporter._should_report())
        
        # Update last reported status
        self.status_reporter.last_reported_status = "ACTIVE"
        self.status_reporter.report_count = 5
        
        # Same status - should not report
        self.assertFalse(self.status_reporter._should_report())
        
        # Change status - should report
        self.mock_command_handler.service_state["status"] = "SUSPENDED_MAINTENANCE"
        self.assertTrue(self.status_reporter._should_report())
    
    def test_should_report_force_interval(self):
        """Test forced reporting after interval"""
        # Setup
        self.status_reporter.last_reported_status = "ACTIVE"
        self.status_reporter.report_count = 9  # Just before force report
        self.status_reporter.force_report_count = 10
        
        # Should not force report yet
        self.assertFalse(self.status_reporter._should_report())
        
        # Increment to force report count
        self.status_reporter.report_count = 10
        
        # Should force report
        self.assertTrue(self.status_reporter._should_report())
    
    @patch('status_reporter.requests.post')
    @patch('status_reporter.get_auth_helper')
    def test_report_immediate(self, mock_auth_helper, mock_post):
        """Test immediate reporting"""
        # Setup
        mock_auth = Mock()
        mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer token"}
        mock_auth_helper.return_value = mock_auth
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        # Execute
        self.status_reporter.report_immediate("SUSPENDED_PAYMENT", "Payment overdue")
        
        # Verify
        mock_post.assert_called_once()
        payload = mock_post.call_args[1]['json']
        self.assertEqual(payload['status'], 'SUSPENDED_PAYMENT')
        self.assertEqual(payload['reason'], 'Payment overdue')
    
    @patch('status_reporter.requests.post')
    @patch('status_reporter.get_auth_helper')
    def test_report_status_network_error(self, mock_auth_helper, mock_post):
        """Test handling of network errors"""
        # Setup
        mock_auth = Mock()
        mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer token"}
        mock_auth_helper.return_value = mock_auth
        
        mock_post.side_effect = Exception("Network error")
        
        # Execute - should not raise exception
        try:
            self.status_reporter._report_status()
        except Exception:
            self.fail("_report_status should handle exceptions gracefully")
    
    @patch('status_reporter.requests.post')
    @patch('status_reporter.get_auth_helper')
    def test_report_status_server_error(self, mock_auth_helper, mock_post):
        """Test handling of server errors"""
        # Setup
        mock_auth = Mock()
        mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer token"}
        mock_auth_helper.return_value = mock_auth
        
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response
        
        # Execute - should log warning but not raise
        try:
            self.status_reporter._report_status()
        except Exception:
            self.fail("_report_status should handle server errors gracefully")
    
    def test_get_device_health(self):
        """Test device health collection"""
        device_health = self.status_reporter._get_device_health()
        
        # Verify required fields
        self.assertIn('timestamp', device_health)
        self.assertIn('uptime', device_health)
        
        # Verify types
        self.assertIsInstance(device_health['timestamp'], str)
        self.assertIsInstance(device_health['uptime'], (int, float))


class TestStatusReporterIntegration(unittest.TestCase):
    """Integration tests for StatusReporter"""
    
    @patch('status_reporter.requests.post')
    @patch('status_reporter.get_auth_helper')
    @patch('time.sleep')
    def test_run_simulation_reports_periodically(self, mock_sleep, mock_auth_helper, mock_post):
        """Test that run_simulation reports status periodically"""
        # Setup
        mock_auth = Mock()
        mock_auth.get_auth_headers.return_value = {"Authorization": "Bearer token"}
        mock_auth_helper.return_value = mock_auth
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        mock_command_handler = Mock()
        mock_command_handler.service_state = {
            "installation_id": "TEST-001",
            "status": "ACTIVE",
            "reason": "Normal operation",
            "last_updated": datetime.now().isoformat()
        }
        
        status_reporter = StatusReporter(
            "TEST-001",
            "http://localhost:8080",
            mock_command_handler
        )
        status_reporter.report_interval = 1  # Fast testing
        
        # Run for short duration
        call_count = 0
        def mock_sleep_fn(seconds):
            nonlocal call_count
            call_count += 1
            if call_count >= 3:  # Stop after 3 iterations
                raise KeyboardInterrupt()
        
        mock_sleep.side_effect = mock_sleep_fn
        
        # Execute
        is_running = lambda: True
        try:
            status_reporter.run_simulation(is_running)
        except KeyboardInterrupt:
            pass
        
        # Verify reports were sent
        self.assertGreaterEqual(mock_post.call_count, 1)


if __name__ == '__main__':
    unittest.main()
