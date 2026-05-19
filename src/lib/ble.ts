import { parseTelemetry, type ParsedTelemetry } from './telemetry';

export { parseTelemetry, type ParsedTelemetry };

export const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

export type GymTrackerConnection = {
  disconnect: () => void;
  writeCommand: (cmd: string) => Promise<void>;
};

export async function connectGymTracker(
  onTelemetry: (data: ParsedTelemetry) => void,
): Promise<GymTrackerConnection> {
  if (!navigator.bluetooth) throw new Error('Web Bluetooth not supported');

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'Gym-Tracker' }, { services: [SERVICE_UUID] }],
    optionalServices: [SERVICE_UUID],
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error('GATT connect failed');

  const service = await server.getPrimaryService(SERVICE_UUID);
  const txChar = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
  const rxChar = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);

  await txChar.startNotifications();

  const handler = (e: Event) => {
    const target = e.target as BluetoothRemoteGATTCharacteristic;
    const value = new TextDecoder().decode(target.value);
    const parsed = parseTelemetry(value);
    if (parsed) onTelemetry(parsed);
  };

  txChar.addEventListener('characteristicvaluechanged', handler);

  const writeCommand = async (cmd: string) => {
    const payload = new TextEncoder().encode(cmd);
    if (rxChar.writeValueWithoutResponse) {
      await rxChar.writeValueWithoutResponse(payload);
    } else {
      await rxChar.writeValue(payload);
    }
  };

  const disconnect = () => {
    txChar.removeEventListener('characteristicvaluechanged', handler);
    if (device.gatt?.connected) device.gatt.disconnect();
  };

  return { disconnect, writeCommand };
}
