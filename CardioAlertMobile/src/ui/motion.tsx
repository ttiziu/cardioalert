import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** Respeta "Quitar animaciones" de la accesibilidad de Android. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

/** Aparece subiendo levemente. `delay` permite escalonar listas. */
export function FadeIn({
  children,
  delay = 0,
  distance = 12,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? 0 : 420,
      delay: reduced ? 0 : delay,
      easing: EASE_OUT,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Pressable que se hunde un poco al tocarlo: da respuesta táctil sin vibrar. */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: value === 1 ? 6 : 0,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable
      {...props}
      onPressIn={e => {
        if (!reduced) to(scaleTo);
        props.onPressIn?.(e);
      }}
      onPressOut={e => {
        if (!reduced) to(1);
        props.onPressOut?.(e);
      }}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Latido en bucle. `periodMs` permite sincronizarlo con la frecuencia cardíaca. */
export function Pulse({
  children,
  periodMs = 1200,
  minScale = 1,
  maxScale = 1.15,
  minOpacity = 1,
  active = true,
  style,
}: {
  children: ReactNode;
  periodMs?: number;
  minScale?: number;
  maxScale?: number;
  minOpacity?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || reduced) {
      t.setValue(0);
      return;
    }
    const beat = Math.max(250, periodMs);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: beat * 0.18,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: beat * 0.82,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, periodMs, active, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [minOpacity, 1] }),
          transform: [
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [minScale, maxScale] }) },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Anillo que se expande y desvanece, como un radar. Varios desfasados = búsqueda BLE. */
export function Ripple({
  size,
  color,
  delay = 0,
  durationMs = 1800,
}: {
  size: number;
  color: string;
  delay?: number;
  durationMs?: number;
}) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay, durationMs, reduced]);

  if (reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
      }}
    />
  );
}

/** Valor 0..1 animado hacia `value`: para barras de confianza y transiciones de estado. */
export function useAnimatedValue(value: number, duration = 600) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: reduced ? 0 : duration,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [anim, value, duration, reduced]);
  return anim;
}
