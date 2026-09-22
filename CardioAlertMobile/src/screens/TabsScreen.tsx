import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNav, type Tab } from '../nav';
import { Header, Screen } from '../ui/components';
import { colors } from '../ui/theme';
import HistoryScreen from './HistoryScreen';
import HomeScreen from './HomeScreen';
import HospitalScreen from './HospitalScreen';
import ProfileScreen from './ProfileScreen';

const TABS: { tab: Tab; label: string; icon: string; title?: string }[] = [
  { tab: 'monitoreo', label: 'Monitoreo', icon: '∿' },
  { tab: 'historial', label: 'Historial', icon: '◷', title: 'Historial de Sesiones' },
  { tab: 'alertas', label: 'Alertas', icon: '◬', title: 'Alertas Enviadas' },
  { tab: 'perfil', label: 'Perfil', icon: '◯', title: 'Perfil' },
];

export default function TabsScreen({ tab }: { tab: Tab }) {
  const nav = useNav();
  const current = TABS.find(t => t.tab === tab)!;

  return (
    <Screen>
      {current.title ? <Header title={current.title} /> : null}
      <View style={styles.body}>
        {tab === 'monitoreo' ? <HomeScreen /> : null}
        {tab === 'historial' ? <HistoryScreen /> : null}
        {tab === 'alertas' ? <HospitalScreen canRespond={false} /> : null}
        {tab === 'perfil' ? <ProfileScreen /> : null}
      </View>
      <View style={styles.bar}>
        {TABS.map(t => {
          const active = t.tab === tab;
          return (
            <Pressable
              key={t.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => nav.replace({ name: 'tabs', tab: t.tab })}
              style={styles.item}>
              <Text style={[styles.icon, active && styles.active]}>{t.icon}</Text>
              <Text style={[styles.label, active && styles.active]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  icon: { color: colors.muted, fontSize: 18 },
  label: { color: colors.muted, fontSize: 11 },
  active: { color: colors.accent, fontWeight: '700' },
});
