import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from './WebViewCompat';
import { environment } from '../config/env';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './ui';

export type RecaptchaHandle = { reset: () => void };

// El token de reCAPTCHA v2 caduca a los 2 minutos.
const TOKEN_TTL_MS = 110_000;

// Sustituto de <re-captcha> (ng-recaptcha). El widget se abre en un modal a pantalla completa:
// si el WebView cambia de tamaño mientras está el desafío de imágenes, reCAPTCHA lo descoloca y lo cierra.
export const Recaptcha = forwardRef<RecaptchaHandle, { onResolved: (token: string) => void }>(({ onResolved }, ref) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(onResolved);
  useEffect(() => { callback.current = onResolved; }, [onResolved]);
  useEffect(() => () => { if (expiry.current) clearTimeout(expiry.current); }, []);

  const clear = () => {
    if (expiry.current) clearTimeout(expiry.current);
    setVerified(false);
  };
  useImperativeHandle(ref, () => ({ reset: clear }));

  const onMessage = (e: WebViewMessageEvent) => {
    const data = e.nativeEvent.data;
    if (data === '__ready') return setLoading(false);
    if (!data) return;
    setVerified(true);
    setOpen(false);
    callback.current(data);
    if (expiry.current) clearTimeout(expiry.current);
    expiry.current = setTimeout(() => { setVerified(false); callback.current(''); }, TOKEN_TTL_MS);
  };

  const html = useMemo(() => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>html,body{margin:0;padding:0;height:100%;background:transparent}
body{display:flex;align-items:center;justify-content:center}</style>
<script>
function send(t){window.ReactNativeWebView.postMessage(t||'')}
function onLoad(){grecaptcha.render('c',{sitekey:'${environment.recaptchaSiteKey}',theme:'${isDark ? 'dark' : 'light'}',callback:send});send('__ready')}
</script>
<script src="https://www.google.com/recaptcha/api.js?onload=onLoad&render=explicit&hl=es" async defer></script>
</head><body><div id="c"></div></body></html>`, [isDark]);

  const accent = colors.primary;
  return (
    <>
      <Pressable
        onPress={() => { if (!verified) { setLoading(true); setOpen(true); } }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: verified }}
        style={[styles.box, { backgroundColor: isDark ? '#222' : '#f9f9f9', borderColor: isDark ? '#555' : '#d3d3d3' }]}>
        <View style={[styles.check, { borderColor: verified ? '#2fa785' : (isDark ? '#888' : '#c1c1c1'), backgroundColor: isDark ? '#333' : '#fff' }]}>
          {verified ? <Icon name="checkmark" size={24} color="#2fa785" /> : null}
        </View>
        <Text style={[styles.label, { color: colors.text }]}>{verified ? 'Verificado' : 'No soy un robot'}</Text>
        <View style={{ alignItems: 'center' }}>
          <Icon name="shield-checkmark" size={26} color={accent} />
          <Text style={[styles.brand, { color: colors.medium }]}>reCAPTCHA</Text>
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Pressable onPress={() => setOpen(false)} style={[styles.close, { top: insets.top + 8 }]} accessibilityLabel="Cerrar" hitSlop={8}>
            <Icon name="close" size={28} color="#fff" />
          </Pressable>
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: environment.recaptchaBaseUrl }}
            onMessage={onMessage}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            containerStyle={{ backgroundColor: 'transparent' }}
            javaScriptEnabled
            setSupportMultipleWindows={false}
          />
          {loading ? <ActivityIndicator size="large" color="#fff" style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
        </View>
      </Modal>
    </>
  );
});
Recaptcha.displayName = 'Recaptcha';

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, height: 76, width: 300, alignSelf: 'center', gap: 12 },
  check: { width: 28, height: 28, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15 },
  brand: { fontSize: 9, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  close: { position: 'absolute', right: 12, zIndex: 2, elevation: 2, padding: 4 },
});
