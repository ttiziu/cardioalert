import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createUser, listUsers } from '../data/repo';
import type { AppUser, StaffRole } from '../data/types';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import {
  Badge,
  Button,
  Card,
  Header,
  Screen,
  SectionLabel,
} from '../ui/components';
import { FadeIn, PressableScale } from '../ui/motion';
import { colors, mono } from '../ui/theme';

const ROLES: { value: StaffRole; label: string; hint: string }[] = [
  {
    value: 'paramedico',
    label: 'Paramédico',
    hint: 'Conecta el Polar y envía alertas',
  },
  { value: 'medico', label: 'Médico', hint: 'Recibe y responde alertas' },
];

const ROLE_BADGE: Record<AppUser['role'], { label: string; color: string }> = {
  paramedico: { label: 'PARAMÉDICO', color: colors.accent },
  medico: { label: 'MÉDICO', color: '#5B9BE0' },
  admin: { label: 'ADMIN', color: colors.warning },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(
  fullName: string,
  email: string,
  password: string,
): string | null {
  if (fullName.trim().length < 3)
    return 'Escribe el nombre completo (mínimo 3 letras).';
  if (!EMAIL.test(email.trim())) return 'El correo no tiene un formato válido.';
  if (password.length < 8)
    return 'La contraseña debe tener al menos 8 caracteres.';
  return null;
}

export default function AdminScreen() {
  const { user, logout } = useApp();
  const nav = useNav();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<StaffRole>('paramedico');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<AppUser | null>(null);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
      setListError(null);
    } catch (e) {
      setListError(
        e instanceof Error
          ? e.message
          : 'No se pudo cargar la lista de usuarios',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const problem = validate(fullName, email, password);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setCreated(null);
    setSaving(true);
    try {
      const newUser = await createUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      setCreated(newUser);
      setFullName('');
      setEmail('');
      setPassword('');
      load();
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : 'No se pudo crear el usuario',
      );
    } finally {
      setSaving(false);
    }
  };

  const exit = async () => {
    await logout();
    nav.reset({ name: 'login' });
  };

  return (
    <Screen>
      <Header title="Administración" subtitle={user?.email} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={colors.accent}
            />
          }
        >
          <FadeIn>
            <SectionLabel>Crear usuario</SectionLabel>
            <Card style={styles.form}>
              <Text style={styles.label}>NOMBRE COMPLETO</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Carlos Ramos"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
              />

              <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="carlos.ramos@hospital.pe"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoComplete="off"
                keyboardType="email-address"
              />

              <Text style={styles.label}>CONTRASEÑA INICIAL</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="off"
                />
                <PressableScale
                  onPress={() => setShowPassword(v => !v)}
                  style={styles.showButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  <Text style={styles.showText}>
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </Text>
                </PressableScale>
              </View>

              <Text style={styles.label}>ROL</Text>
              <View style={styles.roles}>
                {ROLES.map(r => {
                  const active = role === r.value;
                  return (
                    <PressableScale
                      key={r.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => setRole(r.value)}
                      style={[styles.role, active && styles.roleActive]}
                    >
                      <Text
                        style={[
                          styles.roleTitle,
                          active && styles.roleTitleActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                      <Text style={styles.roleHint}>{r.hint}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              {formError ? (
                <FadeIn key={formError} distance={4}>
                  <Text style={styles.error} accessibilityLiveRegion="polite">
                    {formError}
                  </Text>
                </FadeIn>
              ) : null}
              {created ? (
                <FadeIn key={created.id} distance={4}>
                  <Text style={styles.success} accessibilityLiveRegion="polite">
                    ✓ Cuenta creada: {created.email} (
                    {ROLE_BADGE[created.role].label.toLowerCase()}). Ya puede
                    iniciar sesión con la contraseña que definiste.
                  </Text>
                </FadeIn>
              ) : null}

              <Button
                label={saving ? 'Creando…' : 'Crear usuario'}
                onPress={submit}
                disabled={saving}
              />
            </Card>
          </FadeIn>

          <FadeIn delay={100}>
            <SectionLabel>{`Usuarios (${users.length})`}</SectionLabel>
            {listError ? <Text style={styles.error}>{listError}</Text> : null}
            <View style={styles.list}>
              {users.map((u, i) => (
                <FadeIn key={u.id} delay={Math.min(i, 8) * 40}>
                  <Card style={styles.userRow}>
                    <View style={styles.flex}>
                      <Text style={styles.userName}>
                        {u.fullName || u.email}
                      </Text>
                      <Text style={styles.userMeta}>{u.email}</Text>
                    </View>
                    <Badge
                      label={ROLE_BADGE[u.role].label}
                      color={ROLE_BADGE[u.role].color}
                    />
                  </Card>
                </FadeIn>
              ))}
            </View>
          </FadeIn>

          <Button
            label="Abrir Monitor Hospital"
            variant="ghost"
            onPress={() => nav.push({ name: 'hospital' })}
          />
          <Button label="Cerrar sesión" variant="ghost" onPress={exit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  form: { gap: 4 },
  label: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  showButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  roles: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  role: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  roleActive: { borderColor: colors.accent, backgroundColor: '#10D6A31F' },
  roleTitle: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  roleTitleActive: { color: colors.accent },
  roleHint: { color: colors.muted, fontSize: 11, marginTop: 3 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 10 },
  success: {
    color: colors.accent,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 19,
  },
  list: { gap: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  userMeta: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: mono,
    marginTop: 3,
  },
});
