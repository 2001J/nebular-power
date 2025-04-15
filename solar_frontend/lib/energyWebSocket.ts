// WebSocket utility for energy monitoring

// Configuration for WebSocket behavior
const WS_CONFIG = {
  // How long to wait before attempting to reconnect (starts at min, increases with backoff)
  reconnectTimeMin: 1000, // 1 second
  reconnectTimeMax: 15000, // 15 seconds (reduced from 30)
  // Backoff multiplier - each reconnection attempt will wait longer
  backoffMultiplier: 1.3, // Reduced from 1.5
  // Maximum number of reconnection attempts before giving up
  maxReconnectAttempts: 3, // Reduced from 10
  // Heartbeat interval to check connection status (ms)
  heartbeatInterval: 60000, // 60 seconds (increased from 30)
};

// Helper function to create a WebSocket with reconnection functionality
const createReconnectingWebSocket = (
  url: string,
  onMessage: (data: any) => void,
  onError?: (error: any) => void,
  onConnected?: () => void,
  onDisconnected?: () => void
) => {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let isIntentionallyClosed = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  let messageQueue: string[] = [];

  // Calculate delay with exponential backoff
  const getReconnectDelay = () => {
    const delay = Math.min(
      WS_CONFIG.reconnectTimeMin * Math.pow(WS_CONFIG.backoffMultiplier, reconnectAttempts),
      WS_CONFIG.reconnectTimeMax
    );
    return delay;
  };

  // Handle connection status check
  const heartbeat = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Connection is still good - don't log anything to reduce console noise
    } else if (!isIntentionallyClosed) {
      // Connection lost but not by user action - attempt to reconnect
      console.warn('WebSocket heartbeat detected connection loss, reconnecting...');
      connect();
    }
  };

  // Connect or reconnect to the WebSocket
  const connect = () => {
    if (isIntentionallyClosed) {
      return;
    }

    // Clear any existing connection
    if (ws) {
      try {
        ws.onclose = null; // Remove the event handler to prevent infinite loops
        ws.onerror = null;
        ws.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        // Reduced logging - only log for the first connection or after failures
        if (reconnectAttempts > 0) {
          console.log(`WebSocket reconnected to ${url} after ${reconnectAttempts} attempts`);
        } else {
          console.log(`WebSocket connection established to ${url}`);
        }

        reconnectAttempts = 0; // Reset reconnect counter
        if (onConnected) onConnected();

        // Start heartbeat to keep connection alive and check status
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(heartbeat, WS_CONFIG.heartbeatInterval);

        // Process any queued messages
        while (messageQueue.length > 0) {
          const message = messageQueue.shift();
          if (message && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          if (onError) onError(error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = (event) => {
        console.log(`WebSocket connection closed with code ${event.code}: ${event.reason}`);

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        if (!isIntentionallyClosed) {
          // Attempt to reconnect if not intentionally closed
          reconnectAttempts++;

          if (reconnectAttempts <= WS_CONFIG.maxReconnectAttempts) {
            const delay = getReconnectDelay();
            console.log(`Attempting to reconnect in ${Math.round(delay / 1000)} seconds (attempt ${reconnectAttempts}/${WS_CONFIG.maxReconnectAttempts})...`);

            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connect, delay);

            if (onDisconnected) onDisconnected();
          } else {
            console.error(`Max reconnection attempts (${WS_CONFIG.maxReconnectAttempts}) reached. Giving up.`);
          }
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      if (onError) onError(error);

      // Still try to reconnect on setup error
      if (!isIntentionallyClosed && reconnectAttempts <= WS_CONFIG.maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = getReconnectDelay();
        console.log(`Error during setup. Retrying in ${Math.round(delay / 1000)} seconds (attempt ${reconnectAttempts}/${WS_CONFIG.maxReconnectAttempts})...`);

        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connect, delay);
      }
    }
  };

  // Initial connection
  connect();

  // Return interface
  return {
    close: () => {
      isIntentionallyClosed = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (ws) {
        ws.close();
      }
    },
    send: (data: any) => {
      const message = typeof data === 'string' ? data : JSON.stringify(data);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        // Queue message for later if not connected
        messageQueue.push(message);
        console.warn('WebSocket not connected. Message queued for later delivery.');
      }
    },
    isConnected: () => !!(ws && ws.readyState === WebSocket.OPEN),
    reconnect: () => {
      reconnectAttempts = 0; // Reset attempts on manual reconnect
      connect();
    }
  };
};

export const energyWebSocket = {
  createSystemMonitor: (
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
    return createReconnectingWebSocket(
      `${wsUrl}/energy-monitoring`,
      onMessage,
      onError,
      onConnected,
      onDisconnected
    );
  },

  createInstallationMonitor: (
    installationId: string,
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
    return createReconnectingWebSocket(
      `${wsUrl}/installation/${installationId}`,
      onMessage,
      onError,
      onConnected,
      onDisconnected
    );
  },

  createAlertsMonitor: (
    onMessage: (data: any) => void,
    onError?: (error: any) => void,
    onConnected?: () => void,
    onDisconnected?: () => void
  ) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';
    return createReconnectingWebSocket(
      `${wsUrl}/alerts`,
      onMessage,
      onError,
      onConnected,
      onDisconnected
    );
  }
}; 