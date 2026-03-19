import { useEffect, useRef } from 'react';

const WS_BASE = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

/**
 * Connects a psychologist to the real-time alert WebSocket.
 * @param {number|null} psychologistId - The logged-in psychologist's user ID.
 * @param {function} onAlert - Callback invoked with the parsed alert payload on new alerts.
 */
export function useAlertWebSocket(psychologistId, onAlert) {
  const wsRef = useRef(null);
  const pingRef = useRef(null);
  const onAlertRef = useRef(onAlert);

  // Keep callback ref up-to-date without restarting the connection
  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  useEffect(() => {
    if (!psychologistId) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/alerts/${psychologistId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Alert channel connected');
        // Keep-alive ping every 30 seconds
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      const seenIds = new Set();

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_alert') {
            const id = data.alert_id ?? data.id;
            if (id && seenIds.has(id)) return;
            if (id) seenIds.add(id);
            onAlertRef.current(data);
          }
        } catch {
          // ignore non-JSON messages (pong etc.)
        }
      };

      ws.onclose = (event) => {
        clearInterval(pingRef.current);
        // Auto-reconnect after 3s unless deliberately closed
        if (event.code !== 1000) {
          setTimeout(connect, 3000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WS] Alert channel error:', err);
      };
    };

    connect();

    return () => {
      clearInterval(pingRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close(1000, 'component unmounted');
      }
    };
  }, [psychologistId]);
}
