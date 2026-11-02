// Valores desde .env (variables EXPO_PUBLIC_*). Ver .env.example.
// Expo solo sustituye accesos directos process.env.EXPO_PUBLIC_X, no desestructurados.
function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Falta la variable ${name} en .env`);
  return value;
}

export const environment = {
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL),
  recaptchaSiteKey: required('EXPO_PUBLIC_RECAPTCHA_SITE_KEY', process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY),
  // Dominio autorizado para la llave de reCAPTCHA; el WebView carga el widget como si viniera de aquí.
  recaptchaBaseUrl: required('EXPO_PUBLIC_RECAPTCHA_BASE_URL', process.env.EXPO_PUBLIC_RECAPTCHA_BASE_URL),
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  // Google no acepta redirecciones exp://; se usa una página HTTPS puente (ver README.md).
  googleRedirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || '',
  microsoftClientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '',
  privacyNoticeVersion: process.env.EXPO_PUBLIC_PRIVACY_NOTICE_VERSION || '2026-11-01',
};

export const socketOrigin = environment.apiUrl.replace(/\/api\/?$/, '');
