import { PRIVACY_VERSION } from '../content/legal';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { api } from './api';
import { isStaff } from '../config/roles';
import { cart } from './cart';
import { storage } from './storage';

// Equivalente a AuthService.

export function destinationFor(response: any): string {
  const role = String(response?.user?.rol || response?.user?.role || '').toLowerCase();
  if (response?.requiresLocation && role === 'cliente') return '/configuracion?segment=ubicaciones&requiredLocation=1';
  return isStaff(role) ? '/admin/inventario' : '/catalogo';
}

export async function storeAuthSession(response: any) {
  if (!response?.token) return;
  storage.set('token', response.token);
  if (response?.refreshToken) storage.set('refreshToken', response.refreshToken);
  storage.set('user', response.user);
  const role = String(response.user?.rol || response.user?.role || '').toLowerCase();
  if (role === 'cliente') {
    try { await cart.syncOnLogin(); } catch { /* continuar */ }
  }
  router.replace(destinationFor(response) as any);
}

// --- REGISTRO Y VERIFICACIÓN ---
export const register = (userData: any) => api.post('/auth/register', userData, { timeout: 30000 });
export const verifyCode = (email: string, code: string) => api.post('/auth/verify', { email, code });
export const resendVerifyCode = (email: string) => api.post('/auth/verify/resend', { email });

// --- LOGIN ---
export async function login(credentials: { email: string; password: string }) {
  const response = await api.post('/auth/login', credentials);
  if (response?.mfaRequired && response?.mfaToken) {
    router.push({
      pathname: '/verify-code',
      params: {
        mode: 'mfa',
        mfaToken: response.mfaToken,
        ...(response?.email ? { email: response.email } : {}),
        ...(response?.mfaMethod ? { mfaMethod: response.mfaMethod } : {}),
      },
    });
    return response;
  }
  await storeAuthSession(response);
  return response;
}

export async function googleLogin(credential: string, privacyAccepted = false) {
  const response = await api.post('/auth/google', { credential, privacyAccepted, privacyNoticeVersion: PRIVACY_VERSION });
  await storeAuthSession(response);
  return response;
}

export async function microsoftLoginWithToken(idToken: string, privacyAccepted = false) {
  const response = await api.post('/auth/microsoft', { idToken, privacyAccepted, privacyNoticeVersion: PRIVACY_VERSION });
  await storeAuthSession(response);
  return response;
}

export async function verifyMfa(mfaToken: string, otp: string, method?: 'totp' | 'email' | 'backup') {
  const response = await api.post('/auth/mfa/verify', { mfaToken, otp, method });
  await storeAuthSession(response);
  return response;
}

export const resendMfaOtp = (mfaToken: string, method?: 'email') => api.post('/auth/mfa/resend', { mfaToken, method });

// --- MFA / TOTP ---
export const beginTotpSetup = () => api.post('/user/mfa/totp/setup', {});
export const verifyTotpSetup = (code: string) => api.post('/user/mfa/totp/verify', { code });
export const resetTotpStart = (currentPassword?: string) => api.post('/user/mfa/totp/reset/start', currentPassword ? { currentPassword } : {});
export const resetTotpVerify = (code: string) => api.post('/user/mfa/totp/reset/verify', { code });
export const updateMfa = (enabled: boolean, channel?: string) => api.put('/user/mfa', { enabled, channel });

// --- PERFIL ---
export async function getMe() {
  const response = await api.get('/user/me', { params: { ts: Date.now() } });
  if (response?.user) storage.set('user', { ...(storage.get('user') || {}), ...response.user });
  return response;
}

export async function updateProfile(data: { nombre: string; apellido: string; telefono?: string; foto_perfil?: string }) {
  const response = await api.put('/user/profile', data);
  if (response?.user) storage.set('user', { ...(storage.get('user') || {}), ...response.user });
  return response;
}

export const changePassword = (currentPassword: string, newPassword: string, confirmPassword?: string) =>
  api.put('/user/password', { currentPassword, newPassword, confirmPassword });

export const getPreferences = () => api.get('/user/preferences');
export const updatePreferences = (prefs: { theme?: string; language?: string }) => api.put('/user/preferences', prefs);

// --- GOOGLE (vincular) ---
export async function linkGoogle(credential: string, currentPassword?: string) {
  const resp = await api.post('/auth/google/link', currentPassword ? { credential, currentPassword } : { credential });
  const user = storage.get('user') || {};
  storage.set('user', { ...user, providers: { ...(user?.providers || {}), google: true, googleInfo: resp?.google || null } });
  return resp;
}

export async function unlinkGoogle(currentPassword?: string) {
  const resp = await api.post('/auth/google/unlink', currentPassword ? { currentPassword } : {});
  const user = storage.get('user') || {};
  storage.set('user', { ...user, providers: { ...(user?.providers || {}), google: false, googleInfo: null } });
  return resp;
}

// --- SSO / QR ---
export const generateSsoToken = () => api.get('/auth/sso/token');
export async function validateSsoToken(ssoToken: string) {
  const response = await api.post('/auth/sso/validate', { ssoToken });
  await storeAuthSession(response);
  return response;
}

// --- PASSKEYS (gestión) ---
export const listPasskeys = () => api.get('/auth/webauthn/credentials');
export const deletePasskeys = (credentialID?: string) => api.delete('/auth/webauthn/credentials', { credentialID });
export const renamePasskey = (credentialID: string, name: string) => api.patch('/auth/webauthn/credentials', { credentialID, name });

// --- RECUPERACIÓN ---
export const requestRecovery = (email: string, method: 'email' | 'sms' | 'call') => api.post('/auth/recovery/request', { email, method });
export const verifyRecovery = (email: string, token: string, answers: any[] = []) => api.post('/auth/recovery/verify', { email, token, answers });
export const resetPasswordWithToken = (email: string, resetToken: string, newPassword: string) =>
  api.post('/auth/recovery/reset', { email, resetToken, newPassword });
export const updateRecoveryQuestions = (questions: { questionId: string; answer: string }[]) => api.put('/user/recovery/questions', { questions });

// --- SESIONES ---
export function listSessions() {
  const refreshToken = storage.get<string>('refreshToken');
  return api.get('/user/sessions', {
    params: { ts: Date.now() },
    headers: refreshToken ? { 'x-refresh-token': refreshToken } : undefined,
  });
}
export const revokeSession = (sessionId: string) => api.post('/user/sessions/revoke', { sessionId });
export const revokeOtherSessions = () => api.post('/user/sessions/revoke-others', { refreshToken: storage.get('refreshToken') });

export const deleteAccount = (currentPassword?: string) => api.delete('/user/account', currentPassword ? { currentPassword } : {});

// --- PEDIDOS ---
export const getOrders = () => api.get('/pedidos');
export const updateOrderStatus = (orderId: string, estado: string) => api.patch(`/pedidos/${orderId}/estado`, { estado });

// --- UBICACIONES ---
export const getUbicaciones = () => api.get('/ubicaciones');
export const addUbicacion = (u: any) => api.post('/ubicaciones', u);
export const updateUbicacion = (id: string, u: any) => api.put(`/ubicaciones/${id}`, u);
export const deleteUbicacion = (id: string) => api.delete(`/ubicaciones/${id}`);

// --- CATEGORÍAS ---
export const getCategoriasAdmin = () => api.get('/productos/categorias');
export const updateCategoria = (nombreAntiguo: string, data: { nombre: string; descripcion: string }) =>
  api.put(`/productos/categorias/${encodeURIComponent(nombreAntiguo)}`, data);
export const deleteCategoria = (nombre: string) => api.delete(`/productos/categorias/${encodeURIComponent(nombre)}`);

// --- PUSH ---
export async function syncPushToken() {
  const pushToken = storage.get('pushToken');
  if (!pushToken) return;
  try { await api.put('/user/push-token', { token: pushToken, platform: Platform.OS }); } catch { /* opcional */ }
}

// CERRAR SESIÓN
export async function logout() {
  const refreshToken = storage.get('refreshToken');
  api.post('/auth/logout', { refreshToken }).catch(() => {});
  storage.logout();
  router.replace('/catalogo');
}
