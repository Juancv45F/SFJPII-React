import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Spinner } from './ui';
import { useTheme } from '../theme/ThemeProvider';

// Destino del redirect de Google en nativo (página puente) y de Microsoft: WebBrowser/AuthSession
// consumen la URL; si el sistema además abre esta ruta, se regresa a la pantalla previa.
// En web esta ruta abre dentro de la ventana emergente del proveedor: entrega el resultado y la cierra.
WebBrowser.maybeCompleteAuthSession();

export function AuthRedirect() {
  const { colors } = useTheme();
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/catalogo')), 1200);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Spinner size="large" color={colors.primary} />
    </View>
  );
}
