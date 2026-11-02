import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createAudioPlayer } from 'expo-audio';
import { useFonts } from 'expo-font';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Figtree_800ExtraBold } from '@expo-google-fonts/figtree/800ExtraBold';
import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_500Medium } from '@expo-google-fonts/noto-sans/500Medium';
import { NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans/600SemiBold';
import { NotoSans_700Bold } from '@expo-google-fonts/noto-sans/700Bold';
import { CartMenu, CartMenuHandle } from '../components/CartMenu';
import { ClientChatbot } from '../components/ClientChatbot';
import { MainMenu } from '../components/MainMenu';
import { OverlayHost } from '../components/OverlayHost';
import { SideDrawer } from '../components/SideDrawer';
import { getMe } from '../services/auth';
import { cart } from '../services/cart';
import { notifications } from '../services/notifications';
import { fetchPendingOrders } from '../services/orders';
import { currentRole, storage } from '../services/storage';
import { ws } from '../services/websocket';
import { cartMenuOpen, mainMenuOpen, useSession, useValue } from '../state/app';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { presentToast, showToast } from '../ui/overlays';
import { features } from '../config/features';
import { palettes } from '../theme/colors';

import { STAFF_ROLES as STAFF } from '../config/roles';

function Shell() {
  const { colors } = useTheme();
  const router = useRouter();
  const mainOpen = useValue(mainMenuOpen);
  const cartOpen = useValue(cartMenuOpen);
  const { role, isAuthenticated } = useSession();
  const cartRef = useRef<CartMenuHandle>(null);

  // inicializarNotificaciones() de AppComponent.
  useEffect(() => {
    ws.connect();
    if (storage.get('token')) getMe().catch(() => {});
    cart.retryPending();
    const offNew = ws.onNuevosPedidos(data => {
      if (!STAFF.includes(currentRole())) return;
      try {
        const player = createAudioPlayer(require('../../assets/sounds/alert.mp3'));
        player.play();
        setTimeout(() => player.remove(), 5000);
      } catch { /* sin audio */ }
      presentToast({
        header: 'Pedidos', message: data.mensaje, duration: 5000, position: 'top',
        buttons: [{ text: 'VER', handler: () => router.push(`/pedidos/detalle/${data.pedidoId}`) }, { role: 'cancel', icon: 'close' }],
      });
    });
    const offUpd = ws.onActualizacionesPedidos(() => {
      if (STAFF.includes(currentRole())) fetchPendingOrders().catch(() => {});
    });
    const offConflicts = cart.conflicts.subscribe(conflicts => {
      if (conflicts.length) showToast('El inventario cambió. Abre tu carrito para revisar los productos y elegir si deseas encargarlos.', 'warning', 7000);
    });
    return () => { offNew(); offUpd(); offConflicts(); };
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }} />
      <SideDrawer open={mainOpen} onClose={() => mainMenuOpen.set(false)} side="start">
        <MainMenu />
      </SideDrawer>
      <SideDrawer open={cartOpen} onClose={() => cartMenuOpen.set(false)} side="end" onOpened={() => cartRef.current?.animateHint()}>
        <CartMenu ref={cartRef} />
      </SideDrawer>
      {features.aiAssistant && role === 'cliente' && isAuthenticated ? <ClientChatbot /> : null}
      <OverlayHost />
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  // Si las fuentes fallan se usa la del sistema; no se bloquea el arranque.
  const [fontsLoaded, fontError] = useFonts({
    Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
    NotoSans_400Regular, NotoSans_500Medium, NotoSans_600SemiBold, NotoSans_700Bold,
  });
  useEffect(() => {
    storage.hydrate().finally(() => {
      cart.init();
      notifications.init();
      setReady(true);
    });
  }, []);
  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palettes.light.background }}>
        <ActivityIndicator size="large" color={palettes.light.primary} />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
