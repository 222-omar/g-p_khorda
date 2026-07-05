import { useState, useEffect, useCallback, useRef } from 'react';

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(c => c.trim().startsWith('access_token='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
}

function getWebSocketBase(): string {
    if (process.env.NEXT_PUBLIC_API_URL) {
        // e.g. "http://localhost:8000/api" -> "ws://localhost:8000"
        try {
            const url = new URL(process.env.NEXT_PUBLIC_API_URL);
            const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${url.host}`;
        } catch (e) {
            // fallback if invalid URL
        }
    }
    
    // Default development fallback
    return 'ws://127.0.0.1:8000';
}

interface UseWebSocketOptions {
    onMessage?: (data: any) => void;
    reconnectAttempts?: number;
    reconnectInterval?: number;
}

export function useWebSocket(endpoint: string | null, options: UseWebSocketOptions = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectCountRef = useRef(0);
    const maxReconnectAttempts = options.reconnectAttempts || 5;
    const baseReconnectInterval = options.reconnectInterval || 1000;
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (!endpoint) return;

        const token = getAuthToken();
        if (!token) {
            console.log('[WebSocket] No auth token found, cannot connect to', endpoint);
            return;
        }

        const wsBase = getWebSocketBase();
        const url = `${wsBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}?token=${token}`;
        
        console.log(`[WebSocket] Connecting to ${url.replace(token, '***')}...`);
        
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('[WebSocket] Connected to', endpoint);
            setIsConnected(true);
            reconnectCountRef.current = 0; // reset reconnect count on success
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLastMessage(data);
                if (options.onMessage) {
                    options.onMessage(data);
                }
            } catch (error) {
                console.error('[WebSocket] Error parsing message:', error);
            }
        };

        ws.onclose = (event) => {
            console.log(`[WebSocket] Disconnected from ${endpoint} | Code: ${event.code} | Reason: ${event.reason} | WasClean: ${event.wasClean}`);
            setIsConnected(false);
            wsRef.current = null;

            // Don't reconnect if it was a normal closure (1000) or if we don't have an endpoint anymore
            if (event.code !== 1000 && endpoint) {
                if (reconnectCountRef.current < maxReconnectAttempts) {
                    const timeout = baseReconnectInterval * Math.pow(2, reconnectCountRef.current);
                    console.log(`[WebSocket] Reconnecting in ${timeout}ms... (Attempt ${reconnectCountRef.current + 1})`);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectCountRef.current += 1;
                        connect();
                    }, timeout);
                } else {
                    console.log('[WebSocket] Max reconnect attempts reached');
                }
            }
        };

        ws.onerror = (error: any) => {
            // Ignore errors if the socket is closing or closed (often happens during React Strict Mode unmounts)
            if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
                return;
            }
            console.error('[WebSocket] Error Details:', {
                readyState: ws.readyState,
                url: ws.url,
                type: error.type,
                message: error.message
            });
            // onclose will be called immediately after onerror in most cases
        };

        wsRef.current = ws;
    }, [endpoint, maxReconnectAttempts, baseReconnectInterval, options.onMessage]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                // 1000 = normal closure
                wsRef.current.close(1000, 'Component unmounting');
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    return {
        isConnected,
        lastMessage,
        sendMessage,
    };
}
