import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { TARGET_SAMPLE_RATE } from '../signal/preprocess';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import { Button, Card, DemoTag, EcgChart, Header, Screen, SectionLabel } from '../ui/components';
import { colors, labelColor, labelName, mono } from '../ui/theme';

const SEGMENT_SECONDS = 0.05;

function topRegions(heat: number[], n = 3) {
  return heat
    .map((v, i) => ({ v, start: i * SEGMENT_SECONDS }))
    .filter(r => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
}

export default function XaiScreen() {
  const app = useApp();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const p = app.prediction;

  const { heatmap, xaiRunning, runXai } = app;
  useEffect(() => {
    if (!heatmap && !xaiRunning) runXai();
    // Solo al entrar: calcula el mapa si todavía no existe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const color = p ? labelColor[p.label] : colors.muted;
  const regions = heatmap ? topRegions(heatmap) : [];
  const high = heatmap ? heatmap.filter(v => v > 0.6).length : 0;
  const mid = heatmap ? heatmap.filter(v => v > 0.15 && v <= 0.6).length : 0;

  return (
    <Screen>
      <Header
        title="Explicación del Modelo IA"
        subtitle="Mapa de activación por perturbación"
        onBack={nav.back}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.chart}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartMeta}>Ventana analizada · 10 s · {TARGET_SAMPLE_RATE} Hz</Text>
            {app.modelSource === 'demo' ? <DemoTag /> : null}
          </View>
          {app.lastWindow ? (
            <EcgChart
              samples={app.lastWindow}
              width={width - 32}
              height={170}
              heat={heatmap ?? undefined}
            />
          ) : (
            <Text style={styles.muted}>Sin ventana para explicar.</Text>
          )}
        </View>

        {xaiRunning ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.muted}>Perturbando tramos de 50 ms y midiendo la confianza…</Text>
          </View>
        ) : null}

        <SectionLabel>Zonas de activación</SectionLabel>
        <Card style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Media · {mid} tramos</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>Alta · {high} tramos</Text>
          </View>
        </Card>

        <SectionLabel>Tramos más influyentes</SectionLabel>
        <Card>
          {regions.length ? (
            regions.map(r => (
              <View key={r.start} style={styles.region}>
                <Text style={styles.regionTime}>
                  {r.start.toFixed(2)}–{(r.start + SEGMENT_SECONDS).toFixed(2)} s
                </Text>
                <View style={styles.regionBar}>
                  <View
                    style={[
                      styles.regionFill,
                      { width: `${Math.round(r.v * 100)}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <Text style={[styles.regionPct, { color }]}>{Math.round(r.v * 100)}%</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>{xaiRunning ? 'Calculando…' : 'Sin datos.'}</Text>
          )}
        </Card>

        {p ? (
          <Card>
            <Text style={styles.explain}>
              El modelo clasificó la ventana como{' '}
              <Text style={{ color, fontWeight: '700' }}>{labelName[p.label].toLowerCase()}</Text>
              . Las zonas marcadas en rojo son las que, al ocultarlas, más reducen la confianza de
              esa clasificación: son las que más pesaron en la decisión.
            </Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button label="Cerrar" variant="ghost" onPress={nav.back} style={styles.flex} />
          <Button
            label="Enviar Alerta"
            variant="danger"
            disabled={!p || p.label === 'normal'}
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
  chart: { backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  chartMeta: { color: colors.muted, fontSize: 10, fontFamily: mono },
  muted: { color: colors.muted, fontSize: 12, padding: 4 },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'space-around' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  legendText: { color: colors.text, fontSize: 12 },
  region: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  regionTime: { color: colors.text, fontSize: 12, fontFamily: mono, width: 96 },
  regionBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border },
  regionFill: { height: 6, borderRadius: 3 },
  regionPct: { fontSize: 12, fontFamily: mono, width: 40, textAlign: 'right' },
  explain: { color: colors.text, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10 },
});
