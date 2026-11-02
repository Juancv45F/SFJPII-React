import { ComponentProps, ReactNode, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Switch, Text, TextInput,
  TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, rgba } from '../theme/colors';
import { body, container, heading, radius, shadow, space } from '../theme/tokens';
import type { Color } from '../ui/overlays';

// Equivalentes de los componentes de Ionic usados en las plantillas (ion-button, ion-item, ion-segment, ...),
// con los estilos del design system (DESIGN.md §5–6).

export type IconName = ComponentProps<typeof Ionicons>['name'];

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : null;

export function Icon({ name, size = 22, color, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Ionicons name={name as IconName} size={size} color={color || colors.text} style={style} aria-hidden />;
}

export function colorOf(c: Palette, color: Color | string = 'primary'): string {
  switch (color) {
    case 'primary': return c.primary;
    case 'success': return c.success;
    case 'warning': return c.warning;
    case 'danger': return c.danger;
    case 'medium': return c.muted;
    case 'secondary': return c.secondary;
    case 'light': return c.surface2;
    default: return color;
  }
}

export function contrastOf(c: Palette, color: Color | string = 'primary'): string {
  switch (color) {
    case 'primary': return c.onPrimary;
    case 'success': return c.onSuccess;
    case 'warning': return c.onWarning;
    case 'danger': return c.onDanger;
    case 'secondary': return c.onSecondary;
    case 'light': return c.text;
    case 'medium': return c.background;
    default: return '#FFFFFF';
  }
}

type ButtonProps = {
  children?: ReactNode;
  onPress?: () => void;
  fill?: 'solid' | 'outline' | 'clear';
  color?: Color;
  size?: 'small' | 'default';
  expand?: boolean;
  round?: boolean;
  disabled?: boolean;
  icon?: string;
  iconEnd?: string;
  iconOnly?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function Button({
  children, onPress, fill = 'solid', color = 'primary', size = 'default', expand, round, disabled, icon, iconEnd,
  iconOnly, loading, style, textStyle, accessibilityLabel,
}: ButtonProps) {
  const { colors } = useTheme();
  const base = colorOf(colors, color);
  const fg = fill === 'solid' ? contrastOf(colors, color) : base;
  const small = size === 'small';
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.button,
        webCursor,
        small && styles.buttonSmall,
        iconOnly && (small ? styles.iconOnlySmall : styles.iconOnly),
        expand && styles.expand,
        round && { borderRadius: radius.pill },
        fill === 'solid' && { backgroundColor: base },
        fill === 'outline' && { borderWidth: 1.5, borderColor: base, backgroundColor: 'transparent' },
        fill === 'clear' && { backgroundColor: hovered && !off ? rgba(colors.primaryRgb, 0.08) : 'transparent' },
        hovered && !off && fill !== 'clear' && { transform: [{ translateY: -1 }] },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        off && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} style={{ marginRight: children ? 8 : 0 }} /> : null}
      {iconOnly && !loading ? <Icon name={iconOnly} size={small ? 18 : 22} color={fg} /> : null}
      {icon && !loading ? <Icon name={icon} size={small ? 16 : 19} color={fg} style={{ marginRight: 8 }} /> : null}
      {typeof children === 'string' || typeof children === 'number' || Array.isArray(children)
        ? <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }, textStyle]}>{children}</Text>
        : children}
      {iconEnd ? <Icon name={iconEnd} size={small ? 16 : 19} color={fg} style={{ marginLeft: 8 }} /> : null}
    </Pressable>
  );
}

export function Txt({ children, style, color, numberOfLines }: { children?: ReactNode; style?: StyleProp<TextStyle>; color?: string; numberOfLines?: number }) {
  const { colors } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[styles.txt, { color: color || colors.text }, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children?: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text style={[styles.muted, { color: colors.muted }, style]}>{children}</Text>;
}

export function H({ children, level = 2, style, numberOfLines }: { children?: ReactNode; level?: 1 | 2 | 3; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const { colors } = useTheme();
  const size = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  return (
    <Text role="heading" aria-level={level} numberOfLines={numberOfLines} style={[size, { color: colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Spinner({ color, size = 'small' }: { color?: string; size?: 'small' | 'large' }) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={color || colors.primary} />;
}

export function Badge({ children, color = 'primary', style }: { children: ReactNode; color?: Color; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colorOf(colors, color) }, style]}>
      {typeof children === 'string' || typeof children === 'number'
        ? <Text style={[styles.badgeText, { color: contrastOf(colors, color) }]}>{children}</Text>
        : children}
    </View>
  );
}

// Chip de filtro: pill; inactivo surface + borde, activo color sólido; sin escalado.
export function Chip({ label, selected, color = 'primary', onPress, icon, iconColor }: { label: string; selected: boolean; color?: Color; onPress: () => void; icon?: string; iconColor?: string }) {
  const { colors } = useTheme();
  const tint = colorOf(colors, color);
  const bg = selected ? tint : colors.surface;
  const fg = selected ? contrastOf(colors, color) : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-pressed={selected}
      style={({ hovered }: any) => [
        styles.chip, webCursor,
        { backgroundColor: bg, borderColor: selected ? tint : hovered ? colors.primary : colors.border },
      ]}
    >
      {icon ? <Icon name={icon} size={17} color={selected ? fg : iconColor || colors.warning} style={{ marginRight: 6, marginLeft: -2 }} /> : null}
      <Text style={[selected ? body(700) : body(600), { color: fg, fontSize: 14.5 }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// ion-segment. compact=false: pestañas subrayadas; variant="pill": control segmentado de los diálogos.
export function Segment<T extends string>({ value, options, onChange, style, compact, variant = 'underline' }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; style?: StyleProp<ViewStyle>; compact?: boolean; variant?: 'underline' | 'pill';
}) {
  const { colors } = useTheme();
  if (variant === 'pill') {
    return (
      <View role="tablist" style={[styles.segmentPill, { backgroundColor: colors.surface2 }, style]}>
        {options.map(o => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: active }}
              style={[styles.segmentPillButton, webCursor, active && [{ backgroundColor: colors.surface }, shadow(colors, 'sm')]]}>
              <Text style={[heading(600), { color: active ? colors.primary : colors.muted, fontSize: 14.5 }]} numberOfLines={1}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View role="tablist" style={[styles.segment, style]}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: active }}
            style={[styles.segmentButton, webCursor, compact && { paddingVertical: 8 }, { borderBottomColor: active ? colors.primary : 'transparent' }]}>
            <Text style={[heading(600), { color: active ? colors.primary : colors.muted, fontSize: 14.5 }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label?: string;
  icon?: string;
  endIcon?: string;
  onEndIconPress?: () => void;
  endIconLabel?: string;
  variant?: 'outlined' | 'stacked';
  containerStyle?: StyleProp<ViewStyle>;
  error?: string | false;
  hint?: string;
};

// ion-item + ion-label + ion-input con el estilo .custom-input: campo relleno surface-2, radio 12, borde primary al foco.
export function Field({ label, icon, endIcon, onEndIconPress, endIconLabel, variant = 'stacked', containerStyle, error, hint, style, multiline, ...props }: FieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const outlined = variant === 'outlined';
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={[{ marginBottom: space[3] }, containerStyle]}>
      {label && !outlined ? <Text style={[styles.label, { color: focused ? colors.primary : colors.text }]}>{label}</Text> : null}
      <View style={[
        styles.fieldBox,
        { backgroundColor: colors.surface2, borderColor },
        focused && { boxShadow: `0 0 0 3px ${rgba(colors.primaryRgb, colors.mode === 'dark' ? 0.55 : 0.35)}` } as ViewStyle,
      ]}>
        {icon ? <Icon name={icon} size={20} color={colors.primary} style={{ marginRight: space[3] }} /> : null}
        <View style={{ flex: 1 }}>
          {label && outlined ? (
            <Text style={[styles.floatLabel, { color: focused ? colors.primary : colors.muted }]}>{label}</Text>
          ) : null}
          <TextInput
            placeholderTextColor={colors.muted}
            aria-label={label}
            aria-invalid={!!error}
            {...props}
            multiline={multiline}
            onFocus={e => { setFocused(true); props.onFocus?.(e); }}
            onBlur={e => { setFocused(false); props.onBlur?.(e); }}
            style={[
              styles.input,
              { color: colors.text },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
              multiline && { minHeight: 80, textAlignVertical: 'top' },
              style,
            ]}
          />
        </View>
        {endIcon ? (
          <Pressable onPress={onEndIconPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={endIconLabel} style={[styles.endIcon, webCursor]}>
            <Icon name={endIcon} size={22} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text role="alert" style={[styles.help, { color: colors.danger }]}>{error}</Text>
        : hint ? <Text style={[styles.help, { color: colors.muted }]}>{hint}</Text> : null}
    </View>
  );
}

export function Toggle({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <Switch value={value} onValueChange={onValueChange} accessibilityLabel={accessibilityLabel}
      trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF"
      {...(Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } as any : null)} />
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={[{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44 }, webCursor]}>
      <View style={[styles.checkbox, { borderColor: checked ? colors.primary : colors.muted, backgroundColor: checked ? colors.primary : 'transparent' }]}>
        {checked ? <Icon name="checkmark" size={16} color={colors.onPrimary} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export function Radio({ selected, onPress, children, disabled }: { selected: boolean; onPress: () => void; children: ReactNode; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected, disabled }}
      style={[styles.radioRow, webCursor, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? rgba(colors.primaryRgb, 0.06) : colors.surface }, disabled && { opacity: 0.5 }]}>
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.muted }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

// ion-select con interface="popover".
export function Select<T extends string>({ label, value, options, onChange, placeholder, style }: {
  label?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; placeholder?: string; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <>
      <View style={[{ marginBottom: space[3] }, style]}>
        {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
        <Pressable onPress={() => setOpen(true)} accessibilityRole="combobox" accessibilityLabel={label}
          style={[styles.fieldBox, webCursor, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Text style={[body(400), { flex: 1, color: current ? colors.text : colors.muted, fontSize: 16 }]} numberOfLines={1}>
            {current?.label || placeholder || ''}
          </Text>
          <Icon name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.popoverBackdrop, { backgroundColor: colors.scrim }]} onPress={() => setOpen(false)}>
          <View style={[styles.popover, { backgroundColor: colors.surface }, shadow(colors, 'lg')]}>
            {label ? <Text style={[heading(700), { color: colors.text, fontSize: 17, paddingHorizontal: 18, paddingVertical: 12 }]}>{label}</Text> : null}
            <ScrollView>
              {options.map(o => {
                const active = o.value === value;
                return (
                  <Pressable key={o.value} onPress={() => { setOpen(false); onChange(o.value); }} accessibilityRole="menuitem" accessibilityState={{ selected: active }}
                    style={({ pressed, hovered }: any) => [styles.popoverItem, webCursor, (pressed || hovered) && { backgroundColor: rgba(colors.primaryRgb, 0.08) }]}>
                    <Text style={[active ? body(600) : body(400), { color: active ? colors.primary : colors.text, fontSize: 16, flex: 1 }]}>{o.label}</Text>
                    {active ? <Icon name="checkmark" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <Text role="heading" aria-level={2} style={[styles.sectionTitle, { color: colors.text }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }, shadow(colors, 'sm'), style]}>{children}</View>;
}

// Contenedor de lectura centrado (máx. 1200 / 560 / 820 px).
export function PageContainer({ children, width = 'page', style }: { children: ReactNode; width?: keyof typeof container; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: '100%', maxWidth: container[width], alignSelf: 'center' }, style]}>{children}</View>;
}

// Estado vacío: icono 64px muted + mensaje + acción.
export function EmptyState({ icon, message, action }: { icon: string; message: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View role="status" style={styles.empty}>
      <Icon name={icon} size={64} color={rgba(colors.mutedRgb, 0.7)} />
      <Text style={[body(500), { color: colors.muted, fontSize: 17, textAlign: 'center' }]}>{message}</Text>
      {action}
    </View>
  );
}

// Banner de aviso (offline, información importante).
export function Notice({ children, tone = 'warning', icon, style }: { children: ReactNode; tone?: 'warning' | 'info'; icon?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const bg = tone === 'warning' ? colors.warningBg : rgba(colors.primaryRgb, 0.1);
  const fg = tone === 'warning' ? colors.warningText : colors.text;
  return (
    <View role="note" style={[styles.notice, { backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={20} color={tone === 'warning' ? colors.warning : colors.primary} /> : null}
      <Text style={[body(500), { color: fg, fontSize: 14.5, lineHeight: 21, flex: 1 }]}>{children}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 44, paddingHorizontal: 18, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginVertical: 4,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.sm },
  iconOnly: { width: 44, minHeight: 44, paddingHorizontal: 0, borderRadius: 22 },
  iconOnlySmall: { width: 36, minHeight: 36, paddingHorizontal: 0, borderRadius: 18 },
  expand: { alignSelf: 'stretch', width: '100%' },
  buttonText: { ...heading(700), fontSize: 15.5, textAlign: 'center' },
  buttonTextSmall: { fontSize: 14 },
  txt: { ...body(400), fontSize: 16, lineHeight: 24 },
  muted: { ...body(400), fontSize: 14, lineHeight: 20 },
  h1: { ...heading(800), fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  h2: { ...heading(700), fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  h3: { ...heading(700), fontSize: 18, lineHeight: 23 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { ...body(700), fontSize: 12 },
  chip: { height: 40, borderRadius: radius.pill, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  segment: { flexDirection: 'row' },
  segmentButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, minHeight: 44, borderBottomWidth: 3 },
  segmentPill: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  segmentPillButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md - 4, paddingHorizontal: 8 },
  label: { ...body(600), fontSize: 14, marginBottom: 6 },
  floatLabel: { ...body(500), fontSize: 12.5, marginTop: 8 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[4] },
  input: { ...body(400), fontSize: 16, paddingVertical: 10, minHeight: 44 },
  endIcon: { padding: 10, marginRight: -10 },
  help: { ...body(500), fontSize: 13, marginTop: 6, paddingLeft: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderRadius: radius.md, marginBottom: 8, minHeight: 52 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  popoverBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  popover: { borderRadius: radius.lg, maxHeight: '70%', width: '100%', maxWidth: 420, paddingVertical: 6 },
  popoverItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, minHeight: 48, paddingVertical: 12 },
  sectionTitle: { ...heading(700), fontSize: 20, lineHeight: 25, marginBottom: space[4], letterSpacing: -0.2 },
  card: { borderRadius: radius.lg, padding: space[4], marginVertical: space[2] },
  empty: { alignItems: 'center', gap: space[3], marginVertical: space[7], padding: space[5], maxWidth: 420, alignSelf: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], padding: space[3], borderRadius: radius.md },
});
