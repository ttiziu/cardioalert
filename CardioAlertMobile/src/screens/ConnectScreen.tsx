import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNav } from '../nav';
import { useApp } from '../state/AppState';
import { Button, Card, Header, Row, Screen, SectionLabel } from '../ui/components';
import { colors, mono } from '../ui/theme';

const signalBars = (rssi: number) => (rssi > -60 ? '▂▄▆█' : rssi > -75 ? '▂▄▆' : '▂▄');

export default function ConnectScreen() {
  const app = useApp();
  const nav = useNav();
  const connected = app.connection === 'connected';

  return (
    <Screen>
      <Header title="Conectar Sensor" onBack={nav.back} />
      <FlatList
        contentContainerStyle={styles.content}
        data={app.devices}
        keyExtractor={d => d.deviceId}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={[styles.bt, connected && styles.btOn]}>
              <Text style={[styles.btIcon, connected && { color: colors.accent }]}>ᛒ</Text>
            </View>
            <Text style={[styles.status, connected && { color: colors.accent }]}>
              {connected
                ? 'Conectado ✓'
                : app.connection === 'connecting'
                  ? 'Conectando…'
                  : app.scanning
                    ? 'Buscando dispositivos…'
                    : 'Sin conexión'}
            </Text>
            {connected ? (
              <Text style={styles.deviceLine}>
                {app.deviceName} · {app.deviceId}
              </Text>
            ) : null}
            {app.scanning ? <ActivityIndicator color={colors.accent} /> : null}
            <SectionLabel>Dispositivos encontrados</SectionLabel>
          </View>
        }
        ListEmptyComponent={
          !app.scanning ? (
            <Text style={styles.empty}>
              Colócale la banda al paciente (electrodos humedecidos) y toca “Buscar”.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => {
          const active = item.deviceId === app.deviceId && connected;
          return (
            <Pressable onPress={() => app.connect(item.deviceId)}>
              <Card style={styles.device} borderColor={active ? colors.accent : undefined}>
                <View style={styles.flex}>
                  <Text style={styles.deviceName}>{item.name || 'Polar'}</Text>
                  <Text style={styles.deviceId}>{item.deviceId}</Text>
                </View>
                <Text style={styles.rssi}>
                  {signalBars(item.rssi)} {item.rssi} dBm
                </Text>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            {connected ? (
              <Card>
                <Text style={styles.infoTitle}>Información del Sensor</Text>
                <Row label="Batería" value={app.battery !== null ? `${app.battery}%` : '--'} />
                <Row label="ID" value={app.deviceId ?? '--'} />
                <Row label="Frecuencia ECG" value="130 Hz" />
              </Card>
            ) : null}
            {app.bleError ? <Text style={styles.error}>{app.bleError}</Text> : null}
            {connected ? (
              <>
                <Button label="Iniciar Monitoreo" onPress={() => nav.replace({ name: 'monitor' })} />
                <Button label="Desconectar" variant="ghost" onPress={app.disconnect} />
              </>
            ) : (
              <Button
                label={app.scanning ? 'Buscando…' : 'Buscar Polar H10'}
                onPress={app.scan}
                disabled={app.scanning}
              />
            )}
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  flex: { flex: 1 },
  headerBlock: { alignItems: 'center', gap: 8, marginBottom: 6 },
  bt: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  btOn: { borderColor: colors.accent, backgroundColor: '#10D6A314' },
  btIcon: { color: colors.muted, fontSize: 28 },
  status: { color: colors.muted, fontSize: 16, fontWeight: '700' },
  deviceLine: { color: colors.muted, fontSize: 12, fontFamily: mono, marginBottom: 12 },
  empty: { color: colors.muted, textAlign: 'center', fontSize: 13, marginVertical: 12 },
  device: { flexDirection: 'row', alignItems: 'center' },
  deviceName: { color: colors.text, fontWeight: '700' },
  deviceId: { color: colors.muted, fontSize: 11, fontFamily: mono, marginTop: 2 },
  rssi: { color: colors.accent, fontSize: 11, fontFamily: mono },
  footer: { gap: 10, marginTop: 8 },
  infoTitle: { color: colors.accent, fontWeight: '700', marginBottom: 4 },
  error: { color: colors.danger, fontSize: 12, textAlign: 'center' },
});
