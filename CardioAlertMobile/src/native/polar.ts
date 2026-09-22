import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

const { PolarModule } = NativeModules;

/**
 * El módulo nativo solo existe en Android por ahora. Sin él la app arranca
 * igual en modo simulado, para desarrollar la UI sin la banda H10.
 */
export const isPolarAvailable = Boolean(PolarModule);

const emitter = PolarModule ? new NativeEventEmitter(PolarModule) : null;

const noopSubscription = { remove: () => {} };

/** NativeEventEmitter tipa el payload como Object; aquí lo estrechamos. */
function listen<T>(event: string, cb: (payload: T) => void) {
  if (!emitter) return noopSubscription;
  return emitter.addListener(event, cb as (...args: readonly Object[]) => void);
}

export type PolarDevice = {
  deviceId: string;
  name: string;
  rssi: number;
};

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export type EcgPacket = {
  deviceId: string;
  /** Voltaje en microvolts, a 130 Hz nativos del H10 */
  samples: number[];
  /** Timestamp del sensor en nanosegundos */
  timestamps: number[];
};

export type HrPacket = {
  hr: number;
  rrMs: number[];
  contactSupported: boolean;
  contact: boolean;
};

export { POLAR_ECG_SAMPLE_RATE } from './constants';

export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const sdk = Platform.Version as number;
  const permissions =
    sdk >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    p => result[p] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

function requireModule() {
  if (!PolarModule) {
    throw new Error(
      'PolarModule no disponible en esta plataforma. Usa el modo simulado.',
    );
  }
  return PolarModule;
}

export const polar = {
  startScan: (): Promise<void> => requireModule().startScan(),
  stopScan: (): Promise<void> => requireModule().stopScan(),
  connect: (deviceId: string): Promise<void> =>
    requireModule().connect(deviceId),
  disconnect: (): Promise<void> => requireModule().disconnect(),
  startEcgStream: (): Promise<void> => requireModule().startEcgStream(),
  stopEcgStream: (): Promise<void> => requireModule().stopEcgStream(),
  startHrStream: (): Promise<void> => requireModule().startHrStream(),
  stopHrStream: (): Promise<void> => requireModule().stopHrStream(),

  onDeviceFound: (cb: (d: PolarDevice) => void) =>
    listen<PolarDevice>('PolarDeviceFound', cb),
  onConnectionState: (
    cb: (e: { state: ConnectionState; deviceId: string; name?: string }) => void,
  ) => listen('PolarConnectionState', cb),
  onEcgData: (cb: (p: EcgPacket) => void) =>
    listen<EcgPacket>('PolarEcgData', cb),
  onHrData: (cb: (p: HrPacket) => void) =>
    listen<HrPacket>('PolarHrData', cb),
  onBattery: (cb: (e: { deviceId: string; level: number }) => void) =>
    listen('PolarBattery', cb),
  onError: (cb: (e: { scope: string; message: string }) => void) =>
    listen('PolarError', cb),
};
