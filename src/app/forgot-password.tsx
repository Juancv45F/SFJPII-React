import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useRouter } from 'expo-router';
import { passwordRulesOf } from '../components/AuthParts';
import { SimpleHeader } from '../components/Navbar';
import { Screen } from '../components/Screen';
import { Button, Icon } from '../components/ui';
import { requestRecovery, resetPasswordWithToken, verifyRecovery } from '../services/auth';
import { useTheme } from '../theme/ThemeProvider';
import { showToast } from '../ui/overlays';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const QUESTION_TEXT: Record<string, string> = {
  ciudad: '¿En qué ciudad naciste?',
  mascota: '¿Cuál es el nombre de tu primera mascota?',
  madre: '¿Cuál es el segundo nombre de tu madre?',
};
type Method = 'email' | 'sms' | 'call';
type Question = { id: string; text: string };

const toQuestions = (list: any[]): Question[] => list.map((q: any, i: number) => {
  const id = String(q?.id || q?.questionId || (typeof q === 'string' ? q : '') || `q${i + 1}`);
  return { id, text: String(q?.text || q?.question || QUESTION_TEXT[id] || 'Pregunta de seguridad') };
});

export default function ForgotPasswordPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<Method>('email');
  const [token, setToken] = useState('');
  const [hasQuestions, setHasQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedQuestionId, setSelectedQuestionId] = useState('ciudad');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const rules = passwordRulesOf(newPassword);
  const mismatch = newPassword !== confirmPassword;
  const accent = colors.primary;
  const inputBg = colors.surface2;
  const borderColor = colors.border;

  const step2Valid = (() => {
    if (!token.trim()) return false;
    if (!hasQuestions) return true;
    if (questions.length) return questions.every((_, i) => !!answers[i]?.trim());
    return !!selectedQuestionId && !!selectedAnswer.trim();
  })();

  const buildAnswers = () => {
    if (!hasQuestions) return [];
    if (questions.length) return questions.map((q, i) => ({ questionId: q.id, answer: (answers[i] || '').trim() })).filter(a => a.answer);
    return selectedAnswer.trim() ? [{ questionId: selectedQuestionId, answer: selectedAnswer.trim() }] : [];
  };

  const onRequest = async () => {
    setBusy(true);
    try {
      const res: any = await requestRecovery(email.trim(), method);
      showToast(res?.message, 'success', 3000);
      const requires = !!(res?.requiresQuestions || res?.hasQuestions || res?.questions?.length);
      setHasQuestions(requires);
      setQuestions(requires && Array.isArray(res?.questions) ? toQuestions(res.questions) : []);
      setAnswers({});
      setStep(2);
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al solicitar código', 'danger', 3000);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setBusy(true);
    try {
      const res: any = await verifyRecovery(email.trim(), token.trim(), buildAnswers());
      setResetToken(res?.resetToken);
      showToast('Identidad verificada', 'success', 3000);
      setStep(3);
    } catch (err: any) {
      const msg: string = err?.error?.message || '';
      if (/preguntas|questions|respuestas|secretas/i.test(msg)) {
        setHasQuestions(true);
        const ids = err?.error?.questionIds || err?.error?.requiredQuestionIds || err?.error?.questions;
        if (Array.isArray(ids) && ids.length) {
          setQuestions(toQuestions(ids));
          setAnswers({});
        }
      }
      showToast(msg || 'Error en la verificación', 'danger', 3000);
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    setBusy(true);
    try {
      await resetPasswordWithToken(email.trim(), resetToken, newPassword);
      showToast('Contraseña restablecida con éxito', 'success', 3000);
      router.replace('/log-in');
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al restablecer contraseña', 'danger', 3000);
    } finally {
      setBusy(false);
    }
  };

  const Input = ({ icon, end, label, ...props }: TextInputProps & { icon?: string; end?: ReactNode; label?: string }) => (
    <View style={{ marginBottom: 20 }}>
      {label ? <Text style={{ color: colors.text, fontSize: 13, marginBottom: 6 }}>{label}</Text> : null}
      <View style={[styles.input, { backgroundColor: inputBg }]}>
        {icon ? <Icon name={icon} size={20} color={accent} style={{ marginRight: 12 }} /> : null}
        <TextInput placeholderTextColor={colors.medium} style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 }} {...props} />
        {end}
      </View>
    </View>
  );

  const RadioItem = ({ selected, label, icon, onPress }: { selected: boolean; label: string; icon?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.method, { borderColor }]}>
      <View style={[styles.radio, { borderColor: selected ? accent : colors.medium }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: accent }]} /> : null}
      </View>
      <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{label}</Text>
      {icon ? <Icon name={icon} size={20} color={colors.medium} /> : null}
    </Pressable>
  );

  const eye = (shown: boolean, toggle: () => void) => (
    <Pressable onPress={toggle} hitSlop={8} style={{ padding: 6 }}>
      <Icon name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={accent} />
    </Pressable>
  );

  const ruleRow = (ok: boolean, label: string) => (
    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}>
      <Icon name={ok ? 'checkmark-circle' : 'close-circle'} size={18} color={ok ? colors.success : colors.medium} style={{ marginRight: 8 }} />
      <Text style={{ fontSize: 13.5, color: ok ? colors.success : colors.medium }}>{label}</Text>
    </View>
  );

  const methodLabel = method === 'email' ? 'correo' : method === 'sms' ? 'teléfono vía SMS' : 'teléfono vía llamada';

  return (
    <Screen header={<SimpleHeader title="Recuperar Contraseña" defaultHref="/log-in" />} tabs={false}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {step === 1 ? (
          <>
            <Text style={[styles.h2, { color: accent }]}>¿Olvidaste tu contraseña?</Text>
            <Text style={[styles.p, { color: colors.medium }]}>Ingresa tu correo electrónico y elige cómo recibir el código de recuperación.</Text>
            {Input({ icon: 'mail-outline', value: email, onChangeText: setEmail, placeholder: 'Correo electrónico', keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false })}
            <View style={{ marginBottom: 24 }}>
              {RadioItem({ selected: method === 'email', label: 'Correo Electrónico', icon: 'mail-unread-outline', onPress: () => setMethod('email') })}
              {RadioItem({ selected: method === 'sms', label: 'SMS (Simulado)', icon: 'chatbubble-ellipses-outline', onPress: () => setMethod('sms') })}
              {RadioItem({ selected: method === 'call', label: 'Llamada (Simulado)', icon: 'call-outline', onPress: () => setMethod('call') })}
            </View>
            <Button expand onPress={onRequest} loading={busy} disabled={!EMAIL_RE.test(email.trim()) || busy} style={styles.main}>Enviar Código</Button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={[styles.h2, { color: accent }]}>Verificación</Text>
            <Text style={[styles.p, { color: colors.medium }]}>Hemos enviado un código a tu {methodLabel}.</Text>
            {Input({ icon: 'key-outline', value: token, onChangeText: setToken, placeholder: 'Código de 6 dígitos', maxLength: 6, keyboardType: 'number-pad' })}
            {hasQuestions ? (
              <View style={[styles.questions, { borderTopColor: borderColor }]}>
                <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 12 }}>Preguntas de Seguridad:</Text>
                {questions.length === 0 ? (
                  <>
                    {Object.keys(QUESTION_TEXT).map(qid => (
                      <View key={qid}>{RadioItem({ selected: selectedQuestionId === qid, label: QUESTION_TEXT[qid], onPress: () => setSelectedQuestionId(qid) })}</View>
                    ))}
                    <View style={{ height: 12 }} />
                    {Input({ label: QUESTION_TEXT[selectedQuestionId], value: selectedAnswer, onChangeText: setSelectedAnswer, placeholder: 'Tu respuesta' })}
                  </>
                ) : questions.map((q, i) => (
                  <View key={`${q.id}_${i}`}>
                    {Input({ label: q.text, value: answers[i] || '', onChangeText: v => setAnswers(a => ({ ...a, [i]: v })), placeholder: 'Tu respuesta' })}
                  </View>
                ))}
              </View>
            ) : null}
            <Button expand onPress={onVerify} loading={busy} disabled={!step2Valid || busy} style={styles.main}>Verificar Identidad</Button>
            <Button expand fill="clear" color="medium" onPress={() => setStep(1)}>Cambiar método / correo</Button>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={[styles.h2, { color: accent }]}>Nueva Contraseña</Text>
            <Text style={[styles.p, { color: colors.medium }]}>Establece una nueva contraseña segura para tu cuenta.</Text>
            {Input({
              icon: 'lock-closed-outline', value: newPassword, onChangeText: setNewPassword, placeholder: 'Nueva contraseña',
              secureTextEntry: !showPassword, autoCapitalize: 'none', autoCorrect: false, textContentType: 'newPassword',
              end: eye(showPassword, () => setShowPassword(v => !v)),
            })}
            {newPassword ? (
              <View style={[styles.rules, { backgroundColor: inputBg, borderColor }]}>
                {ruleRow(rules.minLength, 'Mínimo 8 caracteres')}
                {ruleRow(rules.uppercase, 'Al menos una mayúscula')}
                {ruleRow(rules.number, 'Al menos un número')}
                {ruleRow(rules.special, 'Al menos un carácter especial')}
              </View>
            ) : null}
            {Input({
              icon: 'lock-closed-outline', value: confirmPassword, onChangeText: setConfirmPassword, onBlur: () => setConfirmTouched(true),
              placeholder: 'Confirmar contraseña', secureTextEntry: !showConfirm, autoCapitalize: 'none', autoCorrect: false,
              end: eye(showConfirm, () => setShowConfirm(v => !v)),
            })}
            {mismatch && confirmTouched ? <Text style={{ color: colors.danger, marginTop: -12, marginBottom: 12 }}>Las contraseñas no coinciden.</Text> : null}
            <Button expand onPress={onReset} loading={busy} disabled={!rules.ok || mismatch || busy} style={styles.main}>Restablecer Contraseña</Button>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', maxWidth: 500, alignSelf: 'center', marginTop: 24, padding: 24, borderRadius: 20,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  h2: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  p: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  input: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  main: { minHeight: 50, borderRadius: 12, marginTop: 10 },
  questions: { marginTop: 4, paddingTop: 20, borderTopWidth: 1 },
  rules: { marginBottom: 20, padding: 10, borderRadius: 12, borderWidth: 1 },
});
