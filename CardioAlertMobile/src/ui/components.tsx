import { memo, useMemo, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { PressableScale, Pulse, useAnimatedValue } from './motion';
import { colors, mono } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <PressableScale
          onPress={onBack}
          style={styles.back}
          hitSlop={12}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backText}>‹</Text>
        </PressableScale>
      ) : null}
      <View style={styles.flex}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({
  children,
  style,
  borderColor,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  onPress?: () => void;
}) {
  const cardStyle = [styles.card, borderColor ? { borderColor } : null, style];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <PressableScale
      onPress={onPress}
      style={cardStyle}
      scaleTo={0.985}
      accessibilityRole="button"
    >
      {children}
    </PressableScale>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children.toUpperCase()}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = {
    primary: { bg: colors.accent, fg: colors.accentText },
    danger: { bg: colors.danger, fg: '#FFFFFF' },
    ghost: { bg: colors.card, fg: colors.text },
  }[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: palette.bg, opacity: disabled ? 0.4 : 1 },
        variant === 'ghost' && styles.buttonGhost,
        variant !== 'ghost' &&
          !disabled && [styles.buttonGlow, { shadowColor: palette.bg }],
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: palette.fg }]}>{label}</Text>
    </PressableScale>
  );
}

export function Badge({
  label,
  color,
  live,
}: {
  label: string;
  color: string;
  /** Muestra un punto que late antes del texto (estado en vivo). */
  live?: boolean;
}) {
  return (
    <View
      style={[
        styles.badge,
        { borderColor: color, backgroundColor: `${color}1F` },
      ]}
    >
      {live ? (
        <Pulse
          periodMs={1400}
          minOpacity={0.35}
          maxScale={1.25}
          style={styles.badgeDotWrap}
        >
          <View style={[styles.badgeDot, { backgroundColor: color }]} />
        </Pulse>
      ) : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Metric({
  label,
  value,
  unit,
  color = colors.text,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
  icon?: ReactNode;
}) {
  return (
    <Card style={styles.metric}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
        {icon}
      </View>
      <Text
        style={[styles.metricValue, { color }]}
        accessibilityLabel={`${label}: ${value} ${unit ?? ''}`}
      >
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
    </Card>
  );
}

export function ConfidenceBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  const progress = useAnimatedValue(value, 700);
  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[
          styles.barFill,
          { backgroundColor: color, transform: [{ scaleX: progress }] },
        ]}
      />
    </View>
  );
}

export function Row({
  label,
  value,
  valueColor = colors.text,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function DemoTag({ label = 'MODO DEMO' }: { label?: string }) {
  return <Badge label={label} color={colors.warning} />;
}

/** Indica de dónde sale el diagnóstico que se está mostrando. */
export function SourceTag({ source }: { source: 'modelo' | 'simulacion' }) {
  return source === 'modelo' ? (
    <Badge label="MODELO IA" color={colors.accent} />
  ) : (
    <DemoTag label="SIMULADO" />
  );
}

/** Cuadrícula de papel de ECG: líneas finas cada 5 px de celda y gruesas cada 5 celdas. */
// memo: la cuadrícula es fija; sin esto se redibujaría con cada paquete de ECG (10 veces/s).
const EcgGrid = memo(function EcgGrid({ width, height }: { width: number; height: number }) {
  const lines = useMemo(() => {
    const cell = 10;
    const out: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      major: boolean;
    }[] = [];
    for (let x = 0, i = 0; x <= width; x += cell, i++) {
      out.push({ x1: x, y1: 0, x2: x, y2: height, major: i % 5 === 0 });
    }
    for (let y = 0, i = 0; y <= height; y += cell, i++) {
      out.push({ x1: 0, y1: y, x2: width, y2: y, major: i % 5 === 0 });
    }
    return out;
  }, [width, height]);
  return (
    <>
      {lines.map((l, i) => (
        <Line
          key={i}
          {...l}
          stroke={l.major ? '#1B3A2E' : '#10221B'}
          strokeWidth={l.major ? 1 : 0.5}
        />
      ))}
    </>
  );
});

/**
 * Traza el ECG sobre papel milimetrado. `heat` (0..1 por tramo) pinta el mapa XAI
 * detrás; `live` agrega el punto brillante al final del trazo, como un monitor.
 */
export function EcgChart({
  samples,
  width,
  height,
  color = colors.ecg,
  heat,
  live,
  grid = true,
}: {
  samples: number[];
  width: number;
  height: number;
  color?: string;
  heat?: number[];
  live?: boolean;
  grid?: boolean;
}) {
  let points = '';
  let last: { x: number; y: number } | null = null;
  if (samples.length > 1) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of samples) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min || 1;
    const stepX = width / (samples.length - 1);
    const pad = height * 0.1;
    const y = (v: number) =>
      height - pad - ((v - min) / span) * (height - 2 * pad);
    points = samples
      .map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ');
    last = { x: width, y: y(samples[samples.length - 1]) };
  }
  const cell = heat && heat.length ? width / heat.length : 0;
  return (
    <Svg width={width} height={height}>
      {grid ? <EcgGrid width={width} height={height} /> : null}
      {heat?.map((h, i) =>
        h > 0.15 ? (
          <Rect
            key={i}
            x={i * cell}
            y={0}
            width={cell + 0.5}
            height={height}
            fill={h > 0.6 ? colors.danger : colors.warning}
            opacity={0.15 + h * 0.5}
          />
        ) : null,
      )}
      {points ? (
        <>
          {/* Halo suave debajo del trazo: da el brillo de fósforo de un monitor */}
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeOpacity={0.18}
            strokeWidth={5}
          />
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={1.6}
          />
        </>
      ) : null}
      {live && last ? (
        <>
          <Circle
            cx={last.x - 3}
            cy={last.y}
            r={7}
            fill={color}
            opacity={0.2}
          />
          <Circle cx={last.x - 3} cy={last.y} r={3} fill={color} />
        </>
      ) : null}
    </Svg>
  );
}

export function HeartLogo({
  size = 56,
  beat = true,
}: {
  size?: number;
  beat?: boolean;
}) {
  return (
    <Pulse active={beat} periodMs={1000} maxScale={1.06}>
      <View style={[styles.logo, { width: size + 24, height: size + 24 }]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.3 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.7 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z"
            fill="none"
            stroke={colors.accent}
            strokeWidth={1.6}
          />
          <Polyline
            points="4,12 8,12 9.5,9 11.5,15 13,11 14,12 20,12"
            fill="none"
            stroke={colors.accent}
            strokeWidth={1.6}
          />
        </Svg>
      </View>
    </Pulse>
  );
}

/** Corazón pequeño que late al ritmo de la frecuencia cardíaca medida. */
export function HeartBeat({
  bpm,
  color = colors.danger,
}: {
  bpm: number | null;
  color?: string;
}) {
  return (
    <Pulse
      active={bpm !== null}
      periodMs={bpm ? 60000 / bpm : 1000}
      maxScale={1.3}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path
          d="M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.3 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.7 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z"
          fill={color}
        />
      </Svg>
    </Pulse>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.text, fontSize: 26, lineHeight: 28, marginTop: -2 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  section: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.border },
  buttonGlow: {
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDotWrap: { width: 7, height: 7 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: mono,
    letterSpacing: 0.5,
  },
  metric: { flex: 1, padding: 12 },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: mono,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: mono,
    marginTop: 4,
  },
  metricUnit: { fontSize: 11, color: colors.muted, fontWeight: '400' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    transformOrigin: 'left',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600', fontFamily: mono },
  logo: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: '#10D6A314',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
