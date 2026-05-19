import { useCallback, useRef, useState } from 'react';
import { connectGymTracker } from '../lib/ble';
import type { LiveTelemetry } from '../types/workout';

const defaultLive: LiveTelemetry = { depth: 0, angle: 0, rep: 0, warn: false };

export function useBluetooth() {
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
      const { disconnect, writeCommand } = await connectGymTracker((data) => {
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
    } catch {
      setError('连接失败，请使用 Chrome/Edge 并确认设备已开启');
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
      throw new Error('未连接蓝牙');
    }
    await writeCommandRef.current(cmd);
  }, []);

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
