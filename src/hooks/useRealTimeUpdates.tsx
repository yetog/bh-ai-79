import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/api';

export interface ProcessingUpdate {
  type: 'processing.started' | 'processing.progress' | 'processing.completed' | 'processing.failed';
  jobId: string;
  filename?: string;
  progress?: number;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface SystemUpdate {
  type: 'system.stats' | 'system.health' | 'system.alert';
  data: any;
  message?: string;
  timestamp: string;
}

export type RealTimeUpdate = ProcessingUpdate | SystemUpdate;

export interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  fallbackPollingInterval?: number;
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const {
    enabled = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    fallbackPollingInterval = 5000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [updates, setUpdates] = useState<RealTimeUpdate[]>([]);
  const [connectionType, setConnectionType] = useState<'sse' | 'websocket' | 'polling' | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const queryClient = useQueryClient();
  const apiBaseUrl = getApiBaseUrl();

  const addUpdate = useCallback((update: RealTimeUpdate) => {
    setUpdates(prev => [update, ...prev].slice(0, 50)); // Keep last 50 updates
    
    // Invalidate relevant queries based on update type
    if (update.type.startsWith('processing.')) {
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      queryClient.invalidateQueries({ queryKey: ['processingMetrics'] });
    } else if (update.type === 'system.stats') {
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
    }
  }, [queryClient]);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionType(null);
  }, []);

  const startPolling = useCallback(() => {
    setConnectionType('polling');
    setIsConnected(true);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/updates/poll`);
        if (response.ok) {
          const updates = await response.json();
          updates.forEach(addUpdate);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, fallbackPollingInterval);
  }, [apiBaseUrl, addUpdate, fallbackPollingInterval]);

  const handleConnectionError = useCallback(() => {
    setIsConnected(false);
    
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current += 1;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (enabled) {
          console.log(`Reconnecting... attempt ${reconnectAttemptsRef.current}`);
          connectRealTime();
        }
      }, reconnectInterval);
    } else {
      console.log('Max reconnect attempts reached, falling back to polling');
      startPolling();
    }
  }, [enabled, reconnectInterval, maxReconnectAttempts, startPolling]);

  const connectSSE = useCallback(() => {
    try {
      const eventSource = new EventSource(`${apiBaseUrl}/updates/stream`);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionType('sse');
        reconnectAttemptsRef.current = 0;
        console.log('SSE connection established');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          addUpdate(update);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };
      
      eventSource.onerror = () => {
        console.error('SSE connection error');
        cleanup();
        handleConnectionError();
      };
      
    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      handleConnectionError();
    }
  }, [apiBaseUrl, addUpdate, cleanup, handleConnectionError]);

  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = apiBaseUrl.replace(/^http/, 'ws');
      const webSocket = new WebSocket(`${wsUrl}/updates/ws`);
      webSocketRef.current = webSocket;
      
      webSocket.onopen = () => {
        setIsConnected(true);
        setConnectionType('websocket');
        reconnectAttemptsRef.current = 0;
        console.log('WebSocket connection established');
      };
      
      webSocket.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          addUpdate(update);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      webSocket.onerror = () => {
        console.error('WebSocket connection error');
        cleanup();
        handleConnectionError();
      };
      
      webSocket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        handleConnectionError();
      };
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      handleConnectionError();
    }
  }, [apiBaseUrl, addUpdate, cleanup, handleConnectionError]);

  const connectRealTime = useCallback(() => {
    cleanup();
    
    if (!enabled) return;
    
    // Try WebSocket first, then SSE, then polling
    if ('WebSocket' in window) {
      connectWebSocket();
    } else if ('EventSource' in window) {
      connectSSE();
    } else {
      startPolling();
    }
  }, [enabled, cleanup, connectWebSocket, connectSSE, startPolling]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connectRealTime();
  }, [connectRealTime]);

  useEffect(() => {
    connectRealTime();
    
    return () => {
      cleanup();
    };
  }, [connectRealTime, cleanup]);

  return {
    isConnected,
    connectionType,
    updates,
    clearUpdates,
    reconnect,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts
  };
}