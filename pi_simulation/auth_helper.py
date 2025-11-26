#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Authentication Helper for Pi Simulation

Handles authentication with the Solar Monitoring backend, including
JWT token acquisition, storage, and renewal.
"""

import json
import time
import logging
import threading
import requests
from requests.exceptions import RequestException

logger = logging.getLogger("AuthHelper")

class AuthHelper:
    """Helper class for handling authentication with the Solar Monitoring backend."""
    
    def __init__(self, auth_config, server_url=None):
        """Initialize the authentication helper."""
        self.enabled = auth_config.get("enabled", False)
        self.type = auth_config.get("type", "jwt")
        self.username = auth_config.get("username", "")
        self.password = auth_config.get("password", "")
        self.token = auth_config.get("token", "")
        
        # Auto-build token_url from server_url if not explicitly provided
        self.token_url = auth_config.get("token_url", "")
        if not self.token_url and server_url:
            self.token_url = f"{server_url.rstrip('/')}/api/auth/login"
        
        # Token expiration management
        self.token_expiry = 0  # Unix timestamp
        self.token_lock = threading.Lock()
        
        # Try to authenticate on startup if enabled
        if self.enabled and not self.token and self.username and self.password:
            self.authenticate()
    
    def authenticate(self):
        """Authenticate with the server and get a JWT token."""
        if not self.enabled:
            return True
        
        if not self.token_url:
            logger.error("Token URL is not configured. Cannot authenticate.")
            return False
        
        with self.token_lock:
            try:
                logger.info(f"Authenticating user {self.username} with server...")
                
                # Prepare login payload
                payload = {
                    "email": self.username,  # Using username field as email
                    "password": self.password
                }
                
                # Make login request
                response = requests.post(
                    self.token_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=5  # Reduced from 10 seconds
                )
                
                if response.status_code == 200:
                    # Parse response to get token
                    response_data = response.json()
                    
                    # Look for token in various formats
                    if "token" in response_data:
                        self.token = response_data["token"]
                    elif "access_token" in response_data:
                        self.token = response_data["access_token"]
                    elif "accessToken" in response_data:
                        self.token = response_data["accessToken"]
                    elif "data" in response_data and "token" in response_data["data"]:
                        self.token = response_data["data"]["token"]
                    else:
                        logger.error(f"Unexpected response format: {response_data}")
                        return False
                    
                    logger.info("Authentication successful. Token acquired.")
                    
                    # Set token expiry (default: 1 hour)
                    expiry_seconds = response_data.get("expiresIn", 3600)
                    self.token_expiry = time.time() + expiry_seconds
                    
                    return True
                else:
                    logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                    return False
                
            except RequestException as e:
                logger.error(f"Error during authentication: {e}")
                return False
    
    def get_auth_headers(self):
        """Get headers with authentication token if enabled."""
        headers = {"Content-Type": "application/json"}
        
        if not self.enabled:
            return headers
        
        # Check if token needs to be refreshed
        current_time = time.time()
        if current_time > self.token_expiry - 300:  # Refresh 5 minutes before expiry
            # Try to acquire lock without blocking to avoid thread contention
            if self.token_lock.acquire(blocking=False):
                try:
                    # Re-check after acquiring lock (another thread might have refreshed)
                    if current_time > self.token_expiry - 300:
                        logger.info("Token expired or expiring soon, refreshing...")
                        self.authenticate()
                finally:
                    self.token_lock.release()
            else:
                # Another thread is refreshing, just use current token
                logger.debug("Token refresh in progress by another thread, using current token")
        
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        return headers

# Singleton instance
_auth_helper = None

def init_auth_helper(config):
    """Initialize the global auth helper instance."""
    global _auth_helper
    
    general_config = config.get("general", {})
    auth_config = general_config.get("auth", {})
    server_url = general_config.get("server_url", "")
    _auth_helper = AuthHelper(auth_config, server_url)
    
    return _auth_helper

def get_auth_helper():
    """Get the global auth helper instance."""
    if _auth_helper is None:
        raise RuntimeError("Auth helper not initialized. Call init_auth_helper first.")
    
    return _auth_helper