import { ReactNode, RefObject, useRef } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, ScrollViewInstance, StyleProp, View, ViewStyle } from 'react-native';
import { Redirect, usePathname } from 'expo-router';
import { useSession } from '../state/app';
import { useTheme } from '../theme/ThemeProvider';
import { Navbar } from './Navbar';
import { Tabs } from './Tabs';
import { SiteFooter } from './SiteFooter';
import { homeFor } from '../config/roles';

type ScreenProps = {
  title?: string;
  showSearch?: boolean;
  showCart?: boolean;
  backButton?: boolean;
  hrefBtn?: string;
  tabs?: boolean;
  scroll?: boolean;
  padding?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollRef?: RefObject<ScrollViewInstance | null>;
  contentStyle?: StyleProp<ViewStyle>;
  stickyHeaderIndices?: number[];
  fab?: ReactNode;
  // Agrega app-site-footer al final del contenido con scroll.
  siteFooter?: boolean;
  children: ReactNode;
};

// Estructura de cada página: <app-navbar> + <ion-content> + <app-tabs>.
export function Screen({
  title, showSearch, showCart = true, backButton, hrefBtn, tabs = true, scroll = true, padding = true, header, footer,
  refreshing, onRefresh, scrollRef, contentStyle, stickyHeaderIndices, fab, siteFooter, children,
}: ScreenProps) {
  const { colors } = useTheme();
  const ownRef = useRef<ScrollViewInstance | null>(null);
  const ref = scrollRef ?? ownRef;
  const pad = padding ? { padding: 16 } : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header ?? <Navbar title={title} showSearch={showSearch} showCart={showCart} backButton={backButton} hrefBtn={hrefBtn} />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            ref={ref}
            style={{ flex: 1 }}
            contentContainerStyle={[{ flexGrow: 1 }, siteFooter ? null : [pad, { paddingBottom: 90 }], contentStyle]}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={stickyHeaderIndices}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} /> : undefined}
          >
            {siteFooter ? (
              <>
                {padding ? <View style={[pad, { flexGrow: 1 }]}>{children}</View> : children}
                <SiteFooter onBackToTop={() => ref.current?.scrollTo({ y: 0, animated: true })} />
              </>
            ) : children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
        {footer}
        {fab ? <View style={{ position: 'absolute', left: 16, bottom: 16 }}>{fab}</View> : null}
      </KeyboardAvoidingView>
      {tabs ? <Tabs /> : null}
    </View>
  );
}

// authGuard + roleGuard de app.routes.ts.
export function Guard({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { isAuthenticated, role } = useSession();
  const pathname = usePathname();
  if (!isAuthenticated) return <Redirect href={{ pathname: '/log-in', params: { returnUrl: pathname } }} />;
  if (roles?.length && !roles.includes(role)) return <Redirect href={homeFor(role, true) as any} />;
  return <>{children}</>;
}
