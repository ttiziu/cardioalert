import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { EcgSimulator, SIM_RATE } from '../demo/ecgSimulator';
import { listAlerts, listSessions } from '../data/repo';
import type { Session } from '../data/types';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import { Badge, Button, Card, EcgChart, Metric, SectionLabel } from '../ui/components';
import { colors, labelColor, labelShort, mono } from '../ui/theme';

const restWave = new EcgSimulator('normal').next(SIM_RATE * 3);

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

const duration = (s: Session) => {
  if (!s.endedAt) return '--:--';
  const secs = Math.round((+new Date(s.endedAt) - +new Date(s.startedAt)) / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
};

export default function HomeScreen() {
  const { user, connection, deviceName, battery, simulated } = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [alertsToday, setAlertsToday] = useState(0);

  const refresh = useCallback(() => {
    listSessions().then(setSessions).catch(() => {});
    listAlerts()
      .then(a => setAlertsToday(a.filter(x => isToday(x.createdAt)).length))
      .catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  const last = sessions[0];
  const connected = connection === 'connected';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={styles.welcome}>Bienvenido,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <Badge label={(user?.role ?? '').toUpperCase()} color={colors.accent} />
      </View>

      <Pressable onPress={() => nav.push({ name: 'connect' })}>
        <Card>
          <View style={styles.sensorRow}>
            <View style={styles.flex}>
              <Text style={styles.sensorName}>{connected ? deviceName : 'Polar H10'}</Text>
              <Text style={styles.muted}>Sensor ECG</Text>
            </View>
            <Badge
              label={connected ? '● CONECTADO' : '○ DESCONECTADO'}
              color={connected ? colors.accent : colors.muted}
            />
          </View>
          <Text style={styles.sensorMeta}>
            {connected
              ? `Batería ${battery ?? '--'}%  ·  130 Hz`
              : 'Toca para buscar y conectar el sensor'}
          </Text>
        </Card>
      </Pressable>

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

      <View style={styles.metrics}>
        <Metric label="Sesiones hoy" value={String(sessions.filter(s => isToday(s.startedAt)).length)} />
        <Metric label="Última duración" value={last ? duration(last) : '--:--'} unit="min" />
        <Metric label="Alertas hoy" value={String(alertsToday)} />
      </View>

      <SectionLabel>Última sesión</SectionLabel>
      {last ? (
        <Pressable onPress={() => nav.replace({ name: 'tabs', tab: 'historial' })}>
          <Card style={styles.sessionRow}>
            <View style={styles.flex}>
              <Text style={styles.sessionTitle}>Paciente #{last.patientCode}</Text>
              <Text style={styles.muted}>{new Date(last.startedAt).toLocaleString()}</Text>
            </View>
            <Badge label={labelShort[last.label]} color={labelColor[last.label]} />
          </Card>
        </Pressable>
      ) : (
        <Card>
          <Text style={styles.muted}>Aún no hay sesiones registradas.</Text>
        </Card>
      )}

      <SectionLabel>Ritmo en reposo</SectionLabel>
      <Card style={styles.restCard}>
        <EcgChart samples={restWave} width={width - 64} height={80} />
        <View style={styles.restFooter}>
          <Text style={[styles.restText, { color: colors.accent }]}>Referencia</Text>
          <Text style={styles.restText}>Ritmo sinusal normal</Text>
        </View>
      </Card>
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
  sensorMeta: { color: colors.muted, fontSize: 12, marginTop: 10, fontFamily: mono },
  muted: { color: colors.muted, fontSize: 12 },
  cta: { paddingVertical: 18 },
  simNote: { color: colors.warning, fontSize: 12, textAlign: 'center', marginTop: -6 },
  metrics: { flexDirection: 'row', gap: 10 },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  restCard: { gap: 8 },
  restFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  restText: { color: colors.muted, fontSize: 11, fontFamily: mono },
});
