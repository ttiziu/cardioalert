import type { Label } from '../ml/types';

export const colors = {
  bg: '#0B0F14',
  card: '#141A21',
  cardAlt: '#1A222B',
  border: '#232D38',
  text: '#F2F5F7',
  muted: '#8A97A3',
  accent: '#10D6A3',
  accentText: '#04241B',
  danger: '#FF4D5E',
  warning: '#FFA630',
  ecg: '#19E68C',
};

export const labelColor: Record<Label, string> = {
  normal: colors.accent,
  afib: colors.warning,
  isquemia: colors.danger,
};

export const labelName: Record<Label, string> = {
  normal: 'Normal',
  afib: 'Fibrilación auricular',
  isquemia: 'Isquemia miocárdica',
};

export const labelShort: Record<Label, string> = {
  normal: 'NORMAL',
  afib: 'AFIB',
  isquemia: 'ISQUEMIA',
};

export const mono = 'monospace';
