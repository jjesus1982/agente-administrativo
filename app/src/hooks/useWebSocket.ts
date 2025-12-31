"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketResult {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (data: unknown) => void;
  connect: () => void;
  disconnect: () => void;
}

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || "ws://localhost:8100/api/v1";

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketResult {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      return;
    }

    // Fechar conexao existente
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${WS_BASE}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectCountRef.current = 0;
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
        onMessage?.(message);
      } catch (_) {
        // Failed to parse WebSocket message
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();

      // Tentar reconectar
      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("WebSocket error:", error);
      }
      onError?.(error);
    };

    wsRef.current = ws;
  }, [
    getToken,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    reconnectAttempts,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectCountRef.current = reconnectAttempts; // Impedir reconexao
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, [reconnectAttempts]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    // Conectar automaticamente se houver token
    const token = getToken();
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, getToken]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}

export default useWebSocket;
