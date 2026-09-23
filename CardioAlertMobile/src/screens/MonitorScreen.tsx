import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import {
  Badge,
  Button,
  Card,
  ConfidenceBar,
  SourceTag,
  EcgChart,
  HeartBeat,
  Header,
  Metric,
  Screen,
} from '../ui/components';
import { FadeIn, Pulse } from '../ui/motion';
import { colors, labelColor, labelName, mono } from '../ui/theme';

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
    s % 60,
  ).padStart(2, '0')}`;
};

export default function MonitorScreen() {
  const app = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(Date.now());

  const { monitoring, startMonitoring } = app;
  useEffect(() => {
    if (!monitoring) startMonitoring();
    // Solo al entrar a la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const finish = async () => {
    await app.stopMonitoring();
    nav.reset({ name: 'tabs', tab: 'monitoreo' });
  };

  const p = app.prediction;
  const color = p ? labelColor[p.label] : colors.muted;
  const waiting = !p;

  return (
    <Screen>
      <Header
        title={app.session ? app.session.patientCode : 'Sesión'}
        subtitle={app.simulated ? 'Señal simulada' : 'Sesión activa'}
        onBack={finish}
        right={
          <Badge
            label={app.startedAt ? clock(now - app.startedAt) : '00:00'}
            color={colors.danger}
            live
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.chart}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartMeta}>
              ECG · derivación única · {app.waveRate} Hz
            </Text>
            <View style={styles.live}>
              <Pulse periodMs={1200} minOpacity={0.3}>
                <View style={styles.liveDot} />
              </Pulse>
              <Text style={[styles.chartMeta, { color: colors.accent }]}>
                EN VIVO
              </Text>
            </View>
          </View>
          <EcgChart
            samples={app.wave}
            width={width - 32}
            height={180}
            color={
              p && p.label !== 'normal' && app.alertActive ? color : colors.ecg
            }
            live
          />
        </View>

        <View style={styles.metrics}>
          <Metric
            label="Frecuencia"
            value={app.hr !== null ? String(app.hr) : '--'}
            unit="BPM"
            icon={<HeartBeat bpm={app.hr} />}
          />
          <Metric
            label="Intervalo R-R"
            value={app.rrMs !== null ? String(app.rrMs) : '--'}
            unit="ms"
          />
        </View>

        <Pulse active={app.alertActive} periodMs={1600} maxScale={1.012}>
          <Card
            borderColor={waiting ? undefined : color}
            style={[
              styles.risk,
              app.alertActive && [
                styles.riskAlert,
                { shadowColor: color, backgroundColor: `${color}12` },
              ],
            ]}
          >
            {/* La key remonta el contenido: cada cambio de diagnóstico entra con un fundido */}
            <FadeIn
              key={waiting ? 'waiting' : p.label}
              distance={6}
              style={styles.riskBody}
            >
              <View style={styles.riskTop}>
                <Badge
                  label={
                    waiting ? 'ANALIZANDO…' : labelName[p.label].toUpperCase()
                  }
                  color={color}
                  live={waiting || app.alertActive}
                />
                <SourceTag source={app.modelSource} />
              </View>
              {waiting ? (
                <Text style={styles.muted}>
                  El modelo necesita 10 s de señal para la primera
                  clasificación.
                </Text>
              ) : (
                <>
                  <View style={styles.confRow}>
                    <Text style={styles.muted}>Confianza del modelo</Text>
                    <Text style={[styles.conf, { color }]}>
                      {Math.round(p.confidence * 100)}%
                    </Text>
                  </View>
                  <ConfidenceBar value={p.confidence} color={color} />
                </>
              )}
            </FadeIn>
          </Card>
        </Pulse>

        {app.modelError ? (
          <Text style={styles.modelError}>{app.modelError}</Text>
        ) : null}

        {app.alertActive ? (
          <FadeIn>
            <Text style={[styles.alertNote, { color }]}>
              Anomalía detectada sobre el umbral de alerta. Revisa la
              explicación IA.
            </Text>
          </FadeIn>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="Ver Explicación IA"
            variant="ghost"
            disabled={waiting}
            onPress={() => nav.push({ name: 'xai' })}
            style={styles.flex}
          />
          <Button
            label="Enviar Alerta"
            variant="danger"
            disabled={waiting || p.label === 'normal'}
            onPress={() => nav.push({ name: 'result' })}
            style={styles.flex}
          />
        </View>
        <Button label="Finalizar sesión" variant="ghost" onPress={finish} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  flex: { flex: 1 },
  chart: { backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    paddingBottom: 0,
  },
  chartMeta: { color: colors.muted, fontSize: 10, fontFamily: mono },
  metrics: { flexDirection: 'row', gap: 10 },
  risk: {},
  riskBody: { gap: 10 },
  riskAlert: {
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  riskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confRow: { flexDirection: 'row', justifyContent: 'space-between' },
  conf: { fontSize: 16, fontWeight: '800', fontFamily: mono },
  muted: { color: colors.muted, fontSize: 12 },
  modelError: { color: colors.danger, fontSize: 11, textAlign: 'center' },
  alertNote: { fontSize: 12, textAlign: 'center', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
});
