import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { environment } from '../config/env';

WebBrowser.maybeCompleteAuthSession();

// Ruta de la app que recibe el regreso del navegador (src/app/auth.tsx).
// Solo en nativo: en web el botón de Google Identity Services entrega la credencial.
export const appReturnUrl = () => Linking.createURL('auth');

function randomString() {
  return Array.from(Crypto.getRandomBytes(16), b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(value: string) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeJwt(token: string): any {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

function paramsFrom(url: string) {
  const out: Record<string, string> = {};
  const raw = [url.split('?')[1]?.split('#')[0], url.split('#')[1]].filter(Boolean).join('&');
  raw.split('&').forEach(pair => {
    const [k, v = ''] = pair.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return out;
}

/**
 * Obtiene el ID token de Google (la "credential" que espera POST /auth/google).
 * Google solo permite redirecciones HTTPS para el cliente web, así que se usa una
 * página puente (auth-bridge/native-callback.html) que devuelve el token a la app.
 */
export async function promptGoogleCredential(mode: 'login' | 'link' = 'login'): Promise<string> {
  if (!environment.googleClientId) throw new Error('Google no disponible');
  const nonce = randomString();
  const returnUrl = appReturnUrl();
  const state = toBase64Url(JSON.stringify({ r: returnUrl, n: randomString() }));
  const query = [
    ['client_id', environment.googleClientId],
    ['redirect_uri', environment.googleRedirectUri],
    ['response_type', 'id_token'],
    ['scope', 'openid email profile'],
    ['nonce', nonce],
    ['state', state],
    ['prompt', 'select_account'],
  ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const result = await WebBrowser.openAuthSessionAsync(`https://accounts.google.com/o/oauth2/v2/auth?${query}`, returnUrl);
  if (result.type !== 'success') throw new Error('Se canceló el selector de cuentas de Google');
  const params = paramsFrom(result.url);
  if (params.error) throw new Error(params.error_description || params.error);
  if (params.state !== state) throw new Error('No se obtuvo la credencial de Google');
  const credential = params.id_token || '';
  if (!credential || decodeJwt(credential)?.nonce !== nonce) throw new Error('No se obtuvo la credencial de Google');
  void mode;
  return credential;
}

let microsoftDiscovery: AuthSession.DiscoveryDocument | null = null;

/**
 * Redirect URI de Microsoft. Web: <origen>/auth/microsoft/callback (plataforma "Aplicación de página única" en Entra).
 * Nativo: EXPO_PUBLIC_MICROSOFT_REDIRECT_URI o sfjpii://auth / exp://... (plataforma "Móvil y escritorio").
 */
export function microsoftRedirectUri() {
  if (Platform.OS === 'web') return `${window.location.origin}/auth/microsoft/callback`;
  return process.env.EXPO_PUBLIC_MICROSOFT_REDIRECT_URI || AuthSession.makeRedirectUri({ scheme: 'sfjpii', path: 'auth' });
}

/** Inicia sesión con Microsoft (código + PKCE) y devuelve el ID token para POST /auth/microsoft. */
export async function promptMicrosoftIdToken(): Promise<string> {
  const clientId = environment.microsoftClientId;
  if (!clientId) throw new Error('Microsoft todavía no está configurado.');
  if (!microsoftDiscovery) {
    microsoftDiscovery = await AuthSession.fetchDiscoveryAsync('https://login.microsoftonline.com/common/v2.0');
  }
  const redirectUri = microsoftRedirectUri();
  if (__DEV__) console.log('[AUTH] Redirect URI de Microsoft (regístrala en Entra):', redirectUri);
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    prompt: AuthSession.Prompt.SelectAccount,
    usePKCE: true,
  });
  const result = await request.promptAsync(microsoftDiscovery);
  if (result.type !== 'success') {
    if (result.type === 'error') throw new Error(result.error?.message || 'No se pudo iniciar sesión con Microsoft');
    throw new Error('Inicio de sesión cancelado');
  }
  const tokens = await AuthSession.exchangeCodeAsync({
    clientId,
    code: result.params.code,
    redirectUri,
    extraParams: { code_verifier: request.codeVerifier || '' },
  }, microsoftDiscovery);
  if (!tokens.idToken) throw new Error('Microsoft no devolvió un ID token');
  return tokens.idToken;
}
