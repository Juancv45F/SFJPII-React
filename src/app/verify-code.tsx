import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputInstance, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { AuthCard } from '../components/AuthParts';
import { Screen } from '../components/Screen';
import { Button, Field, Icon } from '../components/ui';
import { resendMfaOtp, resendVerifyCode, verifyCode, verifyMfa } from '../services/auth';
import { rgba } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { showToast } from '../ui/overlays';

type Challenge = 'email' | 'totp' | 'backup';

export default function VerifyCodePage() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; email?: string; mfaToken?: string; mfaMethod?: string }>();
  const mode: 'register' | 'mfa' = params.mode === 'mfa' ? 'mfa' : 'register';
  const mfaToken = params.mfaToken || '';
  const mfaMethod: 'email' | 'totp' = params.mfaMethod === 'totp' ? 'totp' : 'email';
  const email = params.email || (mode === 'mfa' ? 'tu correo' : '');

  const input = useRef<TextInputInstance>(null);
  const lastAuto = useRef('');
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [challenge, setChallenge] = useState<Challenge>(mfaMethod === 'totp' ? 'totp' : 'email');
  const [backupCode, setBackupCode] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const [isResending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const invalid = mode === 'mfa' ? !mfaToken : !params.email;
  useEffect(() => {
    if (invalid) showToast(mode === 'mfa' ? 'Error: Falta token MFA.' : 'Error: No se especificó el correo.', 'danger', 3000);
  }, [invalid, mode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const showDigits = mode !== 'mfa' || challenge !== 'backup';
  const isTotpFlow = mode === 'mfa' && mfaMethod === 'totp';

  const clearDigits = () => {
    setCode('');
    lastAuto.current = '';
    setTimeout(() => input.current?.focus(), 0);
  };

  const onVerify = async (value = code) => {
    if (isSubmitting) return;
    let req: Promise<any>;
    if (mode === 'mfa' && challenge === 'backup') {
      const c = backupCode.trim();
      if (c.length < 8) return showToast('Ingresa un código de respaldo válido.', 'warning', 3000);
      req = verifyMfa(mfaToken, c, 'backup');
    } else {
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 6) return showToast('El código debe tener 6 dígitos.', 'warning', 3000);
      req = mode === 'mfa' ? verifyMfa(mfaToken, digits, challenge === 'totp' ? 'totp' : 'email') : verifyCode(email, digits);
    }
    setSubmitting(true);
    try {
      await req;
      if (mode === 'mfa') showToast('¡Acceso confirmado!', 'success', 3000);
      else {
        showToast('¡Verificación exitosa! Inicia sesión.', 'success', 3000);
        router.replace('/log-in');
      }
    } catch (err: any) {
      showToast(err?.error?.message || 'Código incorrecto', 'danger', 3000);
      if (showDigits) clearDigits();
    } finally {
      setSubmitting(false);
    }
  };

  const onChangeCode = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length < 6) { lastAuto.current = ''; return; }
    if (isSubmitting || digits === lastAuto.current) return;
    lastAuto.current = digits;
    void onVerify(digits);
  };

  const resend = async (switchToEmail: boolean, okMsg: string, errMsg: string) => {
    if (isSubmitting || isResending || cooldown > 0) return;
    setResending(true);
    try {
      const resp: any = mode === 'mfa' ? await resendMfaOtp(mfaToken, 'email') : await resendVerifyCode(email);
      setCooldown(Math.ceil(Number(resp?.retryAfterSec) || 60));
      if (mode === 'mfa' || switchToEmail) setChallenge('email');
      showToast(okMsg, 'success', 3000);
    } catch (err: any) {
      const retry = Number(err?.error?.retryAfterSec) || 0;
      if (retry > 0) setCooldown(Math.ceil(retry));
      showToast(err?.error?.message || errMsg, 'danger', 3000);
    } finally {
      setResending(false);
    }
  };

  if (invalid) return <Redirect href="/log-in" />;

  const accent = colors.primary;
  const activeIndex = Math.min(5, code.length);

  return (
    <Screen title="Verificación" backButton hrefBtn="/log-in" showCart={false} tabs={false} contentStyle={{ flexGrow: 1 }}>
      <AuthCard>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Icon name="mail-outline" size={64} color={accent} />
          <Text style={[styles.h3, { color: colors.text }]}>Código de Verificación</Text>
          {isTotpFlow && challenge === 'totp' ? <Text style={[styles.p, { color: colors.text }]}>Ingresa el código de Google Authenticator.</Text> : null}
          {isTotpFlow && challenge === 'backup' ? <Text style={[styles.p, { color: colors.text }]}>Ingresa un código de respaldo.</Text> : null}
          {!isTotpFlow || challenge === 'email' ? (
            <>
              <Text style={[styles.p, { color: colors.text }]}>Hemos enviado un código al correo:</Text>
              <Text style={[styles.email, { color: accent }]}>{email}</Text>
            </>
          ) : null}
        </View>

        {showDigits ? (
          <View>
            <Text style={{ color: colors.text, fontSize: 14, marginBottom: 8, textAlign: 'center' }}>Código (6 dígitos)</Text>
            <Pressable style={styles.boxes} onPress={() => input.current?.focus()}>
              {Array.from({ length: 6 }, (_, i) => (
                <View key={i} style={[styles.box, {
                  borderColor: focused && activeIndex === i ? colors.primary : rgba(colors.primaryRgb, 0.3),
                  borderWidth: focused && activeIndex === i ? 2 : 1,
                  backgroundColor: colors.surface2,
                }]}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{code[i] || ''}</Text>
                </View>
              ))}
              <TextInput
                ref={input}
                value={code}
                onChangeText={onChangeCode}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                autoFocus
                caretHidden
                style={styles.hidden}
              />
            </Pressable>
          </View>
        ) : (
          <Field variant="outlined" label="Código de respaldo" value={backupCode} onChangeText={setBackupCode}
            placeholder="Ej: A1B2C3D4E5" autoCapitalize="characters" autoCorrect={false} />
        )}

        <Button expand round onPress={() => onVerify()} loading={isSubmitting} style={{ marginTop: 20, minHeight: 46 }}
          disabled={isSubmitting || (showDigits ? code.length < 6 : backupCode.trim().length < 8)}>
          {isSubmitting ? 'Procesando...' : 'Verificar Ahora'}
        </Button>

        <View style={{ alignItems: 'center', marginTop: 16 }}>
          {!isTotpFlow || challenge === 'email' ? (
            <Button fill="clear" size="small" color="medium" disabled={isSubmitting || isResending || cooldown > 0}
              onPress={() => resend(false, 'Código reenviado', 'No se pudo reenviar')}>
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : '¿No recibiste el código? Reenviar'}
            </Button>
          ) : null}
          {isTotpFlow && challenge === 'totp' ? (
            <>
              <Button fill="clear" size="small" color="medium" disabled={isSubmitting || isResending || cooldown > 0}
                onPress={() => resend(true, 'Código enviado por correo', 'No se pudo enviar')}>
                Probar por correo
              </Button>
              <Button fill="clear" size="small" color="medium" disabled={isSubmitting} onPress={() => { setChallenge('backup'); setBackupCode(''); }}>
                Usar código de respaldo
              </Button>
            </>
          ) : null}
          {isTotpFlow && challenge !== 'totp' ? (
            <Button fill="clear" size="small" color="medium" disabled={isSubmitting} onPress={() => { setChallenge('totp'); setBackupCode(''); clearDigits(); }}>
              Volver a Authenticator
            </Button>
          ) : null}
        </View>
      </AuthCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h3: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  p: { fontSize: 14.5, marginTop: 8, textAlign: 'center' },
  email: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: { width: 44, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', width: '100%', height: '100%', opacity: 0.01, color: 'transparent' },
});
