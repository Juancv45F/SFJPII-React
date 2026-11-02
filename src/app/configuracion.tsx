import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleButton, passwordRulesOf, PasswordRules } from '../components/AuthParts';
import { LOGO } from '../components/Navbar';
import { Guard, Screen } from '../components/Screen';
import { Badge, Button, Field, Icon, SectionTitle, Segment, Select, Toggle } from '../components/ui';
import { environment } from '../config/env';
import {
  addUbicacion, beginTotpSetup, changePassword, deleteAccount, deleteCategoria, deletePasskeys, deleteUbicacion, generateSsoToken,
  getCategoriasAdmin, getMe, getUbicaciones, linkGoogle, listPasskeys, listSessions, renamePasskey, resetTotpStart, resetTotpVerify,
  revokeOtherSessions, revokeSession, unlinkGoogle, updateCategoria, updateMfa, updatePreferences, updateProfile, updateRecoveryQuestions,
  updateUbicacion, verifyTotpSetup,
} from '../services/auth';
import { currentRole, storage } from '../services/storage';
import { rgba } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { showAlert, showLoading, showToast } from '../ui/overlays';
import { mediumDate, medium, short, shortTime } from '../utils/format';
import { features } from '../config/features';

type SegmentValue = 'general' | 'seguridad' | 'ubicaciones' | 'categorias';
const PHONE_RE = /^\+?[0-9\s()-]{7,25}$/;
const EMPTY_UBICACION = { id: '', calle: '', numero: '', codigo_postal: '', alias: '', descripcion: '' };

function getBrowserInfo(userAgent: string): string {
  if (!userAgent) return 'Desconocido';
  let browser = 'Navegador';
  let os = '';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  else if (userAgent.includes('Macintosh')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  if (userAgent.includes('Edg/')) browser = 'Edge';
  else if (userAgent.includes('OPR/') || userAgent.includes('Opera')) browser = 'Opera';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Firefox/')) browser = 'Firefox';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) browser = 'Safari';
  else if (/okhttp|Expo|ReactNative|Darwin|CFNetwork/i.test(userAgent)) browser = 'App SFJPII';
  return os ? `${browser} (${os})` : browser;
}

const isMobileSession = (userAgent: string) => /Android|iPhone|iPad|Mobile|okhttp|Darwin/i.test(String(userAgent || ''));

const normalizeSessions = (value: any) => (Array.isArray(value) ? value : [])
  .filter((s: any) => !!s && (s.active === true || s.isCurrent === true))
  .sort((a: any, b: any) => Number(!!b.isCurrent) - Number(!!a.isCurrent));

export default function ConfiguracionPage() {
  return (
    <Guard>
      <Configuracion />
    </Guard>
  );
}

function Configuracion() {
  const { colors, isDark, mode, setMode } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ segment?: string; requiredLocation?: string }>();
  const [segment, setSegment] = useState<SegmentValue>(params.segment === 'ubicaciones' ? 'ubicaciones' : 'general');
  const [me, setMe] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'email' | 'totp'>('email');
  const [totpConfigured, setTotpConfigured] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState({ nombre: '', apellido: '', telefono: '', foto_perfil: '' });
  const [isSavingProfile, setSavingProfile] = useState(false);
  const [questions, setQuestions] = useState({ question1: '', answer1: '' });
  const [isSavingQuestions, setSavingQuestions] = useState(false);
  const [ubicacionForm, setUbicacionForm] = useState(EMPTY_UBICACION);
  const [isEditingUbicacion, setEditingUbicacion] = useState(false);
  const [categoriaForm, setCategoriaForm] = useState({ nombre: '', descripcion: '', nombreOriginal: '' });
  const [isEditingCategoria, setEditingCategoria] = useState(false);

  const [qr, setQr] = useState<{ dataUrl: string; expiresAt: Date | null; open: boolean }>({ dataUrl: '', expiresAt: null, open: false });
  const [isGeneratingQr, setGeneratingQr] = useState(false);
  const [totpModal, setTotpModal] = useState<{ kind: 'setup' | 'reset'; qr: string; secret: string } | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [isLinkingGoogle, setLinkingGoogle] = useState(false);
  const [isUnlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [isDeletingAccount, setDeletingAccount] = useState(false);

  const userRole: string = me?.rol || currentRole() || 'cliente';
  const otherSessionsCount = sessions.filter(s => !s?.isCurrent).length;
  const accent = colors.primary;
  const itemBg = colors.surface2;
  const itemBorder = colors.border;
  const mutedText = colors.muted;

  const reloadSessionsOnly = useCallback(async () => {
    try { setSessions(normalizeSessions((await listSessions())?.sessions)); } catch { /* sin cambios */ }
  }, []);

  const loadPasskeys = useCallback(async () => {
    try {
      const resp: any = await listPasskeys();
      setPasskeys(Array.isArray(resp?.credentials) ? resp.credentials : []);
    } catch {
      setPasskeys([]);
    }
  }, []);

  const reloadAll = useCallback(async (withLoading = true) => {
    const dismiss = withLoading ? showLoading('Cargando...') : () => {};
    const meReq = getMe().then((resp: any) => {
      const user = resp?.user || null;
      setMe(user);
      setProfile({ nombre: user?.nombre || '', apellido: user?.apellido || '', telefono: user?.telefono || '', foto_perfil: user?.foto_perfil || '' });
      const t = user?.preferences?.theme;
      const l = user?.preferences?.language;
      if (t === 'dark' || t === 'light') setMode(t);
      if (l === 'es' || l === 'en') setLanguage(l);
      setMfaEnabled(!!user?.mfa?.enabled);
      setMfaMethod(user?.mfa?.method === 'totp' ? 'totp' : 'email');
      setTotpConfigured(!!user?.mfa?.totpConfigured);
      loadPasskeys();
      if ((user?.rol || 'cliente') === 'cliente') getUbicaciones().then((r: any) => setUbicaciones(r?.data || [])).catch(() => {});
      else getCategoriasAdmin().then((r: any) => setCategorias(r?.data || [])).catch(() => {});
    }).catch(() => {});
    await Promise.allSettled([meReq, reloadSessionsOnly()]);
    dismiss();
  }, [loadPasskeys, reloadSessionsOnly, setMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    reloadAll();
    if (params.requiredLocation) showToast('Agrega una dirección de entrega para continuar.', 'warning', 3500);
  }, [reloadAll, params.requiredLocation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reloadAll(false);
    setRefreshing(false);
  };

  // ---- General ----
  const profileValid = !!profile.nombre.trim() && !!profile.apellido.trim()
    && (!profile.telefono || PHONE_RE.test(profile.telefono)) && (!profile.foto_perfil || /^https:\/\/.+/i.test(profile.foto_perfil));

  const onSaveProfile = async () => {
    if (!profileValid || isSavingProfile) return;
    setSavingProfile(true);
    try {
      const resp: any = await updateProfile(profile);
      setMe((m: any) => ({ ...m, ...resp?.user }));
      showToast('Información actualizada.', 'success');
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo actualizar.', 'danger');
    } finally {
      setSavingProfile(false);
    }
  };

  const applyProviderPhoto = (provider: 'google' | 'microsoft') => {
    const photo = me?.providers?.[`${provider}Info`]?.foto_perfil;
    if (!photo) return showToast('Ese proveedor no compartió una foto de perfil.', 'warning');
    setProfile(p => ({ ...p, foto_perfil: photo }));
  };

  const onLanguageChange = (l: 'es' | 'en') => {
    setLanguage(l);
    updatePreferences({ language: l }).catch(() => {});
  };

  const onRevokeSession = async (sessionId: string) => {
    const dismiss = showLoading('Cerrando sesión...');
    try {
      await revokeSession(sessionId);
      dismiss();
      await reloadSessionsOnly();
      showToast('Sesión cerrada', 'success');
    } catch (err: any) {
      dismiss();
      showToast(err?.error?.message || 'Error al cerrar sesión', 'danger');
    }
  };

  const onRevokeOthers = async () => {
    if (!storage.get('refreshToken')) return showToast('No hay refresh token activo', 'warning');
    const dismiss = showLoading('Cerrando sesiones...');
    try {
      const resp: any = await revokeOtherSessions();
      dismiss();
      await reloadSessionsOnly();
      showToast(`Sesiones cerradas: ${Number(resp?.revokedCount || 0)}`, 'success');
    } catch (err: any) {
      dismiss();
      showToast(err?.error?.message || 'Error al cerrar sesiones', 'danger');
    }
  };

  const onCreateQrLogin = async () => {
    if (isGeneratingQr) return;
    setGeneratingQr(true);
    try {
      const resp: any = await generateSsoToken();
      const dataUrl = String(resp?.qrDataUrl || '');
      const seconds = Math.max(1, Number(resp?.expiresInSeconds || 60));
      setQr({ dataUrl, expiresAt: new Date(Date.now() + seconds * 1000), open: !!dataUrl });
      if (!dataUrl) showToast('No se pudo generar el código QR.', 'danger');
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo generar el código QR.', 'danger');
    } finally {
      setGeneratingQr(false);
    }
  };

  // ---- Seguridad ----
  const askCurrentPassword = async (message: string): Promise<string> => {
    if (me?.passwordConfigured === false) return '';
    const result = await showAlert({
      header: 'Confirmar contraseña', message,
      inputs: [{ name: 'pwd', type: 'password', placeholder: 'Contraseña actual' }],
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Continuar', role: 'confirm' }],
    });
    if (result.role !== 'confirm') throw new Error('cancelado');
    const pwd = String(result.values?.pwd || '').trim();
    if (!pwd) {
      showToast('Debes escribir tu contraseña actual', 'warning');
      throw new Error('cancelado');
    }
    return pwd;
  };

  const onLinkGoogleError = (err: any) => {
    if (err?.message !== 'cancelado') showToast(err?.error?.message || err?.message || 'No se pudo vincular Google.', 'danger');
  };

  const onLinkGoogle = async (credential: string) => {
    if (isLinkingGoogle) return;
    setLinkingGoogle(true);
    try {
      const currentPassword = await askCurrentPassword('Confirma tu contraseña para asociar esta cuenta de Google.');
      await linkGoogle(credential, currentPassword || undefined);
      showToast('Google vinculado correctamente.', 'success');
      reloadAll();
    } catch (err: any) {
      onLinkGoogleError(err);
    } finally {
      setLinkingGoogle(false);
    }
  };

  const onUnlinkGoogle = async () => {
    if (isUnlinkingGoogle) return;
    setUnlinkingGoogle(true);
    try {
      const currentPassword = await askCurrentPassword('Confirma tu contraseña para desvincular Google.');
      await unlinkGoogle(currentPassword || undefined);
      showToast('Google desvinculado.', 'success');
      reloadAll();
    } catch (err: any) {
      if (err?.message !== 'cancelado') showToast(err?.error?.message || 'No se pudo desvincular Google.', 'danger');
    } finally {
      setUnlinkingGoogle(false);
    }
  };

  // Expo Go no incluye el módulo nativo de Credential Manager / WebAuthn.
  const onCreatePasskey = () => showToast('Las passkeys requieren una development build; Expo Go no las soporta.', 'warning', 3000);

  const onRenamePasskey = async (p: any) => {
    const result = await showAlert({
      header: 'Editar nombre',
      inputs: [{ name: 'name', type: 'text', value: p?.name || '', placeholder: 'Nombre del dispositivo' }],
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Guardar', role: 'confirm' }],
    });
    const name = String(result.values?.name || '').trim();
    if (result.role !== 'confirm' || !name) return;
    try {
      await renamePasskey(p.credentialID, name);
      showToast('Nombre actualizado.', 'success');
      loadPasskeys();
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo actualizar.', 'danger');
    }
  };

  const onDeletePasskey = async (p: any) => {
    const result = await showAlert({
      header: 'Eliminar passkey',
      message: `¿Eliminar “${p?.name || 'Mi passkey'}”?`,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive' }],
    });
    if (result.role !== 'destructive') return;
    try {
      await deletePasskeys(p.credentialID);
      showToast('Passkey eliminada.', 'success');
      loadPasskeys();
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo eliminar.', 'danger');
    }
  };

  const onDeleteAccount = async () => {
    if (isDeletingAccount) return;
    const requiresPassword = me?.passwordConfigured !== false && !me?.providers?.google;
    const result = await showAlert({
      header: 'Eliminar cuenta',
      message: requiresPassword
        ? 'Esta acción es permanente. Escribe ELIMINAR y tu contraseña actual para continuar.'
        : me?.providers?.google
          ? 'Esta acción es permanente. Se desvinculará Google y se eliminará tu cuenta de la plataforma. Escribe ELIMINAR para continuar.'
          : 'Esta acción es permanente. Escribe ELIMINAR para continuar.',
      inputs: [
        { name: 'confirmText', type: 'text', placeholder: 'Escribe ELIMINAR' },
        ...(requiresPassword ? [{ name: 'currentPassword', type: 'password' as const, placeholder: 'Contraseña actual' }] : []),
      ],
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'confirm' }],
    });
    if (result.role !== 'confirm') return;
    const confirmText = String(result.values?.confirmText || '').trim().toUpperCase();
    const currentPassword = String(result.values?.currentPassword || '').trim();
    if (confirmText !== 'ELIMINAR') return showToast('Debes escribir ELIMINAR para confirmar.', 'warning');
    if (requiresPassword && !currentPassword) return showToast('Escribe tu contraseña actual.', 'warning');
    setDeletingAccount(true);
    const dismiss = showLoading('Eliminando cuenta...');
    try {
      const resp: any = await deleteAccount(requiresPassword ? currentPassword : undefined);
      showToast(resp?.message || 'Cuenta eliminada correctamente.', 'success');
      storage.logout();
      router.replace('/log-in');
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo eliminar la cuenta.', 'danger');
    } finally {
      dismiss();
      setDeletingAccount(false);
    }
  };

  const onSetupTotp = async () => {
    const dismiss = showLoading('Generando configuración…');
    try {
      const resp: any = await beginTotpSetup();
      setTotpModal({ kind: 'setup', qr: String(resp?.qrDataUrl || ''), secret: String(resp?.secret || '') });
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo iniciar la configuración', 'danger');
    } finally {
      dismiss();
    }
  };

  const onResetTotpStart = async () => {
    let pwd = '';
    if (totpConfigured) {
      const result = await showAlert({
        header: 'Confirmar contraseña',
        inputs: [{ name: 'pwd', type: 'password', placeholder: 'Contraseña actual' }],
        buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Continuar', role: 'confirm' }],
      });
      if (result.role !== 'confirm') return;
      pwd = String(result.values?.pwd || '');
    }
    const dismiss = showLoading('Preparando reinicio…');
    try {
      const resp: any = await resetTotpStart(pwd || undefined);
      setTotpModal({ kind: 'reset', qr: String(resp?.qrDataUrl || ''), secret: String(resp?.secret || '') });
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo iniciar el reinicio', 'danger');
    } finally {
      dismiss();
    }
  };

  const showBackupCodes = async (codes: string[]) => {
    if (!codes.length) return;
    const list = codes.join('\n');
    await showAlert({
      header: 'Códigos de respaldo',
      message: `Cópialos y guárdalos:\n\n${list}`,
      selectable: true,
      buttons: [
        {
          text: 'Copiar todos',
          handler: () => {
            Clipboard.setStringAsync(list)
              .then(() => showToast('Códigos copiados al portapapeles', 'success'))
              .catch(() => showToast('No se pudo copiar automáticamente', 'danger'));
            return false;
          },
        },
        { text: 'Entendido', role: 'cancel' },
      ],
    });
  };

  const onTotpVerified = (resp: any, kind: 'setup' | 'reset') => {
    showToast(kind === 'setup' ? 'Google Authenticator activado' : resp?.message || 'Google Authenticator reiniciado', 'success');
    setTotpConfigured(true);
    setMfaEnabled(true);
    setMfaMethod('totp');
    setTotpModal(null);
    showBackupCodes(Array.isArray(resp?.backupCodes) ? resp.backupCodes : []);
    reloadAll(false);
  };

  const onToggleMfa = async (enabled: boolean) => {
    setMfaEnabled(enabled);
    if (enabled && mfaMethod === 'totp' && !totpConfigured) return onSetupTotp();
    try {
      const resp: any = await updateMfa(enabled, mfaMethod);
      if (resp?.mfa?.totpConfigured) setTotpConfigured(true);
      showToast(enabled ? 'MFA activado' : 'MFA desactivado', 'success');
    } catch (err: any) {
      setMfaEnabled(!enabled);
      showToast(err?.error?.message || 'No se pudo actualizar MFA', 'danger');
    }
  };

  const onChangeMfaMethod = async (value: 'email' | 'totp') => {
    setMfaMethod(value);
    if (!mfaEnabled) return;
    if (value === 'totp' && !totpConfigured) return onSetupTotp();
    try {
      const resp: any = await updateMfa(true, value);
      if (resp?.mfa?.totpConfigured) setTotpConfigured(true);
      showToast('Método MFA actualizado', 'success');
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo actualizar MFA', 'danger');
    }
  };

  const onSaveSecurityQuestions = async () => {
    if (!questions.question1 || !questions.answer1.trim()) return;
    setSavingQuestions(true);
    try {
      await updateRecoveryQuestions([{ questionId: questions.question1, answer: questions.answer1 }]);
      showToast('Preguntas de seguridad guardadas con éxito.', 'success');
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al guardar las preguntas.', 'danger');
    } finally {
      setSavingQuestions(false);
    }
  };

  // ---- Ubicaciones ----
  const ubicacionValid = !!ubicacionForm.calle.trim() && !!ubicacionForm.numero.trim() && !!ubicacionForm.codigo_postal.trim() && !!ubicacionForm.alias.trim();

  const onEditUbicacion = (u?: any) => {
    setEditingUbicacion(true);
    setUbicacionForm(u ? {
      id: u._id, calle: u.calle || '', numero: String(u.numero ?? ''), codigo_postal: String(u.codigo_postal ?? ''), alias: u.alias || '', descripcion: u.descripcion || '',
    } : EMPTY_UBICACION);
  };

  const onSaveUbicacion = async () => {
    if (!ubicacionValid) return;
    const { id, ...data } = ubicacionForm;
    try {
      if (id) await updateUbicacion(id, data);
      else await addUbicacion(data);
      showToast(id ? 'Ubicación actualizada' : 'Ubicación agregada', 'success');
      setEditingUbicacion(false);
      reloadAll();
    } catch (err: any) {
      showToast(err?.error?.msg || err?.error?.message || 'Error al guardar', 'danger');
    }
  };

  const onDeleteUbicacion = async (id: string) => {
    const result = await showAlert({
      header: 'Eliminar Ubicación',
      message: '¿Estás seguro de que deseas eliminar esta dirección?',
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'confirm' }],
    });
    if (result.role !== 'confirm') return;
    try {
      await deleteUbicacion(id);
      showToast('Ubicación eliminada', 'success');
      reloadAll();
    } catch {
      showToast('Error al eliminar', 'danger');
    }
  };

  // ---- Categorías ----
  const onEditCategoria = (cat: any) => {
    setEditingCategoria(true);
    setCategoriaForm({ nombre: cat.nombre, descripcion: cat.descripcion || '', nombreOriginal: cat.nombre });
  };

  const onSaveCategoria = async () => {
    const { nombre, descripcion, nombreOriginal } = categoriaForm;
    if (!nombre) return;
    try {
      await updateCategoria(nombreOriginal, { nombre, descripcion });
      showToast(`Categoría "${nombre}" actualizada globalmente.`, 'success');
      setEditingCategoria(false);
      reloadAll();
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al actualizar categoría', 'danger');
    }
  };

  const onDeleteCategoria = async (nombre: string) => {
    const result = await showAlert({
      header: 'Eliminar Categoría',
      message: `¿Estás seguro de eliminar la categoría "${nombre}"? Se quitará de todos los productos.`,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'confirm' }],
    });
    if (result.role !== 'confirm') return;
    try {
      await deleteCategoria(nombre);
      showToast('Categoría eliminada globalmente', 'success');
      reloadAll();
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al eliminar categoría', 'danger');
    }
  };

  const segments: { value: SegmentValue; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'seguridad', label: 'Seguridad' },
    userRole === 'cliente' ? { value: 'ubicaciones', label: 'Ubicaciones' } : { value: 'categorias', label: 'Categorías' },
  ];

  const sectionStyle = [styles.section, {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  }];
  const title = (text: string, style?: any) => <SectionTitle style={[{ color: colors.text, borderLeftColor: colors.primary }, style]}>{text}</SectionTitle>;
  const helper = (text: string, style?: any) => <Text style={[styles.helper, { color: mutedText }, style]}>{text}</Text>;
  const listItem = (key: string, children: ReactNode, extra?: any) => (
    <View key={key} style={[styles.listItem, { backgroundColor: itemBg, borderColor: itemBorder }, extra]}>{children}</View>
  );
  const iconBtn = (name: string, onPress: () => void, color: string = accent, label?: string) => (
    <Pressable onPress={onPress} hitSlop={6} style={styles.iconBtn} accessibilityLabel={label} accessibilityRole="button">
      <Icon name={name} size={20} color={color} />
    </Pressable>
  );
  const securityRow = (key: string, icon: string, body: ReactNode, action?: ReactNode, last?: boolean) => (
    <View key={key} style={[styles.securityRow, { borderBottomColor: rgba(colors.mediumRgb, 0.35), borderBottomWidth: last ? 0 : 1 }]}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Icon name={icon} size={24} color={colors.text} style={{ width: 28, marginTop: 2 }} />
        <View style={{ flex: 1, minWidth: 0 }}>{body}</View>
      </View>
      {action ? <View style={{ marginTop: 10, marginLeft: 40, alignItems: 'flex-start' }}>{action}</View> : null}
    </View>
  );
  const strong = (text: string) => <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{text}</Text>;
  const p = (text: ReactNode) => <Text style={{ color: mutedText, marginTop: 4, fontSize: 14 }}>{text}</Text>;

  return (
    <Screen title="Configuración" refreshing={refreshing} onRefresh={onRefresh} siteFooter>
      <View style={styles.container}>
        <Segment value={segment} options={segments} onChange={setSegment}
          style={[styles.mainSegment, { backgroundColor: colors.surface2 }]} />

        {segment === 'general' ? (
          <View style={sectionStyle}>
            {title('Información personal')}
            <Field label="Nombre" value={profile.nombre} onChangeText={v => setProfile(s => ({ ...s, nombre: v }))} />
            <Field label="Apellido" value={profile.apellido} onChangeText={v => setProfile(s => ({ ...s, apellido: v }))} />
            <Field label="Teléfono (opcional)" value={profile.telefono} onChangeText={v => setProfile(s => ({ ...s, telefono: v }))}
              keyboardType="phone-pad" placeholder="Solo se mostrará al personal en tus pedidos"
              error={!!profile.telefono && !PHONE_RE.test(profile.telefono) && 'Teléfono no válido.'} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Image source={profile.foto_perfil && /^https:\/\//i.test(profile.foto_perfil) ? { uri: profile.foto_perfil } : LOGO}
                style={[styles.avatar, { borderColor: colors.primary }]} accessibilityLabel="Vista previa de la foto de perfil" />
              <Field label="Foto de perfil (URL HTTPS)" value={profile.foto_perfil} onChangeText={v => setProfile(s => ({ ...s, foto_perfil: v.trim() }))}
                keyboardType="url" autoCapitalize="none" autoCorrect={false} placeholder="https://..." containerStyle={{ flex: 1 }}
                error={!!profile.foto_perfil && !/^https:\/\/.+/i.test(profile.foto_perfil) && 'Debe iniciar con https://'} />
            </View>
            {me?.providers?.googleInfo?.foto_perfil || me?.providers?.microsoftInfo?.foto_perfil ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                <Text style={{ color: mutedText }}>Usar foto de:</Text>
                {me?.providers?.googleInfo?.foto_perfil ? <Button size="small" fill="clear" onPress={() => applyProviderPhoto('google')}>Google</Button> : null}
                {me?.providers?.microsoftInfo?.foto_perfil ? <Button size="small" fill="clear" onPress={() => applyProviderPhoto('microsoft')}>Microsoft</Button> : null}
              </View>
            ) : null}
            <View style={{ alignItems: 'flex-start', marginBottom: 28, marginTop: 6 }}>
              <Button fill="outline" onPress={onSaveProfile} disabled={!profileValid || isSavingProfile} loading={isSavingProfile}>Guardar información</Button>
            </View>

            {title('Preferencias')}
            <View style={styles.prefRow}>
              <Text style={[styles.prefLabel, { color: colors.text }]}>Tema</Text>
              <Segment compact value={mode} onChange={m => setMode(m, true)} style={{ flex: 1 }}
                options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
            </View>
            <View style={styles.prefRow}>
              <Text style={[styles.prefLabel, { color: colors.text }]}>Idioma</Text>
              <Segment compact value={language} onChange={onLanguageChange} style={{ flex: 1 }}
                options={[{ value: 'es', label: 'ES' }, { value: 'en', label: 'EN' }]} />
            </View>

            <View style={[styles.sessionsHeading, { marginTop: 16 }]}>
              <View style={{ flex: 1 }}>
                {title('Sesiones activas', { marginBottom: 8 })}
                {helper('Revisa dónde está abierta tu cuenta y cierra accesos que no reconozcas.', { marginLeft: 16, marginTop: 0 })}
              </View>
              <Button fill="clear" size="small" iconOnly="refresh-outline" onPress={reloadSessionsOnly} accessibilityLabel="Actualizar sesiones" />
            </View>
            {sessions.length ? sessions.map((s, i) => listItem(s.sessionId || String(i), (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name={isMobileSession(s.userAgent) ? 'phone-portrait-outline' : 'desktop-outline'} size={28}
                  color={s.isCurrent ? colors.success : accent} style={{ marginRight: 12 }} />
                <View style={{ flex: 1, paddingVertical: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 5 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{getBrowserInfo(s.userAgent)}</Text>
                    {s.isCurrent ? (
                      <Badge color="success">
                        <Icon name="shield-checkmark-outline" size={12} color="#000" /> Esta sesión
                      </Badge>
                    ) : null}
                  </View>
                  <Text style={[styles.itemText, { color: mutedText }]}><Text style={styles.b}>Última actividad:</Text> {medium(s.lastUsedAt)}</Text>
                  {s.createdAt ? <Text style={[styles.itemText, { color: mutedText }]}><Text style={styles.b}>Inicio:</Text> {medium(s.createdAt)}</Text> : null}
                  <Text style={[styles.itemText, { color: mutedText }]}><Text style={styles.b}>Dirección IP:</Text> {s.ip || 'No disponible'}</Text>
                </View>
                {!s.isCurrent ? iconBtn('log-out-outline', () => onRevokeSession(s.sessionId), colors.danger, 'Cerrar esta sesión') : null}
              </View>
            ), s.isCurrent ? { borderColor: rgba(colors.successRgb, 0.45) } : null)) : (
              <Text style={[styles.empty, { color: mutedText }]}>No se encontraron sesiones activas.</Text>
            )}
            {otherSessionsCount > 0 ? (
              <Button expand fill="outline" color="danger" icon="log-out-outline" onPress={onRevokeOthers} style={{ marginTop: 12 }}>
                {`Cerrar las demás sesiones (${otherSessionsCount})`}
              </Button>
            ) : null}

            <View style={[styles.qrCard, { borderColor: rgba(colors.primaryRgb, 0.3), backgroundColor: rgba(colors.primaryRgb, 0.06) }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Icon name="qr-code-outline" size={32} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Iniciar sesión en tu celular</Text>
                  <Text style={{ color: mutedText, fontSize: 13.5, marginTop: 4 }}>Genera un QR temporal, escanéalo con la cámara del celular y abre el enlace.</Text>
                </View>
              </View>
              <Button fill="outline" size="small" expand onPress={onCreateQrLogin} disabled={isGeneratingQr} loading={isGeneratingQr} style={{ marginTop: 12 }}>
                Generar QR
              </Button>
            </View>
          </View>
        ) : null}

        {segment === 'seguridad' ? (
          <View style={sectionStyle}>
            <View style={[styles.securityPanel, { borderColor: rgba(colors.mediumRgb, 0.35) }]}>
              {securityRow('email', 'mail-outline', (
                <>
                  {strong('Correo electrónico')}
                  {p(me?.email)}
                  {me?.emailVerified ? <Badge color="success" style={{ marginTop: 4 }}>Verificado</Badge> : null}
                </>
              ))}
              {me?.providers?.microsoft ? securityRow('ms', 'logo-microsoft', (
                <>
                  {strong('Microsoft')}
                  {p(`Conectado como ${me?.providers?.microsoftInfo?.email || ''}`)}
                </>
              ), <Badge color="success">Conectado</Badge>) : null}
              {securityRow('pwd', 'lock-closed-outline', (
                <>
                  {strong('Contraseña')}
                  {p(me?.passwordConfigured === false ? 'No configurada' : 'Configurada')}
                </>
              ), <Button fill="outline" size="small" onPress={() => setPasswordModalOpen(true)}>{me?.passwordConfigured === false ? 'Configurar' : 'Cambiar'}</Button>)}
              {securityRow('passkeys', 'key-outline', (
                <>
                  {strong('Passkeys')}
                  {p(`${passkeys.length} configurada(s)`)}
                  {passkeys.map((pk, i) => (
                    <View key={pk.credentialID || i} style={[styles.passkey, { borderTopColor: rgba(colors.mediumRgb, 0.25) }, i === 0 && { marginTop: 10 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{pk.name || 'Mi passkey'}</Text>
                        <Text style={{ color: mutedText, fontSize: 12.5, marginTop: 4 }}>
                          Agregada: {mediumDate(pk.createdAt)}{pk.lastUsedAt ? ` · Último uso: ${short(pk.lastUsedAt)}` : ''}
                        </Text>
                      </View>
                      {iconBtn('pencil', () => onRenamePasskey(pk), accent, 'Editar nombre')}
                      {iconBtn('trash', () => onDeletePasskey(pk), colors.danger, 'Eliminar passkey')}
                    </View>
                  ))}
                </>
              ), <Button fill="outline" size="small" onPress={onCreatePasskey}>Añadir</Button>)}
              {features.socialLogin && !!environment.googleClientId && securityRow('google', 'logo-google', (
                <>
                  {strong('Google')}
                  {me?.providers?.google && me?.providers?.googleInfo ? (
                    <Text style={{ color: mutedText, marginTop: 4 }}>
                      Conectado: <Text style={{ fontWeight: '700' }}>{`${me.providers.googleInfo.nombre || ''} ${me.providers.googleInfo.apellido || ''}`}</Text>
                      {'\n'}<Text style={{ fontSize: 12.5 }}>{me.providers.googleInfo.email}</Text>
                    </Text>
                  ) : null}
                  {!me?.providers?.google ? p('Puedes vincular cualquier cuenta de Google (no necesita coincidir con tu correo actual). Ambos métodos entrarán a la misma cuenta.') : null}
                </>
              ), me?.providers?.google ? (
                <Button fill="outline" color="danger" size="small" onPress={onUnlinkGoogle} disabled={isUnlinkingGoogle} loading={isUnlinkingGoogle}>Desvincular</Button>
              ) : (
                <GoogleButton compact mode="link" label="Vincular Google" onCredential={onLinkGoogle} onError={onLinkGoogleError} disabled={isLinkingGoogle} />
              ))}
              {securityRow('delete', 'trash', (
                <>
                  {strong('Eliminar cuenta')}
                  {p('Se eliminarán tu cuenta y sus accesos sociales de esta plataforma.')}
                </>
              ), <Button fill="outline" color="danger" size="small" onPress={onDeleteAccount} disabled={isDeletingAccount} loading={isDeletingAccount}>Eliminar</Button>, true)}
            </View>

            {title('MFA')}
            <View style={[styles.prefRow, { justifyContent: 'space-between' }]}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>Activar MFA</Text>
              <Toggle value={mfaEnabled} onValueChange={onToggleMfa} />
            </View>
            <Select label="Método MFA" value={mfaMethod} onChange={onChangeMfaMethod}
              options={[{ value: 'email', label: 'Correo (OTP)' }, { value: 'totp', label: 'Google Authenticator' }]} />
            {helper(mfaMethod === 'email' ? 'Al iniciar sesión se pedirá un código OTP por email.' : 'Al iniciar sesión se pedirá el código de Google Authenticator.', { marginTop: 0 })}
            {mfaMethod === 'totp' && !totpConfigured ? <Button expand fill="outline" onPress={onSetupTotp}>Configurar Google Authenticator</Button> : null}
            {mfaMethod === 'totp' && totpConfigured ? <Button expand fill="outline" color="warning" onPress={onResetTotpStart}>Reiniciar Google Authenticator</Button> : null}

            {title('Preguntas de Seguridad', { marginTop: 24 })}
            <Select label="Pregunta 1" value={questions.question1} placeholder="Selecciona una pregunta"
              onChange={v => setQuestions(q => ({ ...q, question1: v }))}
              options={[
                { value: 'mascota', label: '¿Cuál es el nombre de tu primera mascota?' },
                { value: 'ciudad', label: '¿En qué ciudad naciste?' },
                { value: 'madre', label: '¿Cuál es el segundo nombre de tu madre?' },
              ]} />
            <Field label="Respuesta 1" value={questions.answer1} onChangeText={v => setQuestions(q => ({ ...q, answer1: v }))} placeholder="Tu respuesta secreta" />
            <Button expand onPress={onSaveSecurityQuestions} loading={isSavingQuestions} style={{ marginTop: 12 }}
              disabled={!questions.question1 || !questions.answer1.trim() || isSavingQuestions}>
              Guardar Preguntas
            </Button>
          </View>
        ) : null}

        {segment === 'ubicaciones' ? (
          <View style={sectionStyle}>
            <View style={styles.headerRow}>
              {title('Mis Ubicaciones', { marginBottom: 0 })}
              <Button size="small" fill="clear" icon="add" onPress={() => onEditUbicacion()}>Agregar</Button>
            </View>
            {isEditingUbicacion ? (
              <View style={[styles.editCard, { backgroundColor: itemBg, borderColor: rgba(colors.primaryRgb, isDark ? 0.3 : 0.2) }]}>
                <Field label="Alias (Ej: Casa, Oficina)" value={ubicacionForm.alias} onChangeText={v => setUbicacionForm(f => ({ ...f, alias: v }))} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Field label="Calle" value={ubicacionForm.calle} onChangeText={v => setUbicacionForm(f => ({ ...f, calle: v }))} containerStyle={{ flex: 2 }} />
                  <Field label="N°" value={ubicacionForm.numero} onChangeText={v => setUbicacionForm(f => ({ ...f, numero: v }))} containerStyle={{ flex: 1 }} />
                </View>
                <Field label="Código Postal" value={ubicacionForm.codigo_postal} keyboardType="number-pad" onChangeText={v => setUbicacionForm(f => ({ ...f, codigo_postal: v }))} />
                <Field label="Descripción (Opcional)" value={ubicacionForm.descripcion} multiline onChangeText={v => setUbicacionForm(f => ({ ...f, descripcion: v }))} />
                <View style={styles.formActions}>
                  <Button fill="clear" color="medium" onPress={() => setEditingUbicacion(false)}>Cancelar</Button>
                  <Button onPress={onSaveUbicacion} disabled={!ubicacionValid}>Guardar</Button>
                </View>
              </View>
            ) : null}
            {ubicaciones.map(u => listItem(u._id, (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="pin" size={24} color={accent} style={{ marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{u.alias}</Text>
                  <Text style={[styles.itemText, { color: mutedText }]}>{u.calle} #{u.numero}, CP {u.codigo_postal}</Text>
                </View>
                {iconBtn('pencil', () => onEditUbicacion(u))}
                {iconBtn('trash', () => onDeleteUbicacion(u._id), colors.danger)}
              </View>
            )))}
            {ubicaciones.length === 0 ? <Text style={[styles.empty, { color: mutedText }]}>No tienes ubicaciones guardadas.</Text> : null}
          </View>
        ) : null}

        {segment === 'categorias' ? (
          <View style={sectionStyle}>
            {title('Gestión de Categorías')}
            {isEditingCategoria ? (
              <View style={[styles.editCard, { backgroundColor: itemBg, borderColor: rgba(colors.primaryRgb, isDark ? 0.3 : 0.2) }]}>
                <Field label="Nombre de la Categoría" value={categoriaForm.nombre} editable={false} />
                <Field label="Descripción" value={categoriaForm.descripcion} multiline onChangeText={v => setCategoriaForm(f => ({ ...f, descripcion: v }))} />
                <View style={styles.formActions}>
                  <Button fill="clear" color="medium" onPress={() => setEditingCategoria(false)}>Cancelar</Button>
                  <Button onPress={onSaveCategoria} disabled={!categoriaForm.nombre}>Guardar</Button>
                </View>
              </View>
            ) : null}
            {categorias.map((cat, i) => listItem(cat.nombre || String(i), (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name={cat.icono || 'bookmark-outline'} size={24} color={accent} style={{ marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{cat.nombre}</Text>
                  <Text style={[styles.itemText, { color: mutedText }]}>{cat.descripcion || 'Sin descripción'}</Text>
                  <Badge color={cat.activa !== false ? 'success' : 'medium'} style={{ marginTop: 4 }}>{cat.activa !== false ? 'Activa' : 'Inactiva'}</Badge>
                </View>
                {iconBtn('pencil', () => onEditCategoria(cat))}
                {iconBtn('trash', () => onDeleteCategoria(cat.nombre), colors.danger)}
              </View>
            )))}
          </View>
        ) : null}
      </View>

      <SheetModal open={qr.open} onClose={() => setQr({ dataUrl: '', expiresAt: null, open: false })}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Iniciar sesión en otro dispositivo</Text>
          <Text style={{ color: mutedText, textAlign: 'center', marginTop: 8 }}>Escanea este código con la cámara de tu celular. El enlace vence en un minuto.</Text>
          {qr.dataUrl ? <Image source={{ uri: qr.dataUrl }} style={styles.qrImage} accessibilityLabel="Código QR temporal para iniciar sesión" /> : null}
          {qr.expiresAt ? <Text style={{ color: mutedText, marginBottom: 12 }}>Válido hasta {shortTime(qr.expiresAt)}</Text> : null}
          <Button expand fill="outline" onPress={onCreateQrLogin} loading={isGeneratingQr}>Generar otro código</Button>
          <Button expand fill="clear" color="medium" onPress={() => setQr({ dataUrl: '', expiresAt: null, open: false })}>Cerrar</Button>
        </View>
      </SheetModal>

      <TotpModal state={totpModal} onClose={() => setTotpModal(null)} onVerified={onTotpVerified} />

      <PasswordModal open={passwordModalOpen} passwordConfigured={me?.passwordConfigured !== false} onClose={() => setPasswordModalOpen(false)}
        onChanged={() => { setPasswordModalOpen(false); storage.logout(); router.replace('/log-in'); }} />
    </Screen>
  );
}

// ion-modal a pantalla completa con ion-content ion-padding.
function SheetModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <ScrollView contentContainerStyle={{ padding: 16, maxWidth: 420, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TotpModal({ state, onClose, onVerified }: {
  state: { kind: 'setup' | 'reset'; qr: string; secret: string } | null;
  onClose: () => void;
  onVerified: (resp: any, kind: 'setup' | 'reset') => void;
}) {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) { setPrevState(state); if (state) setCode(''); }

  const verify = async () => {
    if (!state || busy) return;
    const token = code.replace(/\D/g, '');
    if (token.length !== 6 && token.length !== 8) return showToast('El código debe tener 6 u 8 dígitos.', 'warning');
    setBusy(true);
    try {
      const resp = state.kind === 'setup' ? await verifyTotpSetup(token) : await resetTotpVerify(token);
      onVerified(resp, state.kind);
    } catch (err: any) {
      showToast(err?.error?.message || 'No se pudo verificar', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetModal open={!!state} onClose={() => !busy && onClose()}>
      <SectionTitle style={{ color: colors.text, borderLeftColor: colors.primary }}>
        {state?.kind === 'reset' ? 'Reiniciar Google Authenticator' : 'Google Authenticator'}
      </SectionTitle>
      <Text style={[styles.helper, { color: colors.muted }]}>
        {state?.kind === 'reset'
          ? 'Confirma tu identidad y escanea el nuevo QR. Luego escribe el código de 6 dígitos.'
          : 'Escanea este QR en Google Authenticator y escribe el código de 6 dígitos.'}
      </Text>
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        {state?.qr ? <Image source={{ uri: state.qr }} style={{ width: 220, height: 220, backgroundColor: '#fff' }} /> : null}
      </View>
      <Pressable onLongPress={() => state?.secret && Clipboard.setStringAsync(state.secret).then(() => showToast('Clave copiada', 'success'))}>
        <Field label="Clave (por si no puedes escanear)" value={state?.secret || ''} editable={false} selectTextOnFocus />
      </Pressable>
      <Field label="Código" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} placeholder="123456" />
      <Button expand onPress={verify} loading={busy} disabled={busy || code.length < 6} style={{ marginTop: 16 }}>Verificar</Button>
      <Button expand fill="clear" color="medium" onPress={onClose} disabled={busy}>Cancelar</Button>
    </SheetModal>
  );
}

function PasswordModal({ open, passwordConfigured, onClose, onChanged }: { open: boolean; passwordConfigured: boolean; onClose: () => void; onChanged: () => void }) {
  const { colors } = useTheme();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) { setPrevOpen(open); if (open) setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
  const rules = passwordRulesOf(form.newPassword, form.confirmPassword);
  const valid = (!passwordConfigured || !!form.currentPassword) && rules.ok;

  const submit = async () => {
    if (!valid) return showToast('Completa todos los campos', 'warning');
    const dismiss = showLoading('Actualizando...');
    try {
      const resp: any = await changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      showToast(resp?.message || 'Contraseña actualizada', 'success');
      onChanged();
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al cambiar contraseña', 'danger');
    } finally {
      dismiss();
    }
  };

  const eye = (k: keyof typeof show) => ({ endIcon: show[k] ? 'eye-off-outline' : 'eye-outline', onEndIconPress: () => setShow(s => ({ ...s, [k]: !s[k] })) });

  return (
    <SheetModal open={open} onClose={onClose}>
      <SectionTitle style={{ color: colors.text, borderLeftColor: colors.primary }}>
        {passwordConfigured ? 'Cambiar contraseña' : 'Configurar contraseña'}
      </SectionTitle>
      {passwordConfigured ? (
        <Field label="Contraseña actual" value={form.currentPassword} onChangeText={v => setForm(f => ({ ...f, currentPassword: v }))}
          secureTextEntry={!show.current} autoCapitalize="none" autoCorrect={false} {...eye('current')} />
      ) : null}
      <Field label="Nueva contraseña" value={form.newPassword} onChangeText={v => setForm(f => ({ ...f, newPassword: v }))}
        secureTextEntry={!show.next} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" {...eye('next')} />
      <PasswordRules password={form.newPassword} />
      <Field label="Confirmar nueva contraseña" value={form.confirmPassword} onChangeText={v => setForm(f => ({ ...f, confirmPassword: v }))}
        secureTextEntry={!show.confirm} autoCapitalize="none" autoCorrect={false} {...eye('confirm')}
        error={!!form.confirmPassword && !rules.match && 'Las contraseñas no coinciden.'} />
      <Button expand onPress={submit} disabled={!valid} style={{ marginTop: 16 }}>Actualizar Contraseña</Button>
      <Button expand fill="clear" color="medium" onPress={onClose}>Cancelar</Button>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 800, alignSelf: 'center' },
  mainSegment: { marginBottom: 20, borderRadius: 12, padding: 4 },
  section: {
    borderRadius: 16, paddingVertical: 20, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, marginBottom: 10 },
  prefLabel: { fontSize: 16, fontWeight: '500', width: 70 },
  helper: { fontSize: 13.5, marginTop: -5, marginBottom: 15 },
  sessionsHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  listItem: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemText: { fontSize: 13.5, marginTop: 3 },
  b: { fontWeight: '700' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', padding: 30, fontStyle: 'italic' },
  qrCard: { marginTop: 18, padding: 16, borderWidth: 1, borderRadius: 14 },
  securityPanel: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 24 },
  securityRow: { paddingVertical: 14, paddingHorizontal: 12 },
  passkey: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, borderTopWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  editCard: { padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 15 },
  modalTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  qrImage: { width: 300, height: 300, maxWidth: '100%', borderRadius: 16, marginTop: 20, marginBottom: 10, backgroundColor: '#fff' },
});
