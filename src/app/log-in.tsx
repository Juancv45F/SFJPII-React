import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthCard, Divider, GoogleButton, MicrosoftButton } from '../components/AuthParts';
import { Logo } from '../components/Navbar';
import { Screen } from '../components/Screen';
import { Button, Field } from '../components/ui';
import { environment } from '../config/env';
import { googleLogin, login, microsoftLoginWithToken } from '../services/auth';
import { promptMicrosoftIdToken } from '../services/socialAuth';
import { useTheme } from '../theme/ThemeProvider';
import { showToast } from '../ui/overlays';
import { features } from '../config/features';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LogInPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const emailValid = EMAIL_RE.test(email.trim());
  const formValid = emailValid && !!password;

  const onLogin = async () => {
    if (!formValid) return;
    setSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (res?.mfaRequired) showToast('Ingresa el código enviado a tu correo.', 'primary', 2000);
      else showToast(`Bienvenido ${res?.user?.nombre || ''}`.trim(), 'success', 2000);
    } catch (err: any) {
      showToast(err?.error?.message || 'Credenciales incorrectas', 'danger', 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleError = (err: any) =>
    showToast(err?.error?.message || err?.message || 'No se pudo iniciar sesión con Google', 'danger', 2500);

  const onMicrosoft = async () => {
    if (isSubmitting) return;
    setSubmitting(true);
    try {
      const idToken = await promptMicrosoftIdToken();
      await microsoftLoginWithToken(idToken);
    } catch (err: any) {
      showToast(err?.error?.message || err?.message || 'No se pudo iniciar sesión con Microsoft', 'danger', 2500);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleCredential = async (credential: string) => {
    if (isSubmitting) return;
    setSubmitting(true);
    try {
      await googleLogin(credential);
    } catch (err: any) {
      onGoogleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Iniciar sesión" showCart={false} siteFooter>
      <AuthCard>
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary, shadowColor: colors.mode === 'dark' ? '#fff' : '#000' }]}>
            <Logo size={90} />
          </View>
          <Text style={[styles.h1, { color: colors.primary }]}>Farmacia JP II</Text>
          <Text style={[styles.sub, { color: colors.text }]}>Tu salud, nuestra prioridad</Text>
        </View>

        <Field
          variant="outlined"
          icon="mail-outline"
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setEmailTouched(true)}
          keyboardType="email-address"
          autoComplete="username"
          textContentType="username"
          autoCapitalize="none"
          autoCorrect={false}
          error={emailTouched && !emailValid && 'Ingresa un correo válido.'}
        />
        <Field
          variant="outlined"
          icon="lock-closed-outline"
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="current-password"
          textContentType="password"
          autoCapitalize="none"
          autoCorrect={false}
          endIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
          onEndIconPress={() => setShowPassword(v => !v)}
          onSubmitEditing={onLogin}
          containerStyle={{ marginTop: 16 }}
        />
        <View style={{ alignItems: 'flex-end' }}>
          <Button fill="clear" size="small" color="medium" onPress={() => router.push('/forgot-password')}>¿Olvidaste tu contraseña?</Button>
        </View>

        <Button expand round onPress={onLogin} disabled={!formValid || isSubmitting} loading={isSubmitting} style={{ marginTop: 24, minHeight: 46 }}>
          {isSubmitting ? 'Procesando...' : 'Iniciar Sesión'}
        </Button>

        {features.socialLogin && (environment.googleClientId || environment.microsoftClientId) ? (
          <>
            <Divider label="o continúa con" />
            {environment.googleClientId ? (
              <GoogleButton label="Iniciar sesión con Google" onCredential={onGoogleCredential} onError={onGoogleError} disabled={isSubmitting} />
            ) : null}
            {environment.microsoftClientId ? (
              <MicrosoftButton label="Continuar con Microsoft" onPress={onMicrosoft} disabled={isSubmitting} />
            ) : null}
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={{ color: colors.text, fontSize: 14.5 }}>¿No tienes cuenta?</Text>
          <Button fill="clear" size="small" color="secondary" onPress={() => router.push('/register')}>Regístrate aquí</Button>
        </View>
      </AuthCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 90, height: 90, borderRadius: 45, marginBottom: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowOpacity: 0.385, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  h1: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 14.5, opacity: 0.7, marginTop: 5 },
  footer: { alignItems: 'center', marginTop: 32 },
});
