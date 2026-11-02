import { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, Linking, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import { body, container, heading, space, tabular } from '../theme/tokens';
import { Icon } from './ui';

// app-site-footer: el teléfono es el titular; arriba dirección y estado en vivo; abajo una fila de enlaces.

const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

// Estado "abierto ahora" con la hora de Villa Hidalgo (centro de México). Lunes a sábado 9:00–21:00, domingo cerrado.
export function storeStatus(now = new Date()): { open: boolean; label: string } {
  let hour = now.getHours();
  let minute = now.getMinutes();
  let day = now.getDay();
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
      .formatToParts(now);
    hour = Number(parts.find(p => p.type === 'hour')?.value ?? hour) % 24;
    minute = Number(parts.find(p => p.type === 'minute')?.value ?? minute);
    const wd = WEEKDAYS.indexOf(parts.find(p => p.type === 'weekday')?.value ?? '');
    if (wd >= 0) day = wd;
  } catch { /* zona horaria no disponible: usar la del dispositivo */ }

  const sunday = day === 0;
  const open = !sunday && hour >= OPEN_HOUR && hour < CLOSE_HOUR;
  const minutes = (CLOSE_HOUR - hour) * 60 - minute;
  if (open) return { open, label: minutes <= 60 ? `Abierto · cierra en ${minutes} min` : 'Abierto ahora · hasta las 21:00' };
  if (sunday) return { open, label: 'Cerrado hoy domingo · abrimos el lunes a las 9:00' };
  if (day === 6 && hour >= CLOSE_HOUR) return { open, label: 'Cerrado · abrimos el lunes a las 9:00' };
  return { open, label: hour < OPEN_HOUR ? 'Cerrado · abrimos hoy a las 9:00' : 'Cerrado · abrimos mañana a las 9:00' };
}

function StatusDot({ open, color }: { open: boolean; color: string }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!open) return;
    let loop: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: Platform.OS !== 'web' }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [open, opacity]);
  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />;
}

export function SiteFooter({ onBackToTop }: { onBackToTop?: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [status, setStatus] = useState(() => storeStatus());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const narrow = width <= 600;
  const ink = colors.onToolbar;
  const soft = colors.footerSoft;

  useEffect(() => {
    timer.current = setInterval(() => setStatus(storeStatus()), 60_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const link = (label: string, path: string) => (
    <Pressable key={path} onPress={() => router.push(path as any)} accessibilityRole="link"
      style={({ hovered }: any) => [styles.link, pointer, hovered && { opacity: 1 }]}>
      {({ hovered }: any) => <Text style={[styles.linkText, { color: hovered ? ink : soft }, hovered && styles.underline]}>{label}</Text>}
    </Pressable>
  );

  return (
    <View role="contentinfo" aria-label="Pie de página" style={[styles.footer, { backgroundColor: colors.toolbar }]}>
      <View style={[styles.inner, { paddingHorizontal: narrow ? space[4] : space[5] }]}>
        <View style={[styles.top, narrow && { flexDirection: 'column', gap: space[2] }]}>
          <View style={{ gap: 4, flexShrink: 1 }}>
            <Text style={[heading(700), { color: ink, fontSize: 16.5 }]}>Farmacia Juan Pablo II</Text>
            <Text style={[styles.note, { color: soft }]}>Prolongación Colón #758, Villa Hidalgo, Jalisco</Text>
            <View role="status" style={styles.status}>
              <StatusDot open={status.open} color={status.open ? colors.footerOpen : colors.footerClosed} />
              <Text style={[body(600), { color: status.open ? colors.footerOpen : colors.footerClosed, fontSize: 15 }]}>{status.label}</Text>
            </View>
          </View>
          {onBackToTop ? (
            <Pressable onPress={onBackToTop} accessibilityRole="button" style={[styles.topLink, pointer]}>
              <Text style={[body(600), styles.underline, { color: ink, fontSize: 15 }]}>Volver arriba</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: space[2], alignItems: 'flex-start' }}>
          <Text style={[body(400), { color: soft, fontSize: 17 }]}>Llámanos para pedir o resolver dudas</Text>
          <Pressable onPress={() => Linking.openURL('tel:+524959681331')} accessibilityRole="link" accessibilityLabel="Llamar al 495 968 1331"
            style={({ hovered }: any) => [pointer, hovered && { opacity: 0.85 }]}>
            <Text style={[styles.phone, { color: ink, fontSize: narrow ? Math.min(42, Math.max(32, width * 0.1)) : Math.min(64, Math.max(36, width * 0.046)) }]}>
              495 968 1331
            </Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://wa.me/524951278814')} accessibilityRole="link" style={[styles.whatsapp, pointer]}>
            <Icon name="logo-whatsapp" size={22} color={ink} />
            <Text style={[body(600), styles.underline, { color: ink, fontSize: 17 }]}>WhatsApp 495 127 8814</Text>
          </Pressable>
        </View>

        <View style={[styles.meta, width <= 860 && { flexDirection: 'column', alignItems: 'flex-start', gap: space[2] }]}>
          <View role="navigation" aria-label="Sitio" style={[styles.links, width > 860 && { flex: 1 }]}>
            {link('Catálogo', '/catalogo')}
            {link('Por encargo', '/ofertas')}
            {link('Ubicación', '/ubicacion')}
            {link('Nosotros', '/nosotros')}
          </View>
          <View role="navigation" aria-label="Información legal" style={styles.links}>
            {link('Términos', '/terminos')}
            {link('Privacidad', '/privacidad')}
          </View>
          <Text style={[body(400), { color: soft, fontSize: 14.5 }]}>© {new Date().getFullYear()} · Villa Hidalgo, Jalisco</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: space[7], width: '100%' },
  inner: { width: '100%', maxWidth: container.page + 48, alignSelf: 'center', paddingTop: space[6], paddingBottom: space[5], gap: space[6] },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[5] },
  note: { ...body(400), fontSize: 15, lineHeight: 22 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  topLink: { minHeight: 44, justifyContent: 'center' },
  phone: { ...heading(800), ...tabular, letterSpacing: -1.2 },
  whatsapp: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[6], flexWrap: 'wrap' },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[5] },
  link: { minHeight: 40, justifyContent: 'center' },
  linkText: { ...body(400), fontSize: 14.5 },
  underline: { textDecorationLine: 'underline' },
});
