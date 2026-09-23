import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { EcgSimulator, SIM_RATE } from '../demo/ecgSimulator';
import { listAlerts, listSessions } from '../data/repo';
import type { Session } from '../data/types';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import {
  Badge,
  Button,
  Card,
  EcgChart,
  Metric,
  SectionLabel,
} from '../ui/components';
import { FadeIn } from '../ui/motion';
import { colors, labelColor, labelShort, mono } from '../ui/theme';

const REST_SECONDS = 3;

/** Trazo de referencia que avanza lento, para que la tarjeta no se vea estática. */
function useRestWave() {
  const [wave, setWave] = useState<number[]>([]);
  useEffect(() => {
    const sim = new EcgSimulator('normal');
    let buffer = sim.next(SIM_RATE * REST_SECONDS);
    setWave(buffer);
    const chunk = Math.round(SIM_RATE / 10);
    const timer = setInterval(() => {
      buffer = buffer.concat(sim.next(chunk)).slice(-SIM_RATE * REST_SECONDS);
      setWave(buffer);
    }, 100);
    return () => clearInterval(timer);
  }, []);
  return wave;
}

const isToday = (iso: string) =>
  new Date(iso).toDateString() === new Date().toDateString();

const duration = (s: Session) => {
  if (!s.endedAt) return '--:--';
  const secs = Math.round(
    (+new Date(s.endedAt) - +new Date(s.startedAt)) / 1000,
  );
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
};

export default function HomeScreen() {
  const { user, connection, deviceName, battery, simulated } = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const restWave = useRestWave();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [alertsToday, setAlertsToday] = useState(0);

  const refresh = useCallback(() => {
    listSessions()
      .then(setSessions)
      .catch(() => {});
    listAlerts()
      .then(a => setAlertsToday(a.filter(x => isToday(x.createdAt)).length))
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  const last = sessions[0];
  const connected = connection === 'connected';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <FadeIn style={styles.top}>
        <View style={styles.flex}>
          <Text style={styles.welcome}>Bienvenido,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <Badge label={(user?.role ?? '').toUpperCase()} color={colors.accent} />
      </FadeIn>

      <FadeIn delay={60}>
        <Card
          onPress={() => nav.push({ name: 'connect' })}
          borderColor={connected ? `${colors.accent}66` : undefined}
        >
          <View style={styles.sensorRow}>
            <View style={styles.flex}>
              <Text style={styles.sensorName}>
                {connected ? deviceName : 'Polar H10'}
              </Text>
              <Text style={styles.muted}>Sensor ECG</Text>
            </View>
            <Badge
              label={connected ? 'CONECTADO' : 'DESCONECTADO'}
              color={connected ? colors.accent : colors.muted}
              live={connected}
            />
          </View>
          <Text style={styles.sensorMeta}>
            {connected
              ? `Batería ${battery ?? '--'}%  ·  130 Hz`
              : 'Toca para buscar y conectar el sensor  ›'}
          </Text>
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <Button
          label="Iniciar Monitoreo"
          onPress={() => nav.push({ name: 'monitor' })}
          style={styles.cta}
        />
        {simulated ? (
          <Text style={styles.simNote}>
            Sin sensor conectado se usará ECG simulado (modo demo).
          </Text>
        ) : null}
      </FadeIn>

      <FadeIn delay={180} style={styles.metrics}>
        <Metric
          label="Sesiones hoy"
          value={String(sessions.filter(s => isToday(s.startedAt)).length)}
        />
        <Metric
          label="Última duración"
          value={last ? duration(last) : '--:--'}
          unit="min"
        />
        <Metric label="Alertas hoy" value={String(alertsToday)} />
      </FadeIn>

      <FadeIn delay={240}>
        <SectionLabel>Última sesión</SectionLabel>
        {last ? (
          <Card
            style={styles.sessionRow}
            onPress={() => nav.replace({ name: 'tabs', tab: 'historial' })}
          >
            <View style={styles.flex}>
              <Text style={styles.sessionTitle}>
                Paciente #{last.patientCode}
              </Text>
              <Text style={styles.muted}>
                {new Date(last.startedAt).toLocaleString()}
              </Text>
            </View>
            <Badge
              label={labelShort[last.label]}
              color={labelColor[last.label]}
            />
          </Card>
        ) : (
          <Card>
            <Text style={styles.muted}>Aún no hay sesiones registradas.</Text>
          </Card>
        )}
      </FadeIn>

      <FadeIn delay={300}>
        <SectionLabel>Ritmo en reposo</SectionLabel>
        <Card style={styles.restCard}>
          <View style={styles.restChart}>
            <EcgChart samples={restWave} width={width - 64} height={80} live />
          </View>
          <View style={styles.restFooter}>
            <Text style={[styles.restText, { color: colors.accent }]}>
              Referencia
            </Text>
            <Text style={styles.restText}>Ritmo sinusal normal</Text>
          </View>
        </Card>
      </FadeIn>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  welcome: { color: colors.muted, fontSize: 13 },
  name: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sensorRow: { flexDirection: 'row', alignItems: 'center' },
  sensorName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sensorMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 10,
    fontFamily: mono,
  },
  muted: { color: colors.muted, fontSize: 12 },
  cta: { paddingVertical: 18 },
  simNote: {
    color: colors.warning,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  metrics: { flexDirection: 'row', gap: 10 },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  restCard: { gap: 8 },
  restChart: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#050807',
  },
  restFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  restText: { color: colors.muted, fontSize: 11, fontFamily: mono },
});
