import { useState, useEffect, useCallback } from 'react';

type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

interface UseWebSocketOptions {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (data: any) => void;
  onError?: (event: Event) => void;
  reconnectOnClose?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Custom hook for managing WebSocket connections with automatic reconnection
 */
export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [receivedData, setReceivedData] = useState<any[]>([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnectOnClose = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      setSocket(ws);
      setStatus('connecting');

      ws.onopen = (event) => {
        setStatus('open');
        setReconnectAttempts(0);
        if (onOpen) onOpen(event);
      };

      ws.onclose = (event) => {
        setStatus('closed');
        if (onClose) onClose(event);

        if (reconnectOnClose && reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts((prevAttempts) => prevAttempts + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        setStatus('error');
        if (onError) onError(event);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setReceivedData((prev) => [...prev, parsed]);
          if (onMessage) onMessage(parsed);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          if (onError) onError(new ErrorEvent('error', { message: 'Failed to parse message' }));
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setStatus('error');
    }
  }, [url, onOpen, onClose, onMessage, onError, reconnectOnClose, reconnectInterval, maxReconnectAttempts, reconnectAttempts]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [connect]);

  // Send data through the WebSocket
  const send = useCallback((data: string | object) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }, [socket]);

  // Close the WebSocket connection
  const close = useCallback(() => {
    if (socket) {
      socket.close();
      setStatus('closing');
    }
  }, [socket]);

  return {
    socket,
    status,
    isConnected: status === 'open',
    data: receivedData,
    send,
    close,
    connect,
  };
} 