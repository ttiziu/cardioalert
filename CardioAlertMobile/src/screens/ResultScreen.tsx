import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LABELS } from '../ml/types';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import {
  Button,
  Card,
  ConfidenceBar,
  DemoTag,
  Header,
  Row,
  Screen,
  SectionLabel,
} from '../ui/components';
import { colors, labelColor, labelName, mono } from '../ui/theme';

const RECOMMENDATION = {
  normal: 'No se detectan patrones anómalos en la ventana analizada. Continúe el monitoreo.',
  afib: 'El sistema detecta un ritmo irregular compatible con fibrilación auricular. Confirme con evaluación clínica completa del paciente.',
  isquemia:
    'El sistema detecta patrones compatibles con isquemia miocárdica. Confirme con evaluación clínica completa del paciente.',
};

export default function ResultScreen() {
  const app = useApp();
  const nav = useNav();
  const p = app.prediction;

  if (!p) {
    return (
      <Screen>
        <Header title="Resultado de Clasificación" onBack={nav.back} />
        <Text style={styles.empty}>Todavía no hay una clasificación.</Text>
      </Screen>
    );
  }

  const color = labelColor[p.label];
  const anomaly = p.label !== 'normal';

  return (
    <Screen>
      <Header title="Resultado de Clasificación" onBack={nav.back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card borderColor={color} style={{ backgroundColor: `${color}14` }}>
          <Text style={[styles.kicker, { color }]}>
            {anomaly ? '⚠ DIAGNÓSTICO DETECTADO' : '✓ SIN ANOMALÍAS'}
          </Text>
          <Text style={[styles.diagnosis, { color }]}>
            {labelName[p.label].toUpperCase()}
            {anomaly ? ' DETECTADA' : ''}
          </Text>
          {app.modelSource === 'demo' ? <DemoTag /> : null}
        </Card>

        <Card style={styles.gap}>
          <View style={styles.confRow}>
            <Text style={styles.muted}>Confianza del modelo</Text>
            <Text style={[styles.conf, { color }]}>{Math.round(p.confidence * 100)}%</Text>
          </View>
          <ConfidenceBar value={p.confidence} color={color} />
        </Card>

        <SectionLabel>Probabilidad por clase</SectionLabel>
        <Card>
          {LABELS.map(l => (
            <Row
              key={l}
              label={labelName[l]}
              value={`${(p.probabilities[l] * 100).toFixed(1)}%`}
              valueColor={l === p.label ? labelColor[l] : colors.muted}
            />
          ))}
        </Card>

        <SectionLabel>Signos registrados</SectionLabel>
        <Card>
          <Row label="Frecuencia cardíaca" value={app.hr !== null ? `${app.hr} BPM` : '--'} />
          <Row label="Intervalo R-R" value={app.rrMs !== null ? `${app.rrMs} ms` : '--'} />
          <Row label="Paciente" value={app.session?.patientCode ?? '--'} />
        </Card>

        <Card style={styles.recommendation}>
          <Text style={styles.recTitle}>RECOMENDACIÓN CLÍNICA</Text>
          <Text style={styles.recText}>{RECOMMENDATION[p.label]}</Text>
          <Text style={styles.disclaimer}>
            Herramienta de soporte a la decisión: no reemplaza el criterio del profesional.
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button
            label="Ver IA"
            variant="ghost"
            onPress={() => nav.push({ name: 'xai' })}
            style={styles.flex}
          />
          <Button
            label="Enviar al Hospital"
            variant="danger"
            disabled={!anomaly}
            onPress={() => nav.push({ name: 'confirm' })}
            style={styles.flex}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  flex: { flex: 1 },
  gap: { gap: 10 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  kicker: { fontSize: 11, fontWeight: '700', fontFamily: mono, letterSpacing: 1, marginBottom: 6 },
  diagnosis: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  confRow: { flexDirection: 'row', justifyContent: 'space-between' },
  conf: { fontSize: 18, fontWeight: '800', fontFamily: mono },
  muted: { color: colors.muted, fontSize: 13 },
  recommendation: { borderColor: colors.warning, backgroundColor: '#FFA63010', gap: 8 },
  recTitle: { color: colors.warning, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  recText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  disclaimer: { color: colors.muted, fontSize: 11, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10 },
});
