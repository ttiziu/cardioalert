import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ALERT_THRESHOLD, DEMO_MODE } from '../config';
import { LABELS } from '../ml/types';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import { Button, Card, Row, SectionLabel } from '../ui/components';
import { colors, labelColor, labelName } from '../ui/theme';

export default function ProfileScreen() {
  const app = useApp();
  const nav = useNav();

  const logout = async () => {
    await app.logout();
    nav.reset({ name: 'login' });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.name}>{app.user?.name}</Text>
        <Text style={styles.muted}>{app.user?.email}</Text>
        <Row label="Rol" value={app.user?.role ?? '--'} />
        <Row label="Modo" value={DEMO_MODE ? 'Demo (datos locales)' : 'Conectado a Supabase'} />
        <Row label="Umbral de alerta" value={`${Math.round(ALERT_THRESHOLD * 100)}%`} />
      </Card>

      <SectionLabel>Escenario de señal simulada</SectionLabel>
      <Card style={styles.gap}>
        <Text style={styles.muted}>
          Se usa solo cuando no hay un Polar H10 conectado, para demostrar cada flujo.
        </Text>
        <View style={styles.options}>
          {LABELS.map(l => {
            const active = app.scenario === l;
            return (
              <Pressable
                key={l}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => app.setScenario(l)}
                style={[
                  styles.option,
                  active && { borderColor: labelColor[l], backgroundColor: `${labelColor[l]}1F` },
                ]}>
                <Text style={[styles.optionText, active && { color: labelColor[l] }]}>
                  {labelName[l]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {app.user?.role !== 'paramedico' ? (
        <Button label="Abrir Monitor Hospital" variant="ghost" onPress={() => nav.push({ name: 'hospital' })} />
      ) : null}
      <Button label="Cerrar sesión" variant="ghost" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  gap: { gap: 10 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  options: { gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  optionText: { color: colors.muted, fontWeight: '600' },
});
