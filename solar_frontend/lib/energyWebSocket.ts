"use client"

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Configuration for WebSocket behavior
const WS_CONFIG = {
  // How long to wait before attempting to reconnect (starts at min, increases with backoff)
  reconnectTimeMin: 1000, // 1 second
  reconnectTimeMax: 15000, // 15 seconds
  // Backoff multiplier - each reconnection attempt will wait longer
  backoffMultiplier: 1.3,
  // Maximum number of reconnection attempts before giving up
  maxReconnectAttempts: 5,
  // Heartbeat interval to check connection status (ms)
  heartbeatInterval: 30000, // 30 seconds
  // Debug mode (set to false in production)
  debug: process.env.NODE_ENV === 'development'
};

/**
 * Create a STOMP client for reliable WebSocket communication
 * with properly authenticated SockJS transport
 */
const createStompClient = (onConnect?: () => void, onDisconnect?: () => void) => {
  // Only create client in browser environment
  if (typeof window === 'undefined') return null;

  // Get the authentication token from localStorage or sessionStorage
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem("token") || sessionStorage.getItem("token") 
    : null;

  if (!token) {
    console.warn('No authentication token found for WebSocket connection');
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';
  
  console.log(`Connecting to WebSocket at ${wsUrl}/ws with auth token: ${token ? 'Present' : 'Not found'}`);
  
  // Create custom SockJS instance with authentication
  const createWebSocket = () => {
    let wsEndpoint = `${wsUrl}/ws`;
    
    // Using SockJS without query parameters for the initial connection
    console.log(`Creating SockJS connection to: ${wsEndpoint}`);
    
    // Create SockJS instance
    const socket = new SockJS(wsEndpoint, null, {
      transports: ['websocket', 'xhr-polling'],
      timeout: 10000 // Increase timeout for slower networks
    });
    
    // Add debug listeners
    socket.onopen = () => {
      console.log('SockJS transport connection opened');
    };
    
    socket.onerror = (error) => {
      console.error('SockJS transport error:', error);
    };
    
    socket.onclose = (event) => {
      console.log(`SockJS transport closed with code ${event.code}, reason: ${event.reason}`);
    };
    
    return socket;
  };
  
  // Create STOMP client with custom sockjs and auth headers
  const client = new Client({
    // Custom websocket factory
    webSocketFactory: createWebSocket,
    
    // Connection headers for STOMP protocol - use the token here
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    
    // Debug settings
    debug: WS_CONFIG.debug ? console.log : () => {},
    
    // Reconnection settings
    reconnectDelay: WS_CONFIG.reconnectTimeMin,
    heartbeatIncoming: WS_CONFIG.heartbeatInterval,
    heartbeatOutgoing: WS_CONFIG.heartbeatInterval
  });

  // Connection established
  client.onConnect = (frame) => {
    console.log('STOMP connection established successfully!', frame);
    if (onConnect) onConnect();
  };

  // Connection error
  client.onStompError = (frame) => {
    console.error('STOMP protocol error:', frame.headers, frame.body);
  };

  // Connection lost
  client.onWebSocketClose = (event) => {
    console.log(`WebSocket connection closed: code=${event.code}, reason=${event.reason}`);
    if (onDisconnect) onDisconnect();
  };

  return client;
};

export const energyWebSocket = {
  /**
   * Create a system-wide energy monitoring connection for admins
   */
  createSystemMonitor: (
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) => {
    try {
      // Create STOMP client
      const client = createStompClient(onConnected, onDisconnected);
      if (!client) return { close: () => {}, isConnected: () => false };
      
      // Subscribe to the admin system update topic
      client.onConnect = () => {
        // Subscribe to admin system-wide updates
        client.subscribe('/topic/admin/system-update', (message) => {
          try {
            const data = JSON.parse(message.body);
            onMessage(data);
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
            if (onError) onError(error);
          }
        });
        
        // Notify connected callback
        if (onConnected) onConnected();
      };

      // Activate the client
      client.activate();

      // Return interface for controlling the connection
      return {
        close: () => {
          client.deactivate();
        },
        isConnected: () => client.connected,
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      if (onError) onError(error);
      return {
        close: () => {},
        isConnected: () => false,
      };
    }
  },

  /**
   * Create an installation-specific monitoring connection
   */
  createInstallationMonitor: (
    installationId: string,
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) => {
    try {
      // Create STOMP client
      const client = createStompClient(onConnected, onDisconnected);
      if (!client) return { close: () => {}, isConnected: () => false };
      
      // Subscribe to the specific installation's topics
      client.onConnect = () => {
        // Energy data updates
        client.subscribe(`/topic/installation/${installationId}/energy-data`, (message) => {
          try {
            const data = JSON.parse(message.body);
            onMessage({ type: 'energy-data', data });
          } catch (error) {
            console.error('Error processing energy data message:', error);
            if (onError) onError(error);
          }
        });
        
        // Status updates
        client.subscribe(`/topic/installation/${installationId}/status`, (message) => {
          try {
            const data = JSON.parse(message.body);
            onMessage({ type: 'status', data });
          } catch (error) {
            console.error('Error processing status message:', error);
            if (onError) onError(error);
          }
        });
        
        // Tamper alerts
        client.subscribe(`/topic/installation/${installationId}/tamper-alert`, (message) => {
          try {
            const data = JSON.parse(message.body);
            onMessage({ type: 'tamper-alert', data });
          } catch (error) {
            console.error('Error processing tamper alert message:', error);
            if (onError) onError(error);
          }
        });
        
        // Notify connected callback
        if (onConnected) onConnected();
      };

      // Activate the client
      client.activate();

      // Return interface for controlling the connection
      return {
        close: () => {
          client.deactivate();
        },
        isConnected: () => client.connected,
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      if (onError) onError(error);
      return {
        close: () => {},
        isConnected: () => false,
      };
    }
  },

  /**
   * Create a security alerts monitoring connection
   */
  createAlertsMonitor: (
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) => {
    try {
      // Create STOMP client
      const client = createStompClient(onConnected, onDisconnected);
      if (!client) return { close: () => {}, isConnected: () => false };
      
      // Subscribe to the admin tamper alerts topic
      client.onConnect = () => {
        client.subscribe('/topic/admin/tamper-alerts', (message) => {
          try {
            const data = JSON.parse(message.body);
            onMessage(data);
          } catch (error) {
            console.error('Error processing tamper alert message:', error);
            if (onError) onError(error);
          }
        });
        
        // Notify connected callback
        if (onConnected) onConnected();
      };

      // Activate the client
      client.activate();

      // Return interface for controlling the connection
      return {
        close: () => {
          client.deactivate();
        },
        isConnected: () => client.connected,
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      if (onError) onError(error);
      return {
        close: () => {},
        isConnected: () => false,
      };
    }
  }
};