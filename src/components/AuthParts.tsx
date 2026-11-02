import { ReactNode, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { environment } from '../config/env';
import { promptGoogleCredential } from '../services/socialAuth';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { Button } from './ui';

// .auth-container de log-in/register/verify-sms: tarjeta centrada de 400px máx.
export function AuthCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );
}

export function Divider({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.divider}>
      <View style={[styles.line, { backgroundColor: rgba(colors.mediumRgb, 0.35) }]} />
      <Text style={{ color: colors.medium }}>{label}</Text>
      <View style={[styles.line, { backgroundColor: rgba(colors.mediumRgb, 0.35) }]} />
    </View>
  );
}

export function passwordRulesOf(password: string, confirm?: string) {
  const minLength = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const number = /\d/.test(password);
  const special = /[\W_]/.test(password);
  const match = confirm === undefined ? true : !!confirm && password === confirm;
  return { minLength, uppercase, number, special, match, ok: minLength && uppercase && number && special && match };
}

export function PasswordRules({ password }: { password: string }) {
  const { colors } = useTheme();
  const r = passwordRulesOf(password);
  const rules: [boolean, string][] = [[r.minLength, '8 caracteres mínimo'], [r.uppercase, '1 mayúscula'], [r.number, '1 número'], [r.special, '1 caracter especial']];
  return (
    <View style={[styles.rules, { backgroundColor: colors.surface2 }]}>
      {rules.map(([ok, label]) => (
        <View key={label} style={styles.rule}>
          <View style={[styles.dot, { backgroundColor: ok ? colors.success : colors.muted }]} />
          <Text style={{ fontSize: 12.5, color: ok ? colors.success : colors.muted }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// Botón de Google. Web: botón oficial de Google Identity Services (solo requiere el
// origen JavaScript autorizado, sin redirect URI). Nativo: selector en el navegador.
type GoogleButtonProps = {
  label: string;
  mode?: 'login' | 'link';
  onCredential: (credential: string) => unknown;
  onError?: (err: any) => void;
  disabled?: boolean;
  /** Si hay mensaje, el botón queda bloqueado y al tocarlo se muestra el aviso. */
  blockedReason?: string | null;
  onBlocked?: (reason: string) => void;
  compact?: boolean;
};

export function GoogleButton(props: GoogleButtonProps) {
  const { label, blockedReason, onBlocked, compact } = props;
  const inner = Platform.OS === 'web' ? <GoogleWebButton {...props} /> : <GoogleNativeButton {...props} />;
  return (
    <View style={[{ width: compact ? undefined : '100%', alignItems: compact ? 'flex-end' : 'center' }, !!blockedReason && { opacity: 0.55 }]}>
      {inner}
      {blockedReason ? (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onBlocked?.(blockedReason)} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}

function GoogleNativeButton({ label, mode = 'login', onCredential, onError, disabled, compact }: GoogleButtonProps) {
  const onPress = async () => {
    let credential: string;
    try {
      credential = await promptGoogleCredential(mode);
    } catch (err) {
      onError?.(err);
      return;
    }
    await onCredential(credential);
  };
  return compact ? (
    <Button fill="outline" size="small" onPress={onPress} disabled={disabled}>Vincular</Button>
  ) : (
    <Button fill="outline" round expand onPress={onPress} disabled={disabled} icon="logo-google" color="medium"
      style={{ backgroundColor: '#ffffff', borderColor: '#dadce0', minHeight: 44 }} textStyle={{ color: '#3c4043', fontWeight: '500' }}>
      {label}
    </Button>
  );
}

let gisScript: Promise<any> | null = null;
function loadGis(): Promise<any> {
  const w = window as any;
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  if (!gisScript) {
    gisScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(w.google);
      script.onerror = () => { gisScript = null; reject(new Error('No se pudo cargar Google')); };
      document.head.appendChild(script);
    });
  }
  return gisScript;
}

function GoogleWebButton({ mode = 'login', onCredential, onError, disabled, compact }: GoogleButtonProps) {
  const { isDark: dark } = useTheme();
  const host = useRef<any>(null);
  const handlers = useRef({ onCredential, onError });
  useEffect(() => { handlers.current = { onCredential, onError }; });

  useEffect(() => {
    const el = host.current as unknown as HTMLElement | null;
    if (!el || !environment.googleClientId) return;
    let alive = true;
    loadGis().then(google => {
      if (!alive || !google?.accounts?.id) return;
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        cancel_on_tap_outside: false,
        callback: (resp: any) => {
          const credential = String(resp?.credential || '');
          if (credential) void handlers.current.onCredential(credential);
          else handlers.current.onError?.(new Error('No se obtuvo la credencial de Google'));
        },
      });
      el.innerHTML = '';
      google.accounts.id.renderButton(el, {
        type: 'standard',
        theme: dark ? 'filled_black' : 'outline',
        size: compact ? 'medium' : 'large',
        shape: 'pill',
        locale: 'es',
        text: mode === 'link' ? 'continue_with' : 'signin_with',
        logo_alignment: 'center',
        ...(compact ? {} : { width: Math.min(400, Math.max(200, Math.floor(el.parentElement?.clientWidth || 300))) }),
      });
    }).catch(err => handlers.current.onError?.(err));
    return () => { alive = false; };
  }, [dark, mode, compact]);

  return (
    <View style={{ width: compact ? undefined : '100%', alignItems: 'center' }}
      pointerEvents={disabled ? 'none' : 'auto'}>
      <View ref={host} style={{ minHeight: compact ? 32 : 44, opacity: disabled ? 0.6 : 1 }} />
    </View>
  );
}

export function MicrosoftButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Button fill="outline" round expand onPress={onPress} disabled={disabled} style={{ marginTop: 10, minHeight: 44 }} textStyle={{ fontWeight: '600' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MicrosoftLogo />
        <Text style={{ fontWeight: '600', fontSize: 15, marginLeft: 8, color: colors.primary }}>{label}</Text>
      </View>
    </Button>
  );
}

function MicrosoftLogo() {
  return (
    <View style={{ width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
      {['#f25022', '#7fba00', '#00a4ef', '#ffb900'].map(c => <View key={c} style={{ width: 8.5, height: 8.5, backgroundColor: c }} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  card: {
    width: '100%', maxWidth: 400, padding: 28, borderRadius: 20,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 12 },
  line: { height: 1, flex: 1 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, borderRadius: 8, marginVertical: 10, rowGap: 8 },
  rule: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
