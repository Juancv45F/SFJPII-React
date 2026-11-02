import { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logout } from '../services/auth';
import { activeAccordion, mainMenuOpen, useSession, useValue } from '../state/app';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { Logo } from './Navbar';
import { Icon } from './ui';
import { features } from '../config/features';

type Accordion = 'first' | 'second' | 'third';

type LinkProps = {
  label: string; href?: string; active?: boolean; icon?: string; iconColor?: string; danger?: boolean; onPress?: () => void; go: (href: string) => void;
};

function MenuLink({ label, href, active, icon, iconColor, danger, onPress, go }: LinkProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress || (() => href && go(href))}
      style={({ pressed }) => [
        styles.link,
        { backgroundColor: rgba(colors.primaryRgb, active ? 0.18 : 0.08) },
        active && { borderLeftWidth: 4, borderLeftColor: colors.primary, borderRadius: 8 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon ? <Icon name={icon} size={22} color={iconColor || (danger ? colors.danger : colors.secondary)} style={{ marginRight: 28 }} /> : null}
      <Text style={{ color: danger ? colors.danger : colors.text, fontSize: 16, fontWeight: active ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}

function Section({ value, header, children }: { value: Accordion; header: ReactNode; children: ReactNode }) {
  const { colors } = useTheme();
  const accordion = useValue(activeAccordion);
  return (
    <View>
      <Pressable onPress={() => activeAccordion.set(accordion === value ? '' : value)} style={[styles.header, { backgroundColor: rgba(colors.primaryRgb, 0.08) }]}>
        {header}
        <Icon name="chevron-down" size={18} color={colors.medium} style={{ transform: [{ rotate: accordion === value ? '180deg' : '0deg' }] }} />
      </Pressable>
      {accordion === value ? <View style={[styles.list, { backgroundColor: rgba(colors.primaryRgb, 0.06) }]}>{children}</View> : null}
    </View>
  );
}

// Menú lateral principal (ion-menu menuId="main-menu" con ion-accordion-group).
export function MainMenu() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ seccion?: string }>();
  const { isAuthenticated, role, userName, userPhoto } = useSession();
  const tint = colors.primary;

  const go = (href: string) => {
    mainMenuOpen.set(false);
    router.replace(href as any);
  };
  const nosotrosActive = (s: string) => pathname === '/nosotros' && String(params.seccion || 'mision') === s;

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.toolbar, { backgroundColor: colors.primary, paddingTop: insets.top }]}>
        <Logo size={40} style={{ marginLeft: 10 }} />
        <Text style={[styles.title, { color: colors.onPrimary }]}>Farmacias JP II</Text>
      </View>
      <ScrollView style={{ backgroundColor: rgba(colors.primaryRgb, 0.05) }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        <View style={[styles.group, { backgroundColor: rgba(colors.primaryRgb, 0.08) }]}>
          <Section value="first" header={<><Icon name="business-outline" size={22} color={tint} style={styles.headerIcon} /><Text style={[styles.headerText, { color: colors.text }]}>Nosotros</Text></>}>
            {[['mision', 'Misión'], ['vision', 'Visión'], ['valores', 'Valores'], ['objetivos', 'Objetivos'], ['propuesta', 'Propuesta'], ['historia', 'Historia']].map(([id, label]) => (
              <MenuLink go={go} key={id} label={label} href={`/nosotros?seccion=${id}`} active={nosotrosActive(id)} />
            ))}
          </Section>

          {isAuthenticated ? (
            <Section value="second" header={<>
              {userPhoto ? <Image source={{ uri: userPhoto }} style={styles.avatar} /> : <Icon name="person" size={22} color={tint} style={styles.headerIcon} />}
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerText, { color: colors.text }]}>Mi cuenta</Text>
                <Text style={{ color: colors.medium, fontSize: 13.5 }}>{userName}</Text>
              </View>
            </>}>
              <MenuLink go={go} icon="clipboard" label={role === 'cliente' ? 'Mis Pedidos' : 'Gestión de Pedidos'} href={role === 'cliente' ? '/pedidos' : '/admin/gestion-pedidos'}
                active={pathname === (role === 'cliente' ? '/pedidos' : '/admin/gestion-pedidos')} />
              <MenuLink go={go} icon="clipboard" label={role === 'cliente' ? 'Mis Encargos' : 'Gestión de Encargos'} href={role === 'cliente' ? '/encargos' : '/admin/encargos'}
                active={pathname === (role === 'cliente' ? '/encargos' : '/admin/encargos')} />
              {features.aiAssistant && (role === 'admin' || role === 'super_admin')
                ? <MenuLink go={go} icon="chatbubbles-outline" iconColor={tint} label="Asistente de administración" href="/admin/chat" active={pathname === '/admin/chat'} />
                : null}
              <MenuLink go={go} icon="settings" label="Configuración" href="/configuracion" active={pathname === '/configuracion'} />
              <MenuLink go={go} icon="log-out" danger label="Cerrar Sesión" onPress={() => { mainMenuOpen.set(false); logout(); }} />
            </Section>
          ) : null}

          <Section value="third" header={<><Icon name="briefcase-outline" size={22} color={tint} style={styles.headerIcon} /><Text style={[styles.headerText, { color: colors.text }]}>Legal</Text></>}>
            <MenuLink go={go} label="Términos y condiciones" href="/terminos" active={pathname === '/terminos'} />
            <MenuLink go={go} label="Aviso de privacidad" href="/privacidad" active={pathname === '/privacidad'} />
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingBottom: 8, gap: 12 },
  title: { fontSize: 20, fontWeight: '500' },
  group: { borderRadius: 12, padding: 6, margin: 0 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16 },
  headerIcon: { marginRight: 28 },
  headerText: { fontSize: 16, flex: 1 },
  avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 16 },
  list: { borderRadius: 12, padding: 16, gap: 1 },
  link: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16 },
});
