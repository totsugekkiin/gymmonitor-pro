import { useCallback, useEffect, useRef, useState } from 'react';
import { connectGymTrackerWifi } from '../lib/wifi';
import type { LiveTelemetry } from '../types/workout';

const defaultLive: LiveTelemetry = { depth: 0, angle: 0, rep: 0, warn: false };

export function useWifi() {
  const [live, setLive] = useState<LiveTelemetry>(defaultLive);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);
  const writeCommandRef = useRef<((cmd: string) => Promise<void>) | null>(null);
  const onTelemetryRef = useRef<
    ((t: LiveTelemetry & { deviceT: number; repEvent: boolean }) => void) | null
  >(null);

  const registerTelemetryHandler = useCallback(
    (
      handler:
        | ((t: LiveTelemetry & { deviceT: number; repEvent: boolean }) => void)
        | null,
    ) => {
      onTelemetryRef.current = handler;
    },
    [],
  );

  const connect = useCallback(async () => {
    try {
      setError(null);
      disconnectRef.current?.();
      const { disconnect, writeCommand } = await connectGymTrackerWifi((data) => {
        setLive({
          depth: data.depth,
          angle: data.angle,
          rep: data.rep,
          warn: data.warn,
        });
        onTelemetryRef.current?.({
          depth: data.depth,
          angle: data.angle,
          rep: data.rep,
          warn: data.warn,
          deviceT: data.deviceT,
          repEvent: data.repEvent,
        });
      });
      disconnectRef.current = disconnect;
      writeCommandRef.current = writeCommand;
      setIsConnected(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '连接失败';
      setError(msg);
      setIsConnected(false);
      writeCommandRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectRef.current?.();
    disconnectRef.current = null;
    writeCommandRef.current = null;
    setIsConnected(false);
    setLive(defaultLive);
  }, []);

  const sendCommand = useCallback(async (cmd: string) => {
    if (!writeCommandRef.current) {
      throw new Error('未连接设备');
    }
    await writeCommandRef.current(cmd);
  }, []);

  useEffect(() => {
    const host = window.location.hostname;
    if (host === '192.168.4.1') {
      void connect();
    }
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    live,
    isConnected,
    error,
    connect,
    disconnect,
    sendCommand,
    registerTelemetryHandler,
  };
}
