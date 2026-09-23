import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DEMO_MODE } from '../config';
import type { UserRole } from '../lib/supabase';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import { Button, DemoTag, HeartLogo, Screen } from '../ui/components';
import { FadeIn, PressableScale } from '../ui/motion';
import { colors } from '../ui/theme';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'paramedico', label: 'Paramédico' },
  { value: 'medico', label: 'Médico' },
  { value: 'admin', label: 'Admin' },
];

export default function LoginScreen() {
  const { login } = useApp();
  const nav = useNav();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('paramedico');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password, role);
      nav.reset(
        role === 'medico'
          ? { name: 'hospital' }
          : { name: 'tabs', tab: 'monitoreo' },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <FadeIn style={styles.brand} distance={20}>
            <HeartLogo />
            <Text style={styles.name}>CardioAlert</Text>
            <Text style={styles.tagline}>Sistema de Soporte Clínico</Text>
            {DEMO_MODE ? <DemoTag /> : null}
          </FadeIn>

          <FadeIn delay={120}>
            <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="carlos.ramos@samu.gob.pe"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />

            <Text style={styles.label}>CONTRASEÑA</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoComplete="password"
            />
          </FadeIn>

          <FadeIn delay={220}>
            <Text style={styles.label}>ROL DE USUARIO</Text>
            <View style={styles.roles}>
              {ROLES.map(r => (
                <PressableScale
                  key={r.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: role === r.value }}
                  onPress={() => setRole(r.value)}
                  style={[styles.role, role === r.value && styles.roleActive]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === r.value && styles.roleTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {error ? (
              <FadeIn key={error} distance={4}>
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              </FadeIn>
            ) : null}

            <Button
              label={loading ? 'Ingresando…' : 'Iniciar Sesión'}
              onPress={submit}
              disabled={loading}
              style={styles.submit}
            />
          </FadeIn>

          {DEMO_MODE ? (
            <Text style={styles.hint}>
              Modo demo: cualquier correo y contraseña funcionan.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 48 },
  brand: { alignItems: 'center', gap: 6, marginBottom: 36 },
  name: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 12 },
  tagline: { color: colors.muted, fontSize: 13, marginBottom: 6 },
  label: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  roles: { flexDirection: 'row', gap: 8 },
  role: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  roleText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  roleTextActive: { color: colors.accentText },
  error: { color: colors.danger, marginTop: 16, fontSize: 13 },
  submit: { marginTop: 28 },
  hint: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
  },
});
