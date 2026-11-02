import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../state/app';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { heading, radius } from '../theme/tokens';
import { Icon } from './ui';
import { navSegments } from './Navbar';
import { useMobileLayout } from '../hooks/useMobileLayout';

const PAGE_ORDER = ['/ubicacion', '/catalogo', '/admin/inventario', '/ofertas', '/admin/gestion-pedidos', '/admin/pedidos-pendientes', '/admin/chat'];

// Equivalente a app-tabs: barra inferior en superficie, seleccionado en primary con indicador pill.
export function Tabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAuthenticated } = useSession();
  const mobile = useMobileLayout();
  const active = PAGE_ORDER.find(p => pathname.includes(p)) || '';
  const tabs = navSegments(role, isAuthenticated);

  const navigate = (target: string) => {
    if (target === active) return;
    if (active) router.replace(target as any);
    else router.push(target as any);
  };

  if (!mobile) return null;

  return (
    <View role="tablist" style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom }]}>
      {tabs.map(t => {
        const selected = active === t.path;
        const color = selected ? colors.primary : colors.muted;
        return (
          <Pressable key={t.path} onPress={() => navigate(t.path)} style={[styles.tab, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
            accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={t.label}>
            <View style={[styles.indicator, selected && { backgroundColor: rgba(colors.primaryRgb, 0.12) }]}>
              <Icon name={t.icon} size={22} color={color} />
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', zIndex: 1000, borderTopWidth: 1,
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, minHeight: 60 },
  indicator: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: radius.pill },
  label: { ...heading(600), fontSize: 12, marginTop: 2 },
});
