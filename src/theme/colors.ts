// Tokens de color del design system (DESIGN.md del frontend Ionic: src/theme/variables.scss).
// Los componentes consumen estos roles semánticos; no usar hex sueltos fuera de src/theme.

export type ThemeMode = 'light' | 'dark';

export type Palette = {
  mode: ThemeMode;
  // Marca
  primary: string;
  primaryRgb: string;
  onPrimary: string;
  primaryShade: string;
  // Barra superior (en oscuro: azul noche en vez del primary brillante)
  toolbar: string;
  onToolbar: string;
  onToolbarMuted: string;
  // Pie de página (sobre toolbar)
  footerSoft: string;
  footerOpen: string;
  footerClosed: string;
  // Semánticos
  secondary: string;
  onSecondary: string;
  tertiary: string;
  success: string;
  successRgb: string;
  onSuccess: string;
  warning: string;
  warningRgb: string;
  onWarning: string;
  warningBg: string;
  warningText: string;
  danger: string;
  dangerRgb: string;
  onDanger: string;
  // Superficies y texto
  background: string;
  surface: string;
  surface2: string;
  text: string;
  textRgb: string;
  muted: string;
  mutedRgb: string;
  border: string;
  // Fotos de producto: siempre sobre blanco
  photoBg: string;
  scrim: string;
  shadow: string;
  // Alias de compatibilidad (nombres previos del port)
  card: string;
  accent: string;
  medium: string;
  mediumRgb: string;
  light: string;
  lightShade: string;
  dark: string;
  section: string;
  sectionAlt: string;
  heading: string;
  overlay: string;
};

const light = {
  primary: '#0056B3', primaryRgb: '0, 86, 179', onPrimary: '#FFFFFF', primaryShade: '#004C9E',
  toolbar: '#0056B3', onToolbar: '#FFFFFF', onToolbarMuted: 'rgba(255, 255, 255, 0.82)',
  footerSoft: '#D6E6F8', footerOpen: '#86EFAC', footerClosed: '#FECACA',
  secondary: '#15803D', onSecondary: '#FFFFFF', tertiary: '#0369A1',
  success: '#15803D', successRgb: '21, 128, 61', onSuccess: '#FFFFFF',
  warning: '#B45309', warningRgb: '180, 83, 9', onWarning: '#FFFFFF', warningBg: '#FEF3C7', warningText: '#78350F',
  danger: '#DC2626', dangerRgb: '220, 38, 38', onDanger: '#FFFFFF',
  background: '#F3F7FB', surface: '#FFFFFF', surface2: '#EAF1F8',
  text: '#0F172A', textRgb: '15, 23, 42', muted: '#475569', mutedRgb: '71, 85, 105', border: '#D6E0EB',
  photoBg: '#FFFFFF', scrim: 'rgba(15, 23, 42, 0.55)', shadow: '#0F172A',
};

const dark = {
  primary: '#6CB4FF', primaryRgb: '108, 180, 255', onPrimary: '#04182E', primaryShade: '#5F9EE0',
  toolbar: '#10213D', onToolbar: '#E6EDF7', onToolbarMuted: 'rgba(230, 237, 247, 0.78)',
  footerSoft: '#B9CCE6', footerOpen: '#86EFAC', footerClosed: '#FECACA',
  secondary: '#4ADE80', onSecondary: '#052E16', tertiary: '#38BDF8',
  success: '#4ADE80', successRgb: '74, 222, 128', onSuccess: '#052E16',
  warning: '#FBBF24', warningRgb: '251, 191, 36', onWarning: '#1F1300', warningBg: 'rgba(251, 191, 36, 0.14)', warningText: '#FDE68A',
  danger: '#F87171', dangerRgb: '248, 113, 113', onDanger: '#2A0606',
  background: '#0B1220', surface: '#131C2E', surface2: '#1A2540',
  text: '#E6EDF7', textRgb: '230, 237, 247', muted: '#9AA9BF', mutedRgb: '154, 169, 191', border: '#26324A',
  photoBg: '#FFFFFF', scrim: 'rgba(0, 0, 0, 0.6)', shadow: '#000000',
};

function build(mode: ThemeMode, t: typeof light): Palette {
  return {
    mode,
    ...t,
    card: t.surface,
    accent: t.warning,
    medium: t.muted,
    mediumRgb: t.mutedRgb,
    light: t.surface2,
    lightShade: t.border,
    dark: t.text,
    section: t.surface,
    sectionAlt: t.surface2,
    heading: t.text,
    overlay: t.scrim,
  };
}

export const palettes: Record<ThemeMode, Palette> = {
  light: build('light', light),
  dark: build('dark', dark),
};

export const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;
