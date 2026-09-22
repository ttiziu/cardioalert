import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { listAlerts, setAlertStatus, subscribeAlerts } from '../data/repo';
import type { Alert } from '../data/types';
import { useApp } from '../state/AppState';
import { Badge, Button, Card, EcgChart, Metric, Row } from '../ui/components';
import { colors, labelColor, labelShort, mono } from '../ui/theme';

const STATUS_COLOR = {
  pendiente: colors.warning,
  aceptada: colors.accent,
  derivada: colors.muted,
};

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 60000));
  return mins < 1 ? 'ahora' : `hace ${mins} min`;
};

/** Monitor del médico receptor. También sirve de bandeja de alertas enviadas al paramédico. */
export default function HospitalScreen({ canRespond }: { canRespond: boolean }) {
  const { user } = useApp();
  const { width } = useWindowDimensions();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listAlerts()
      .then(a => {
        setAlerts(a);
        setError(null);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar alertas'));
  }, []);

  useEffect(() => {
    load();
    return subscribeAlerts(load);
  }, [load]);

  const respond = async (id: string, status: 'aceptada' | 'derivada') => {
    await setAlertStatus(id, status);
    load();
  };

  const pending = alerts.filter(a => a.status === 'pendiente').length;
  const today = alerts.filter(
    a => new Date(a.createdAt).toDateString() === new Date().toDateString(),
  );

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={alerts}
      keyExtractor={a => a.id}
      ListHeaderComponent={
        <View style={styles.header}>
          {canRespond ? (
            <Text style={styles.doctor}>
              {user?.name} · Receptor
            </Text>
          ) : null}
          <View style={styles.metrics}>
            <Metric label="Alertas hoy" value={String(today.length)} />
            <Metric label="Pendientes" value={String(pending)} color={colors.warning} />
            <Metric
              label="Atendidas"
              value={String(today.filter(a => a.status !== 'pendiente').length)}
              color={colors.accent}
            />
          </View>
          <Text style={styles.section}>ALERTAS EN TIEMPO REAL</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No hay alertas por ahora.</Text>}
      renderItem={({ item }) => {
        const color = labelColor[item.label];
        const open = expanded === item.id;
        return (
          <Pressable onPress={() => setExpanded(open ? null : item.id)}>
            <Card borderColor={item.status === 'pendiente' ? color : undefined} style={styles.alert}>
              <View style={styles.alertTop}>
                <View style={styles.flex}>
                  <View style={styles.titleRow}>
                    <Text style={styles.patient}>{item.patientCode}</Text>
                    <Badge label={labelShort[item.label]} color={color} />
                  </View>
                  <Text style={styles.meta}>
                    {new Date(item.createdAt).toLocaleTimeString()} · {ago(item.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>

              {open ? (
                <View style={styles.detail}>
                  {item.ecgSnapshot.length ? (
                    <View style={styles.chart}>
                      <EcgChart
                        samples={item.ecgSnapshot}
                        width={width - 64}
                        height={90}
                        color={color}
                      />
                    </View>
                  ) : null}
                  <Row label="Confianza" value={`${Math.round(item.confidence * 100)}%`} />
                  <Row label="FC" value={item.hr !== null ? `${item.hr} BPM` : '--'} />
                  <Row label="R-R" value={item.rrMs !== null ? `${item.rrMs} ms` : '--'} />
                  <Row
                    label="Ubicación"
                    value={
                      item.latitude !== null && item.longitude !== null
                        ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                        : 'Sin GPS'
                    }
                  />
                  {canRespond && item.status === 'pendiente' ? (
                    <View style={styles.actions}>
                      <Button
                        label="Aceptar"
                        onPress={() => respond(item.id, 'aceptada')}
                        style={styles.flex}
                      />
                      <Button
                        label="Derivar"
                        variant="ghost"
                        onPress={() => respond(item.id, 'derivada')}
                        style={styles.flex}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  flex: { flex: 1 },
  header: { gap: 12, marginBottom: 2 },
  doctor: { color: colors.muted, fontSize: 12 },
  metrics: { flexDirection: 'row', gap: 10 },
  section: { color: colors.muted, fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 32 },
  alert: { gap: 10 },
  alertTop: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patient: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 11, fontFamily: mono, marginTop: 4 },
  status: { fontSize: 10, fontWeight: '700', fontFamily: mono },
  detail: { gap: 4 },
  chart: { backgroundColor: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
