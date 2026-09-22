import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';
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
        <Pressable onPress={onBack} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
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
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
}) {
  return (
    <View style={[styles.card, borderColor ? { borderColor } : null, style]}>
      {children}
    </View>
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
  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.danger
        : colors.card;
  const fg =
    variant === 'primary'
      ? colors.accentText
      : variant === 'danger'
        ? '#FFFFFF'
        : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'ghost' && styles.buttonGhost,
        style,
      ]}>
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}1F` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Metric({
  label,
  value,
  unit,
  color = colors.text,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.metricValue, { color }]}>
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
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${Math.round(value * 100)}%`, backgroundColor: color },
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

export function DemoTag() {
  return <Badge label="MODO DEMO" color={colors.warning} />;
}

/** Traza el ECG escalando al alto disponible; `heat` (0..1 por tramo) pinta el mapa XAI detrás. */
export function EcgChart({
  samples,
  width,
  height,
  color = colors.ecg,
  heat,
}: {
  samples: number[];
  width: number;
  height: number;
  color?: string;
  heat?: number[];
}) {
  let points = '';
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
    points = samples
      .map(
        (v, i) =>
          `${(i * stepX).toFixed(1)},${(height - pad - ((v - min) / span) * (height - 2 * pad)).toFixed(1)}`,
      )
      .join(' ');
  }
  const cell = heat && heat.length ? width / heat.length : 0;
  return (
    <Svg width={width} height={height}>
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
        <Polyline points={points} fill="none" stroke={color} strokeWidth={1.6} />
      ) : null}
    </Svg>
  );
}

export function HeartLogo({ size = 56 }: { size?: number }) {
  return (
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
  buttonText: { fontSize: 15, fontWeight: '700' },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: mono, letterSpacing: 0.5 },
  metric: { flex: 1, padding: 12 },
  metricLabel: { color: colors.muted, fontSize: 10, letterSpacing: 0.8, fontFamily: mono },
  metricValue: { fontSize: 24, fontWeight: '700', fontFamily: mono, marginTop: 4 },
  metricUnit: { fontSize: 11, color: colors.muted, fontWeight: '400' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
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
