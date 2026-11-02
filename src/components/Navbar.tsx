import { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartItems } from '../services/cart';
import { useOffline, useStore } from '../services/connectivity';
import { notifications } from '../services/notifications';
import { fetchPendingOrders, pendingOrders } from '../services/orders';
import { catalogCached, searchProducts, searchTerm } from '../services/products';
import { getPreferences } from '../services/auth';
import { cartMenuOpen, mainMenuOpen, openAccountMenu, useSession } from '../state/app';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { body, heading, radius, shadow, tabular } from '../theme/tokens';
import { NotificationsPopover } from './NotificationsPopover';
import { Icon } from './ui';
import { useMobileLayout } from '../hooks/useMobileLayout';
import { features } from '../config/features';
import { isAdmin, isStaff } from '../config/roles';

type NavbarProps = {
  title?: string;
  showSearch?: boolean;
  showCart?: boolean;
  backButton?: boolean;
  hrefBtn?: string;
};

const web = Platform.OS === 'web';
const webNoOutline = web ? ({ outlineStyle: 'none' } as any) : null;
const pointer = web ? ({ cursor: 'pointer' } as any) : null;

export function navSegments(role: string, isAuthenticated: boolean) {
  const staff = isAuthenticated && isStaff(role);
  return [
    role === 'cliente' && { path: '/ubicacion', label: 'Ubicación', icon: 'map' },
    role !== 'cliente' && { path: '/admin/pedidos-pendientes', label: 'Pendientes', icon: 'time' },
    staff && { path: '/admin/inventario', label: 'Inventario', icon: 'grid' },
    !staff && { path: '/catalogo', label: 'Catálogo', icon: 'grid' },
    { path: '/ofertas', label: 'Por encargo', icon: 'calendar' },
    features.aiAssistant && isAdmin(role) && { path: '/admin/chat', label: 'Asistente', icon: 'chatbubbles-outline' },
  ].filter(Boolean) as { path: string; label: string; icon: string }[];
}

function ToolbarButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ hovered, pressed }: any) => [styles.btn, pointer, (hovered || pressed) && { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
      {children}
    </Pressable>
  );
}

// Equivalente a app-navbar.
export function Navbar({ title = '', showSearch = false, showCart = true, backButton = false, hrefBtn = '' }: NavbarProps) {
  const { colors, isDark, toggle, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const mobile = useMobileLayout();
  const { isAuthenticated, role, userPhoto } = useSession();
  const offline = useOffline();
  const cached = useStore(catalogCached);
  const items = useCartItems();
  const notificationItems = useStore(notifications.items);
  const pending = useStore(pendingOrders);
  const [popover, setPopover] = useState(false);
  const [query, setQuery] = useState(searchTerm.value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartCount = items.reduce((n, i) => n + i.cantidad, 0);
  const unread = notificationItems.filter(n => !n.leida).length;
  const badge = role === 'cliente' ? unread : pending.length;
  const fg = colors.onToolbar;

  useEffect(() => {
    if (!isAuthenticated) return;
    getPreferences().then((resp: any) => {
      const theme = resp?.preferences?.theme;
      if (theme === 'dark' || theme === 'light') setMode(theme);
    }).catch(() => {});
    if (isStaff(role)) fetchPendingOrders().catch(() => {});
  }, [isAuthenticated, role, setMode]);

  const onSearchChange = (raw: string) => {
    const term = raw.slice(0, 100);
    setQuery(term);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      searchTerm.set(term);
      if (term.trim()) searchProducts(term).then(res => setSuggestions(res.data || [])).catch(() => setSuggestions([]));
      else setSuggestions([]);
    }, 500);
  };

  const segments = navSegments(role, isAuthenticated);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (hrefBtn) router.replace(hrefBtn as any);
  };

  return (
    <View style={{ zIndex: 999, elevation: 6 }}>
      <View style={[{ backgroundColor: colors.toolbar, paddingTop: insets.top }, styles.headerShadow]}>
        {offline || cached ? (
          <Text role="status" style={[styles.offline, { backgroundColor: colors.warningBg, color: colors.warningText }]}>
            Modo sin conexión · Catálogo guardado. El carrito se sincronizará al recuperar internet.
          </Text>
        ) : null}
        <View style={styles.toolbar}>
          <ToolbarButton label="Abrir menú" onPress={() => mainMenuOpen.set(true)}>
            <Icon name="menu" size={26} color={fg} />
          </ToolbarButton>
          {backButton ? (
            <ToolbarButton label="Regresar" onPress={goBack}>
              <Icon name="arrow-back" size={24} color={fg} />
            </ToolbarButton>
          ) : null}
          <Text role="heading" aria-level={1} style={[styles.title, { color: fg }]} numberOfLines={2}>{title}</Text>
          {!isAuthenticated ? (
            <ToolbarButton label="Iniciar sesión" onPress={() => router.push('/log-in')}>
              {mobile
                ? <Icon name="log-in" size={24} color={fg} />
                : <Text style={[styles.sessionText, { color: fg }]}>Iniciar sesión</Text>}
            </ToolbarButton>
          ) : (
            <ToolbarButton label="Abrir Mi cuenta" onPress={openAccountMenu}>
              {userPhoto
                ? <Image source={{ uri: userPhoto }} style={[styles.avatar, { borderColor: fg }]} accessibilityLabel="Foto de perfil" />
                : <Icon name="person-circle-outline" size={27} color={fg} />}
            </ToolbarButton>
          )}
          <ToolbarButton label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'} onPress={toggle}>
            <Icon name={isDark ? 'sunny' : 'moon'} size={22} color={fg} />
          </ToolbarButton>
          {isAuthenticated ? (
            <ToolbarButton label={badge > 0 ? `Notificaciones, ${badge} nuevas` : 'Notificaciones'} onPress={() => setPopover(true)}>
              <Icon name="notifications" size={22} color={fg} />
              {badge > 0 ? <View style={[styles.badge, { backgroundColor: colors.danger }]}><Text style={[styles.badgeText, { color: colors.onDanger }]}>{badge}</Text></View> : null}
            </ToolbarButton>
          ) : null}
          {showCart && role === 'cliente' ? (
            <ToolbarButton label={`Abrir carrito, ${cartCount} productos`} onPress={() => cartMenuOpen.set(true)}>
              <Icon name="cart" size={24} color={fg} />
              <View style={[styles.badge, { backgroundColor: colors.warning }]}><Text style={[styles.badgeText, { color: colors.onWarning }]}>{cartCount}</Text></View>
            </ToolbarButton>
          ) : null}
        </View>
        {!mobile || showSearch ? (
          <View style={styles.navRow}>
            {!mobile ? (
              <View role="tablist" style={styles.segmentRow}>
                {segments.map(s => {
                  const selected = pathname.startsWith(s.path);
                  return (
                    <Pressable key={s.path} onPress={() => !selected && router.replace(s.path as any)} accessibilityRole="tab"
                      accessibilityState={{ selected }} style={[styles.segment, pointer, selected && { borderBottomColor: fg }]}>
                      <Text style={[styles.segmentText, { color: selected ? fg : colors.onToolbarMuted }]}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {showSearch ? (
              <View style={[styles.searchbar, { backgroundColor: colors.surface }]}>
                <Icon name="search" size={20} color={colors.primary} />
                <TextInput
                  value={query}
                  onChangeText={onSearchChange}
                  placeholder="Buscar productos..."
                  placeholderTextColor={colors.muted}
                  maxLength={100}
                  aria-label="Buscar productos"
                  style={[styles.searchInput, { color: colors.text }, webNoOutline]}
                  returnKeyType="search"
                />
                {query ? (
                  <Pressable onPress={() => onSearchChange('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" style={pointer}>
                    <Icon name="close-circle" size={20} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {suggestions.length > 0 ? (
        <View role="list" style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }, shadow(colors, 'lg')]}>
          {suggestions.slice(0, 8).map(item => (
            <Pressable key={item.id} accessibilityRole="button"
              style={({ hovered, pressed }: any) => [styles.suggestion, pointer, (hovered || pressed) && { backgroundColor: rgba(colors.primaryRgb, 0.06) }]}
              onPress={() => { setQuery(item.nombre); searchTerm.set(item.nombre); setSuggestions([]); }}>
              <Icon name="search-outline" size={20} color={colors.muted} style={{ marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={[body(600), { color: colors.text, fontSize: 15 }]}>{item.nombre}</Text>
                <Text style={[body(400), { fontSize: 13, color: colors.muted }]}>{item.categoria?.nombre || item.Categorium?.nombre || ''}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      <NotificationsPopover visible={popover} onClose={() => setPopover(false)} role={role} />
    </View>
  );
}

// Encabezado simple con botón de regreso (forgot-password y pedidos-detalle no usan app-navbar).
export function SimpleHeader({ title, defaultHref }: { title: string; defaultHref: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[{ backgroundColor: colors.toolbar, paddingTop: insets.top }, styles.headerShadow]}>
      <View style={styles.toolbar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace(defaultHref as any))} style={[styles.btn, pointer]}
          accessibilityRole="button" accessibilityLabel="Regresar">
          <Icon name="arrow-back" size={24} color={colors.onToolbar} />
        </Pressable>
        <Text role="heading" aria-level={1} style={[styles.title, { color: colors.onToolbar }]}>{title}</Text>
      </View>
    </View>
  );
}

export const LOGO = require('../../assets/images/logo.png');

export function Logo({ size = 40, style }: { size?: number; style?: any }) {
  return <Image source={LOGO} accessibilityLabel="Farmacia Juan Pablo II" style={[{ width: size, height: size, resizeMode: 'contain' }, style]} />;
}

const styles = StyleSheet.create({
  headerShadow: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  offline: { ...body(600), paddingVertical: 8, paddingHorizontal: 16, textAlign: 'center', fontSize: 14 },
  toolbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 2 },
  btn: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: radius.pill },
  title: { ...heading(700), flex: 1, fontSize: 19, paddingHorizontal: 6, lineHeight: 23 },
  avatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  badge: {
    position: 'absolute', top: 3, right: 0, minWidth: 18, height: 18, borderRadius: radius.pill, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { ...body(700), ...tabular, fontSize: 11 },
  navRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  segmentRow: { flexDirection: 'row', marginHorizontal: -12 },
  segment: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 44, borderBottomWidth: 3, borderBottomColor: 'transparent', flex: 1, alignItems: 'center' },
  segmentText: { ...heading(600), fontSize: 15 },
  sessionText: { ...heading(700), fontSize: 15, paddingHorizontal: 8 },
  searchbar: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, paddingHorizontal: 14, height: 46, gap: 10, width: '100%', maxWidth: 720, alignSelf: 'center' },
  searchInput: { ...body(400), flex: 1, fontSize: 16, paddingVertical: 0 },
  suggestions: {
    position: 'absolute', top: '100%', alignSelf: 'center', width: '96%', maxWidth: 720, zIndex: 99999,
    borderRadius: radius.lg, borderWidth: 1, maxHeight: 320, overflow: 'hidden', paddingVertical: 4, marginTop: -4,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, minHeight: 52 },
});
