import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ALERT_THRESHOLD, DEMO_MODE } from '../config';
import { MODEL_AVAILABLE, type ModelSource } from '../ml/classifier';
import { LABELS } from '../ml/types';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import { Button, Card, Row, SectionLabel } from '../ui/components';
import { FadeIn, PressableScale } from '../ui/motion';
import { colors, labelColor, labelName } from '../ui/theme';

const SOURCES: { value: ModelSource; title: string; hint: string }[] = [
  {
    value: 'modelo',
    title: 'Modelo IA',
    hint: 'Clasifica la señal con el CNN entrenado. Para pacientes reales.',
  },
  {
    value: 'simulacion',
    title: 'Simulación',
    hint: 'Muestra el escenario que elijas, para demostrar cada flujo.',
  },
];

export default function ProfileScreen() {
  const app = useApp();
  const nav = useNav();

  const logout = async () => {
    await app.logout();
    nav.reset({ name: 'login' });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <FadeIn>
        <Card>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(app.user?.name ?? '?')
                .split(' ')
                .map(w => w[0])
                .slice(0, 2)
                .join('')}
            </Text>
          </View>
          <Text style={styles.name}>{app.user?.name}</Text>
          <Text style={styles.muted}>{app.user?.email}</Text>
          <Row label="Rol" value={app.user?.role ?? '--'} />
          <Row label="Datos" value={DEMO_MODE ? 'Locales (demo)' : 'Supabase'} />
          <Row
            label="Umbral de alerta"
            value={`${Math.round(ALERT_THRESHOLD * 100)}%`}
          />
        </Card>
      </FadeIn>

      <FadeIn delay={100}>
        <SectionLabel>Diagnóstico</SectionLabel>
        <Card style={styles.gap}>
          <View style={styles.options}>
            {SOURCES.map(o => {
              const active = app.modelSource === o.value;
              const disabled = o.value === 'modelo' && !MODEL_AVAILABLE;
              return (
                <PressableScale
                  key={o.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled }}
                  disabled={disabled}
                  onPress={() => app.setModelSource(o.value)}
                  style={[
                    styles.option,
                    active && styles.optionActive,
                    disabled && styles.optionDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {active ? '● ' : '○ '}
                    {o.title}
                  </Text>
                  <Text style={styles.optionHint}>
                    {disabled
                      ? 'No disponible: falta configurar ML_API_URL'
                      : o.hint}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </Card>

        {app.modelSource === 'simulacion' ? (
          <FadeIn>
            <SectionLabel>Escenario simulado</SectionLabel>
            <Card style={styles.gap}>
              <Text style={styles.muted}>
                El diagnóstico mostrará este escenario, marcado como SIMULADO.
                {app.simulated
                  ? ' Sin Polar conectado, la onda también será simulada.'
                  : ' La onda y los BPM siguen siendo los reales del Polar.'}
              </Text>
              <View style={styles.options}>
                {LABELS.map(l => {
                  const active = app.scenario === l;
                  return (
                    <PressableScale
                      key={l}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => app.setScenario(l)}
                      style={[
                        styles.option,
                        active && {
                          borderColor: labelColor[l],
                          backgroundColor: `${labelColor[l]}1F`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          active && { color: labelColor[l] },
                        ]}
                      >
                        {active ? '● ' : '○ '}
                        {labelName[l]}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </Card>
          </FadeIn>
        ) : null}
      </FadeIn>

      {app.user?.role !== 'paramedico' ? (
        <Button
          label="Abrir Monitor Hospital"
          variant="ghost"
          onPress={() => nav.push({ name: 'hospital' })}
        />
      ) : null}
      <Button label="Cerrar sesión" variant="ghost" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  gap: { gap: 10 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10D6A31F',
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  options: { gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  optionText: { color: colors.muted, fontWeight: '600' },
  optionActive: { borderColor: colors.accent, backgroundColor: '#10D6A31F' },
  optionTextActive: { color: colors.accent },
  optionDisabled: { opacity: 0.45 },
  optionHint: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
