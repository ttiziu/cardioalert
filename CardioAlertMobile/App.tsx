import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavProvider, useNav } from './src/nav';
import AdminScreen from './src/screens/AdminScreen';
import ConfirmAlertScreen from './src/screens/ConfirmAlertScreen';
import ConnectScreen from './src/screens/ConnectScreen';
import HospitalScreen from './src/screens/HospitalScreen';
import LoginScreen from './src/screens/LoginScreen';
import MonitorScreen from './src/screens/MonitorScreen';
import ResultScreen from './src/screens/ResultScreen';
import TabsScreen from './src/screens/TabsScreen';
import XaiScreen from './src/screens/XaiScreen';
import { AppProvider, useApp } from './src/state/AppState';
import { Button, Header, Screen } from './src/ui/components';
import { FadeIn } from './src/ui/motion';
import { colors } from './src/ui/theme';

function HospitalRoute() {
  const nav = useNav();
  const { user, logout } = useApp();
  const isDoctor = user?.role === 'medico';
  return (
    <Screen>
      <Header
        title="Monitor Hospital"
        subtitle="Alertas entrantes en tiempo real"
        onBack={isDoctor ? undefined : nav.back}
      />
      <HospitalScreen canRespond />
      {isDoctor ? (
        <Button
          label="Cerrar sesión"
          variant="ghost"
          style={styles.logout}
          onPress={async () => {
            await logout();
            nav.reset({ name: 'login' });
          }}
        />
      ) : null}
    </Screen>
  );
}

function Router() {
  const { route } = useNav();
  // Cambiar la key remonta el FadeIn: cada pantalla nueva entra con un fundido corto.
  // Las pestañas comparten key para que la barra no se remonte y su indicador se deslice.
  return (
    <FadeIn key={route.name} distance={8} style={styles.safe}>
      <Route />
    </FadeIn>
  );
}

function Route() {
  const { route } = useNav();
  switch (route.name) {
    case 'login':
      return <LoginScreen />;
    case 'tabs':
      return <TabsScreen tab={route.tab} />;
    case 'connect':
      return <ConnectScreen />;
    case 'monitor':
      return <MonitorScreen />;
    case 'result':
      return <ResultScreen />;
    case 'xai':
      return <XaiScreen />;
    case 'confirm':
      return <ConfirmAlertScreen />;
    case 'hospital':
      return <HospitalRoute />;
    case 'admin':
      return <AdminScreen />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>
        <AppProvider>
          <NavProvider>
            <Router />
          </NavProvider>
        </AppProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  logout: { margin: 16 },
});
