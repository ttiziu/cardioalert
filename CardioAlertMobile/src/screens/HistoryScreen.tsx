import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { listSessions } from '../data/repo';
import type { Session } from '../data/types';
import type { Label } from '../ml/types';
import { Badge, Card } from '../ui/components';
import { colors, labelColor, labelShort, mono } from '../ui/theme';

const FILTERS: { value: Label | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'afib', label: 'AFib' },
  { value: 'isquemia', label: 'Isquemia' },
  { value: 'normal', label: 'Normal' },
];

const duration = (s: Session) => {
  if (!s.endedAt) return 'en curso';
  const secs = Math.round((+new Date(s.endedAt) - +new Date(s.startedAt)) / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
};

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<Label | 'todas'>('todas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await listSessions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = filter === 'todas' ? sessions : sessions.filter(s => s.label === filter);

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.filter, filter === f.value && styles.filterActive]}>
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={styles.list}
        data={visible}
        keyExtractor={s => s.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          loading ? undefined : <Text style={styles.empty}>No hay sesiones para este filtro.</Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.patient}>Paciente #{item.patientCode}</Text>
              <Text style={styles.meta}>
                {new Date(item.startedAt).toLocaleString()} · {duration(item)}
              </Text>
            </View>
            <View style={styles.right}>
              <Badge label={labelShort[item.label]} color={labelColor[item.label]} />
              {item.confidence > 0 ? (
                <Text style={styles.meta}>Conf. {Math.round(item.confidence * 100)}%</Text>
              ) : null}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.accentText },
  list: { padding: 16, gap: 10, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  patient: { color: colors.text, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 11, fontFamily: mono, marginTop: 4 },
  right: { alignItems: 'flex-end' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  error: { color: colors.danger, textAlign: 'center', fontSize: 12 },
});
