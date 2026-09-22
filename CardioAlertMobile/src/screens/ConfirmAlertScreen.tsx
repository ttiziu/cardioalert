import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RECEIVING_HOSPITAL } from '../config';
import { sendAlert } from '../data/repo';
import { getCurrentCoords, type Coords } from '../lib/location';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import { Badge, Button, Card, Header, Row, Screen, SectionLabel } from '../ui/components';
import { colors, labelColor, labelName, labelShort, mono } from '../ui/theme';

export default function ConfirmAlertScreen() {
  const app = useApp();
  const nav = useNav();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timestamp] = useState(() => new Date());

  useEffect(() => {
    getCurrentCoords()
      .then(setCoords)
      .finally(() => setLocating(false));
  }, []);

  const p = app.prediction;
  if (!p || p.label === 'normal' || !app.session) {
    return (
      <Screen>
        <Header title="Confirmar Alerta" onBack={nav.back} />
        <Text style={styles.empty}>No hay una anomalía para alertar.</Text>
      </Screen>
    );
  }
  const label = p.label;
  const color = labelColor[label];

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await sendAlert({
        sessionId: app.session!.id,
        patientCode: app.session!.patientCode,
        label,
        confidence: p.confidence,
        hr: app.hr,
        rrMs: app.rrMs,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        ecgSnapshot: (app.lastWindow ?? []).map(v => Math.round(v * 1000) / 1000),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la alerta');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <View style={styles.sent}>
          <Text style={styles.sentIcon}>✓</Text>
          <Text style={styles.sentTitle}>Alerta enviada</Text>
          <Text style={styles.sentText}>
            {RECEIVING_HOSPITAL.name} recibió la alerta de {labelName[label].toLowerCase()} del
            paciente {app.session.patientCode}.
          </Text>
          <Button label="Volver al monitoreo" onPress={() => nav.reset({ name: 'monitor' })} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Confirmar Alerta" onBack={nav.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.center}>
          <Badge label={`ALERTA CRÍTICA — ${labelShort[label]}`} color={color} />
        </View>

        <Card borderColor={color}>
          <Row label="Paciente" value={`${app.session.patientCode} (Anónimo)`} />
          <Row label="Clasificación" value={labelName[label]} valueColor={color} />
          <Row label="Confianza" value={`${Math.round(p.confidence * 100)}%`} />
          <Row label="Fecha y hora" value={timestamp.toLocaleString()} />
        </Card>

        <SectionLabel>Destino y datos adjuntos</SectionLabel>
        <Card style={styles.gap}>
          <Text style={styles.hospital}>{RECEIVING_HOSPITAL.name}</Text>
          <Text style={styles.muted}>{RECEIVING_HOSPITAL.unit}</Text>
          <View style={styles.chips}>
            {['Segmento ECG', 'Ubicación GPS', 'Datos vitales', 'Clasificación IA'].map(c => (
              <Badge key={c} label={c} color={colors.muted} />
            ))}
          </View>
          <Text style={styles.coords}>
            {locating
              ? 'Obteniendo ubicación…'
              : coords
                ? `📍 ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
                : 'Ubicación no disponible (se enviará sin GPS)'}
          </Text>
        </Card>

        <Card>
          <Text style={styles.notice}>
            Esta alerta notificará inmediatamente al equipo de urgencias del hospital receptor.
          </Text>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={sending ? 'Enviando…' : 'Enviar Alerta al Hospital'}
          variant="danger"
          disabled={sending || locating}
          onPress={submit}
        />
        <Button label="Cancelar" variant="ghost" onPress={nav.back} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { alignItems: 'center' },
  gap: { gap: 6 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  hospital: { color: colors.text, fontWeight: '700', fontSize: 15 },
  muted: { color: colors.muted, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  coords: { color: colors.muted, fontSize: 11, fontFamily: mono, marginTop: 6 },
  notice: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 12, textAlign: 'center' },
  sent: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  sentIcon: { color: colors.accent, fontSize: 56, textAlign: 'center' },
  sentTitle: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sentText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginBottom: 12 },
});
