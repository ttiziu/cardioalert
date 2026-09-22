import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { BackHandler } from 'react-native';

export type Tab = 'monitoreo' | 'historial' | 'alertas' | 'perfil';

export type Route =
  | { name: 'login' }
  | { name: 'tabs'; tab: Tab }
  | { name: 'connect' }
  | { name: 'monitor' }
  | { name: 'result' }
  | { name: 'xai' }
  | { name: 'confirm' }
  | { name: 'hospital' };

type Nav = {
  route: Route;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  back: () => void;
  reset: (r: Route) => void;
};

const NavContext = createContext<Nav | null>(null);

export function useNav() {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav fuera de NavProvider');
  return nav;
}

// ponytail: pila de rutas en estado; react-navigation si hacen falta transiciones o deep links.
export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'login' }]);

  const push = useCallback((r: Route) => setStack(s => [...s, r]), []);
  const replace = useCallback(
    (r: Route) => setStack(s => [...s.slice(0, -1), r]),
    [],
  );
  const back = useCallback(
    () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
    [],
  );
  const reset = useCallback((r: Route) => setStack([r]), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [stack.length, back]);

  const value = useMemo(
    () => ({ route: stack[stack.length - 1], push, replace, back, reset }),
    [stack, push, replace, back, reset],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
