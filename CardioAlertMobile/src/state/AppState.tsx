import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Vibration } from 'react-native';
import { ALERT_THRESHOLD, DEMO_MODE } from '../config';
import * as repo from '../data/repo';
import type { Session } from '../data/types';
import { EcgSimulator, SIM_RATE } from '../demo/ecgSimulator';
import { createPredictor, MODEL_SOURCE, type ModelSource } from '../ml/classifier';
import { toPrediction, type Label, type Prediction } from '../ml/types';
import { perturbationImportance } from '../ml/xai';
import { HAS_REMOTE_MODEL, remoteExplain } from '../ml/remote';
import {
  polar,
  requestBlePermissions,
  POLAR_ECG_SAMPLE_RATE,
  type ConnectionState,
  type PolarDevice,
} from '../native/polar';
import { getRole, signIn, signOut, type UserRole } from '../lib/supabase';
import { latestOnly } from '../lib/latestOnly';
import { SlidingWindow } from '../signal/preprocess';

export type User = { email: string; name: string; role: UserRole };

const WAVE_SECONDS = 5;

type Ctx = {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;

  devices: PolarDevice[];
  scanning: boolean;
  connection: ConnectionState;
  deviceId: string | null;
  deviceName: string | null;
  battery: number | null;
  bleError: string | null;
  scan: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;

  scenario: Label;
  setScenario: (l: Label) => void;
  simulated: boolean;

  monitoring: boolean;
  session: Session | null;
  startedAt: number | null;
  wave: number[];
  waveRate: number;
  hr: number | null;
  rrMs: number | null;
  prediction: Prediction | null;
  lastWindow: number[] | null;
  alertActive: boolean;
  modelSource: ModelSource;
  modelError: string | null;
  heatmap: number[] | null;
  xaiRunning: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  runXai: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp fuera de AppProvider');
  return ctx;
}

const nameFromEmail = (email: string) =>
  email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map(p => p[0].toUpperCase() + p.slice(1))
    .join(' ');

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const [devices, setDevices] = useState<PolarDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('disconnected');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [bleError, setBleError] = useState<string | null>(null);

  const [scenario, setScenarioState] = useState<Label>('normal');
  const scenarioRef = useRef<Label>('normal');
  const setScenario = useCallback((l: Label) => {
    scenarioRef.current = l;
    simRef.current.scenario = l;
    setScenarioState(l);
  }, []);

  const [monitoring, setMonitoring] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [wave, setWave] = useState<number[]>([]);
  const [waveRate, setWaveRate] = useState(POLAR_ECG_SAMPLE_RATE);
  const [hr, setHr] = useState<number | null>(null);
  const [rrMs, setRrMs] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [lastWindow, setLastWindow] = useState<number[] | null>(null);
  const [alertActive, setAlertActive] = useState(false);
  const [heatmap, setHeatmap] = useState<number[] | null>(null);
  const [xaiRunning, setXaiRunning] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const simRef = useRef(new EcgSimulator());
  const windowRef = useRef<SlidingWindow | null>(null);
  const waveRef = useRef<number[]>([]);
  const sessionRef = useRef<Session | null>(null);
  const lastLabelRef = useRef<Label | null>(null);
  const alertRef = useRef(false);
  const predictor = useMemo(() => createPredictor(() => scenarioRef.current), []);

  const simulated = connection !== 'connected';

  useEffect(() => {
    const subs = [
      polar.onDeviceFound(d =>
        setDevices(prev =>
          prev.some(p => p.deviceId === d.deviceId) ? prev : [...prev, d],
        ),
      ),
      polar.onConnectionState(e => {
        setConnection(e.state);
        if (e.state === 'connected') {
          setDeviceId(e.deviceId);
          setDeviceName(e.name ?? 'Polar H10');
          setScanning(false);
          polar.stopScan().catch(() => {});
        }
        if (e.state === 'disconnected') setBattery(null);
      }),
      polar.onBattery(e => setBattery(e.level)),
      polar.onError(e => setBleError(`${e.scope}: ${e.message}`)),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  const login = useCallback(
    async (email: string, password: string, role: UserRole) => {
      if (!DEMO_MODE) {
        await signIn(email, password);
        const realRole = await getRole();
        if (realRole && realRole !== role) {
          await signOut();
          throw new Error(`Esta cuenta no tiene el rol "${role}"`);
        }
      }
      setUser({ email, name: nameFromEmail(email) || 'Usuario', role });
    },
    [],
  );

  const scan = useCallback(async () => {
    setBleError(null);
    if (!(await requestBlePermissions())) {
      setBleError('Permisos de Bluetooth denegados');
      return;
    }
    setDevices([]);
    setScanning(true);
    try {
      await polar.startScan();
    } catch (e) {
      setBleError(String(e));
      setScanning(false);
    }
  }, []);

  const connect = useCallback(async (id: string) => {
    setBleError(null);
    try {
      await polar.connect(id);
    } catch (e) {
      setBleError(String(e));
    }
  }, []);

  const disconnect = useCallback(async () => {
    await polar.disconnect().catch(() => {});
    setConnection('disconnected');
    setDeviceId(null);
  }, []);

  const handleWindow = useCallback(
    async (window: number[]) => {
      const session = sessionRef.current;
      let pred: Prediction;
      try {
        pred = toPrediction(await predictor(window));
      } catch (e) {
        if (sessionRef.current === session) {
          setModelError(e instanceof Error ? e.message : 'Error de clasificación');
        }
        return;
      }
      // La sesión terminó o cambió mientras esperábamos: el resultado ya no aplica.
      if (!session || sessionRef.current !== session) return;

      setModelError(null);
      setPrediction(pred);
      setLastWindow(window);

      if (pred.label !== lastLabelRef.current) {
        lastLabelRef.current = pred.label;
        repo.saveClassification(session, pred.label, pred.confidence).catch(() => {});
      }

      const critical = pred.label !== 'normal' && pred.confidence >= ALERT_THRESHOLD;
      if (critical && !alertRef.current) {
        Vibration.vibrate([0, 400, 200, 400]);
        setHeatmap(null);
      }
      alertRef.current = critical;
      setAlertActive(critical);
    },
    [predictor],
  );

  // Una clasificación en vuelo a la vez; si se acumulan ventanas, gana la más reciente.
  const classify = useMemo(() => latestOnly(handleWindow), [handleWindow]);

  const ingest = useCallback(
    (samples: number[], rate: number) => {
      const max = Math.round(rate * WAVE_SECONDS);
      waveRef.current = waveRef.current.concat(samples).slice(-max);
      setWave(waveRef.current);
      const ready = windowRef.current?.push(samples);
      if (ready) classify(ready);
    },
    [classify],
  );

  // Fuente de señal: Polar si está conectado, simulador si no.
  useEffect(() => {
    if (!monitoring) return;
    if (!simulated) {
      const subs = [
        polar.onEcgData(p => ingest(p.samples, POLAR_ECG_SAMPLE_RATE)),
        polar.onHrData(p => {
          setHr(p.hr);
          if (p.rrMs.length) setRrMs(p.rrMs[p.rrMs.length - 1]);
        }),
      ];
      polar.startHrStream().catch(e => setBleError(String(e)));
      polar.startEcgStream().catch(e => setBleError(String(e)));
      return () => {
        subs.forEach(s => s.remove());
        polar.stopEcgStream().catch(() => {});
        polar.stopHrStream().catch(() => {});
      };
    }
    const chunk = Math.round(SIM_RATE / 10);
    const timer = setInterval(() => {
      ingest(simRef.current.next(chunk), SIM_RATE);
      setHr(simRef.current.heartRate);
      setRrMs(simRef.current.rrMs);
    }, 100);
    return () => clearInterval(timer);
  }, [monitoring, simulated, ingest]);

  const startMonitoring = useCallback(async () => {
    const rate = simulated ? SIM_RATE : POLAR_ECG_SAMPLE_RATE;
    windowRef.current = new SlidingWindow(rate);
    waveRef.current = [];
    lastLabelRef.current = null;
    alertRef.current = false;
    setWaveRate(rate);
    setWave([]);
    setPrediction(null);
    setLastWindow(null);
    setHeatmap(null);
    setAlertActive(false);
    setHr(null);
    setRrMs(null);
    const s = await repo.startSession(deviceId ?? 'SIMULADOR', repo.newPatientCode());
    sessionRef.current = s;
    setSession(s);
    setStartedAt(Date.now());
    setMonitoring(true);
  }, [simulated, deviceId]);

  const stopMonitoring = useCallback(async () => {
    setMonitoring(false);
    const s = sessionRef.current;
    sessionRef.current = null;
    if (s) await repo.endSession(s).catch(() => {});
    setStartedAt(null);
  }, []);

  const runXai = useCallback(async () => {
    if (!lastWindow || !prediction) return;
    setXaiRunning(true);
    try {
      setHeatmap(
        HAS_REMOTE_MODEL
          ? (await remoteExplain(lastWindow)).importance
          : await perturbationImportance(lastWindow, predictor, prediction.label),
      );
      setModelError(null);
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Error al calcular la explicación');
    } finally {
      setXaiRunning(false);
    }
  }, [lastWindow, prediction, predictor]);

  const logout = useCallback(async () => {
    await stopMonitoring();
    if (!DEMO_MODE) await signOut().catch(() => {});
    setUser(null);
  }, [stopMonitoring]);

  const value: Ctx = {
    user,
    login,
    logout,
    devices,
    scanning,
    connection,
    deviceId,
    deviceName,
    battery,
    bleError,
    scan,
    connect,
    disconnect,
    scenario,
    setScenario,
    simulated,
    monitoring,
    session,
    startedAt,
    wave,
    waveRate,
    hr,
    rrMs,
    prediction,
    lastWindow,
    alertActive,
    modelSource: MODEL_SOURCE,
    modelError,
    heatmap,
    xaiRunning,
    startMonitoring,
    stopMonitoring,
    runXai,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
