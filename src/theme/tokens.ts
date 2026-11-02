import { Platform, TextStyle, ViewStyle } from 'react-native';
import type { Palette } from './colors';

// Espaciado, radios, tipografía y sombras del design system (DESIGN.md §3–4).

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

// Contenedores de lectura.
export const container = { page: 1200, form: 560, legal: 820 } as const;

// Figtree (headings) y Noto Sans (body). En RN cada peso es una familia distinta.
type Weight = 400 | 500 | 600 | 700 | 800;

const families = {
  heading: { 400: 'Figtree_500Medium', 500: 'Figtree_500Medium', 600: 'Figtree_600SemiBold', 700: 'Figtree_700Bold', 800: 'Figtree_800ExtraBold' },
  body: { 400: 'NotoSans_400Regular', 500: 'NotoSans_500Medium', 600: 'NotoSans_600SemiBold', 700: 'NotoSans_700Bold', 800: 'NotoSans_700Bold' },
} as const;

export function font(kind: 'heading' | 'body', weight: Weight = 400): TextStyle {
  return { fontFamily: families[kind][weight], fontWeight: Platform.OS === 'web' ? String(weight) as TextStyle['fontWeight'] : undefined };
}

export const heading = (weight: Weight = 700) => font('heading', weight);
export const body = (weight: Weight = 400) => font('body', weight);

// Escala: 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36.
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 } as const;

export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

// Sombras de una capa. En oscuro se sustituyen por borde (DESIGN.md §4).
export function shadow(c: Palette, level: 'sm' | 'md' | 'lg' = 'sm'): ViewStyle {
  if (c.mode === 'dark') {
    return level === 'sm'
      ? { borderWidth: 1, borderColor: c.border }
      : { borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: level === 'md' ? 24 : 40, shadowOffset: { width: 0, height: 8 }, elevation: level === 'md' ? 6 : 12 };
  }
  const map = {
    sm: { shadowOpacity: 0.06, shadowRadius: 8, height: 2, elevation: 2 },
    md: { shadowOpacity: 0.1, shadowRadius: 28, height: 12, elevation: 6 },
    lg: { shadowOpacity: 0.16, shadowRadius: 32, height: 12, elevation: 12 },
  }[level];
  return { shadowColor: c.shadow, shadowOpacity: map.shadowOpacity, shadowRadius: map.shadowRadius, shadowOffset: { width: 0, height: map.height }, elevation: map.elevation };
}

export const motion = { fast: 150, base: 220 } as const;
