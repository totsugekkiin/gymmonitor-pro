import { parseTelemetry, type ParsedTelemetry } from './telemetry';

const WS_PORT = 81;

export function getEspWebSocketUrl(): string {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `ws://192.168.4.1:${WS_PORT}`;
  }
  return `ws://${host}:${WS_PORT}`;
}

export type GymTrackerConnection = {
  disconnect: () => void;
  writeCommand: (cmd: string) => Promise<void>;
};

export function connectGymTrackerWifi(
  onTelemetry: (data: ParsedTelemetry) => void,
): Promise<GymTrackerConnection> {
  return new Promise((resolve, reject) => {
    const url = getEspWebSocketUrl();
    const ws = new WebSocket(url);
    let settled = false;

    const fail = (err: Error) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    const timeout = window.setTimeout(() => {
      ws.close();
      fail(new Error('连接超时，请确认已连接 Gym-Tracker WiFi'));
    }, 8000);

    ws.onopen = () => {
      window.clearTimeout(timeout);
      if (settled) return;
      settled = true;
      resolve({
        disconnect: () => {
          ws.close();
        },
        writeCommand: async (cmd: string) => {
          if (ws.readyState !== WebSocket.OPEN) {
            throw new Error('未连接设备');
          }
          ws.send(cmd);
        },
      });
    };

    ws.onerror = () => {
      window.clearTimeout(timeout);
      fail(new Error('无法连接设备，请先连接 Gym-Tracker WiFi'));
    };

    ws.onclose = () => {
      window.clearTimeout(timeout);
      if (!settled) {
        fail(new Error('连接已断开'));
      }
    };

    ws.onmessage = (event) => {
      const text = typeof event.data === 'string' ? event.data : '';
      for (const line of text.split('\n')) {
        const parsed = parseTelemetry(line.trim());
        if (parsed) onTelemetry(parsed);
      }
    };
  });
}
