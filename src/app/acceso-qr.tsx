import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Icon, Spinner } from '../components/ui';
import { validateSsoToken } from '../services/auth';
import { useTheme } from '../theme/ThemeProvider';

// Port de QrLoginPage: valida el ssoToken del QR generado en Configuración.
export default function AccesoQrPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ssoToken } = useLocalSearchParams<{ ssoToken?: string }>();
  const token = String(ssoToken || '');
  const [state, setState] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? 'Verificando el código QR…' : 'El enlace no contiene un código de acceso válido.');

  useEffect(() => {
    if (!token) return;
    validateSsoToken(token)
      .then(() => { setState('success'); setMessage('Sesión iniciada. Abriendo el catálogo…'); })
      .catch((err: any) => { setState('error'); setMessage(err?.error?.message || 'El código venció o ya no es válido.'); });
  }, [token]);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.panel} accessibilityLiveRegion="polite">
        {state === 'loading' ? <Spinner size="large" color={colors.primary} /> : null}
        {state === 'success' ? <Icon name="checkmark-circle-outline" size={64} color={colors.success} /> : null}
        {state === 'error' ? <Icon name="close-circle-outline" size={64} color={colors.danger} /> : null}
        <Text style={[styles.h1, { color: colors.text }]}>{state === 'error' ? 'No se pudo iniciar sesión' : 'Acceso con código QR'}</Text>
        <Text style={{ color: colors.text, textAlign: 'center', marginBottom: 20 }}>{message}</Text>
        {state === 'error' ? <Button expand onPress={() => router.replace('/log-in')}>Iniciar sesión de otra forma</Button> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { width: '100%', maxWidth: 440, paddingHorizontal: 16, paddingVertical: 28, alignItems: 'center' },
  h1: { fontSize: 24, fontWeight: '700', marginTop: 16, marginBottom: 10, textAlign: 'center' },
});
