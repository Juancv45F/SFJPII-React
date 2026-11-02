import { useRef, useState } from 'react';
import { Modal, ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthCard, Divider, GoogleButton, MicrosoftButton, PasswordRules, passwordRulesOf } from '../components/AuthParts';
import { Recaptcha, RecaptchaHandle } from '../components/Recaptcha';
import { Screen } from '../components/Screen';
import { Button, Checkbox, Field, Icon, Segment, Spinner } from '../components/ui';
import { environment } from '../config/env';
import { googleLogin, microsoftLoginWithToken, register } from '../services/auth';
import { promptMicrosoftIdToken } from '../services/socialAuth';
import { useTheme } from '../theme/ThemeProvider';
import { showToast } from '../ui/overlays';
import { features } from '../config/features';
import { AppDialog } from '../components/AppDialog';
import { LegalDocument, LegalHeaderIntro } from '../components/Legal';
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED, PRIVACY_VERSION, TERMS_META, TERMS_SECTIONS } from '../content/legal';
import { body, heading, radius } from '../theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIVACY_MSG = 'Debes aceptar el Aviso de Privacidad y los Términos y Condiciones para crear tu cuenta.';

export default function RegisterPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const captcha = useRef<RecaptchaHandle>(null);
  const navigated = useRef(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', confirmPassword: '' });
  const [ubicacion, setUbicacion] = useState({ calle: '', numero: '', codigo_postal: '', descripcion: '', alias: 'Casa' });
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);
  const legalScroll = useRef<ScrollViewInstance | null>(null);

  const setF = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const setU = (k: keyof typeof ubicacion) => (v: string) => setUbicacion(u => ({ ...u, [k]: v }));
  const rules = passwordRulesOf(form.password, form.confirmPassword);
  const step1Valid = !!form.nombre.trim() && !!form.apellido.trim() && EMAIL_RE.test(form.email.trim());
  const step2Valid = !!ubicacion.calle.trim() && !!ubicacion.numero.trim() && !!ubicacion.codigo_postal.trim();
  const formValid = step1Valid && step2Valid && rules.ok;

  const resetCaptcha = () => { setCaptchaToken(''); captcha.current?.reset(); };

  const nextStep = () => {
    if (step === 1 && !step1Valid) return showToast('Completa tus datos personales y correo correctamente', 'warning', 3000);
    if (step === 2 && !step2Valid) return showToast('Completa la dirección de entrega', 'warning', 3000);
    setStep(s => Math.min(3, s + 1));
  };

  const onGoogleError = (err: any) =>
    showToast(err?.error?.message || err?.message || 'No se pudo continuar con Google.', 'danger', 3000);

  const onMicrosoft = async () => {
    if (isSubmitting) return;
    if (!privacyAccepted) return showToast(PRIVACY_MSG, 'warning', 3000);
    setSubmitting(true);
    try {
      const idToken = await promptMicrosoftIdToken();
      await microsoftLoginWithToken(idToken, true);
    } catch (err: any) {
      showToast(err?.error?.message || err?.message || 'No se pudo continuar con Microsoft.', 'danger', 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleCredential = async (credential: string) => {
    if (isSubmitting) return;
    if (!privacyAccepted) return showToast(PRIVACY_MSG, 'warning', 3000);
    setSubmitting(true);
    try {
      await googleLogin(credential, true);
    } catch (err: any) {
      onGoogleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async () => {
    if (isSubmitting) return;
    if (!privacyAccepted) return showToast(PRIVACY_MSG, 'warning', 3000);
    if (!formValid || !captchaToken) {
      showToast('Por favor completa todos los campos y el captcha', 'warning', 3000);
      resetCaptcha();
      return;
    }
    setSubmitting(true);
    const { confirmPassword, ...data } = form;
    const email = data.email.trim();
    try {
      await register({
        ...data, email, ubicacion,
        recaptchaToken: captchaToken, privacyAccepted: true, privacyNoticeVersion: PRIVACY_VERSION,
      });
      showToast('Registro exitoso. Revisa tu correo.', 'success', 3000);
      if (navigated.current) return;
      navigated.current = true;
      router.replace({ pathname: '/verify-code', params: { email } });
    } catch (err: any) {
      resetCaptcha();
      showToast(err?.error?.message || 'Error al registrar usuario', 'danger', 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const stepBg = (active: boolean) => (active ? colors.primary : colors.border);

  return (
    <Screen title="Crear cuenta" backButton hrefBtn="/log-in" showCart={false} siteFooter>
      <AuthCard>
        <View pointerEvents={isSubmitting ? 'none' : 'auto'}>
          {features.socialLogin && (environment.googleClientId || environment.microsoftClientId) ? (<>
          <Text style={[styles.h2, { color: colors.primary }]}>Regístrate más rápido</Text>
          <Text style={[styles.p, { color: colors.text }]}>Usa una cuenta existente. Después podrás agregar tu dirección de entrega.</Text>
          {environment.googleClientId ? (
            <GoogleButton label="Registrarse con Google" onCredential={onGoogleCredential} onError={onGoogleError} disabled={isSubmitting}
              blockedReason={privacyAccepted ? null : PRIVACY_MSG} onBlocked={msg => showToast(msg, 'warning', 3000)} />
          ) : null}
          {environment.microsoftClientId ? (
            <View style={{ opacity: privacyAccepted ? 1 : 0.55 }}>
              <MicrosoftButton label="Continuar con Microsoft" onPress={onMicrosoft} disabled={isSubmitting} />
            </View>
          ) : null}
          <Divider label="o crea tu cuenta con correo" />
          </>) : null}

          <View style={styles.steps}>
            {[1, 2, 3].map(n => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {n > 1 ? <View style={[styles.line, { backgroundColor: stepBg(step >= n) }]} /> : null}
                <View style={[styles.step, { backgroundColor: stepBg(step >= n), transform: [{ scale: step >= n ? 1.1 : 1 }] }]}>
                  <Text style={[heading(700), { fontSize: 14, color: step >= n ? colors.onPrimary : colors.text }]}>{n}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={[styles.stepTitle, { color: colors.primary }]}>{step === 1 ? 'Tus Datos' : step === 2 ? 'Tu Ubicación' : 'Seguridad'}</Text>

          {step === 1 ? (
            <View style={{ gap: 16 }}>
              <Field variant="outlined" icon="person-outline" label="Nombre" value={form.nombre} onChangeText={setF('nombre')} />
              <Field variant="outlined" icon="person-outline" label="Apellidos" value={form.apellido} onChangeText={setF('apellido')} />
              <Field variant="outlined" icon="mail-outline" label="Correo electrónico" value={form.email} onChangeText={setF('email')}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="information-circle" size={16} color={colors.warning} />
                <Text style={{ color: colors.warning, fontSize: 14 }}>Solo entregas en Villa Hidalgo</Text>
              </View>
              <Field variant="outlined" label="Calle" value={ubicacion.calle} onChangeText={setU('calle')} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Field variant="outlined" label="Número" value={ubicacion.numero} onChangeText={setU('numero')} containerStyle={{ flex: 1 }} />
                <Field variant="outlined" label="C.P." value={ubicacion.codigo_postal} onChangeText={setU('codigo_postal')} keyboardType="number-pad" containerStyle={{ flex: 1 }} />
              </View>
              <Field variant="outlined" label="Referencias / Descripción" value={ubicacion.descripcion} onChangeText={setU('descripcion')}
                multiline numberOfLines={3} placeholder="Ej: Entre calles X y Y, portón negro..." />
              <Field variant="outlined" label="Alias (Ej: Casa)" value={ubicacion.alias} onChangeText={setU('alias')} />
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <Field variant="outlined" icon="lock-closed-outline" label="Crea una contraseña" value={form.password} onChangeText={setF('password')}
                secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword"
                endIcon={showPassword ? 'eye-outline' : 'eye-off-outline'} onEndIconPress={() => setShowPassword(v => !v)} />
              <PasswordRules password={form.password} />
              <Field variant="outlined" icon="lock-closed-outline" label="Confirmar contraseña" value={form.confirmPassword} onChangeText={setF('confirmPassword')}
                onBlur={() => setConfirmTouched(true)} secureTextEntry={!showConfirm} autoCapitalize="none" autoCorrect={false}
                endIcon={showConfirm ? 'eye-outline' : 'eye-off-outline'} onEndIconPress={() => setShowConfirm(v => !v)}
                error={confirmTouched && !rules.match && 'Las contraseñas no coinciden.'} containerStyle={{ marginTop: 6 }} />
              <View style={{ marginTop: 16 }}>
                <Recaptcha ref={captcha} onResolved={setCaptchaToken} />
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: 18 }}>
            <Checkbox checked={privacyAccepted} onChange={setPrivacyAccepted}>
              <Text style={[body(400), { color: colors.text, fontSize: 15, lineHeight: 22 }]}>
                He leído y acepto el{' '}
                <Text accessibilityRole="link" style={[body(600), { color: colors.primary, textDecorationLine: 'underline' }]} onPress={() => setLegalDoc('privacy')}>Aviso de Privacidad</Text>
                {' '}y los{' '}
                <Text accessibilityRole="link" style={[body(600), { color: colors.primary, textDecorationLine: 'underline' }]} onPress={() => setLegalDoc('terms')}>Términos y Condiciones</Text>.
              </Text>
            </Checkbox>
            <Text style={[body(400), { color: colors.muted, fontSize: 13.5, marginTop: 4, marginLeft: 34 }]}>Necesitamos tu consentimiento para crear y administrar tu cuenta.</Text>
          </View>

          <View style={styles.nav}>
            {step > 1 ? <Button fill="outline" round onPress={() => setStep(s => s - 1)} style={{ flex: 1 }}>Atrás</Button> : null}
            {step < 3 ? <Button round onPress={nextStep} style={{ flex: 1 }}>Siguiente</Button> : null}
            {step === 3 ? (
              <Button round color="success" onPress={onSubmit} loading={isSubmitting} style={{ flex: 1 }}
                disabled={!formValid || !captchaToken || !privacyAccepted || isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Terminar'}
              </Button>
            ) : null}
          </View>
        </View>
      </AuthCard>

      <AppDialog
        open={legalDoc !== null}
        onClose={() => setLegalDoc(null)}
        title="Documentos legales"
        maxWidth={880}
        scrollRef={legalScroll}
        contentBackground={colors.background}
        tabs={(
          <Segment variant="pill" value={legalDoc || 'privacy'} onChange={v => { setLegalDoc(v); legalScroll.current?.scrollTo({ y: 0, animated: false }); }}
            options={[{ value: 'privacy', label: 'Aviso de privacidad' }, { value: 'terms', label: 'Términos y condiciones' }]} />
        )}
        footer={(
          <>
            <Button fill="clear" onPress={() => setLegalDoc(null)}>Cerrar</Button>
            <Button icon="checkmark" onPress={() => { setPrivacyAccepted(true); setLegalDoc(null); }} style={{ paddingHorizontal: 24, minHeight: 48 }}>
              {privacyAccepted ? 'Aceptado' : 'Acepto el aviso y los términos'}
            </Button>
          </>
        )}
      >
        <View style={styles.legalBody}>
          {legalDoc === 'terms' ? (
            <>
              <LegalHeaderIntro title="Términos y condiciones" lead="Al acceder, navegar o utilizar nuestra aplicación, aceptas los siguientes términos y condiciones. Por favor, léelos con atención." meta={TERMS_META} />
              <LegalDocument sections={TERMS_SECTIONS} />
            </>
          ) : (
            <>
              <LegalHeaderIntro title="Aviso de privacidad" lead={PRIVACY_INTRO} meta={`Versión ${PRIVACY_VERSION} · Última actualización: ${PRIVACY_UPDATED}`} />
              <LegalDocument sections={PRIVACY_SECTIONS} />
            </>
          )}
        </View>
      </AppDialog>

      <Modal visible={isSubmitting} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.progress, { backgroundColor: colors.surface }]}>
            <Spinner size="large" color={colors.primary} />
            <Text style={[body(600), { color: colors.text, marginTop: 12 }]}>Registrando...</Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h2: { ...heading(800), fontSize: 24, textAlign: 'center' },
  p: { ...body(400), fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  legalBody: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32 },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 24 },
  step: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  line: { width: 40, height: 3, marginHorizontal: 5 },
  stepTitle: { ...heading(700), textAlign: 'center', fontSize: 19, marginBottom: 24 },
  nav: { flexDirection: 'row', gap: 10, marginTop: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center' },
  progress: { padding: 28, borderRadius: radius.lg, alignItems: 'center', minWidth: 180 },
});
