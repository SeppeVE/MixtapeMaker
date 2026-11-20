export type Section =
  | 'info' | 'layout' | 'flaps' | 'background' | 'fonts'
  | 'spine' | 'back' | 'inside' | 'mixtape' | 'export' | 'presets';

export const SECTION_COLORS: Record<Section, { bg: string; fg: string }> = {
  info: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  presets: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  layout: { bg: 'var(--color-mustard)', fg: 'var(--color-text)' },
  fonts: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  background: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  flaps: { bg: 'var(--color-mustard)', fg: 'var(--color-text)' },
  spine: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  back: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  mixtape: { bg: 'var(--color-mustard)', fg: 'var(--color-text)' },
  export: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  inside: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
};

export const SETTINGS_COLOR_PRESETS = [
  '#EFE8D6', '#FAF6EB', '#2A1E28', '#4A3A48',
  '#A8C4A2', '#8FC9B7', '#3D5A47',
  '#5B2838', '#D4A935', '#B4A0C7',
];
