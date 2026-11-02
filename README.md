# Farmacia JP II — Expo (SDK 58)

Réplica en React Native/Expo de la app Ionic Angular [SFJPII](https://github.com/Juancv45F/SFJPII).

## Ejecutar

```bash
npm install --legacy-peer-deps
npx expo start        # escanear el QR con Expo Go
```

## Inicio de sesión social

**Google en la PWA (web)**: botón oficial de Google Identity Services, sin redirect.
- Google Cloud Console → cliente OAuth web → *Orígenes de JavaScript autorizados*: `https://sfjpii-pwa.vercel.app` (y `http://localhost:8081` para desarrollo).

**Google en la app nativa** (redirect HTTPS obligatorio):
1. Publicar `auth-bridge/native-callback.html` en Firebase Hosting como `https://farmacia-juan-pablo-ii.web.app/auth/native-callback.html`.
2. Mismo cliente OAuth → *URIs de redireccionamiento autorizados*: agregar esa URL.

**Microsoft** (Entra → Registros de aplicaciones → Autenticación):
- PWA: plataforma *Aplicación de página única (SPA)* → `https://sfjpii-pwa.vercel.app/auth/microsoft/callback` (y `http://localhost:8081/auth/microsoft/callback` para desarrollo).
- App nativa: plataforma *Aplicaciones móviles y de escritorio* → `sfjpii://auth`, o la URI que se imprime en consola en Expo Go (`exp://<IP>:8081/--/auth`).

Variables opcionales: ver `.env.example`.

## Limitaciones en Expo Go

- Passkeys (WebAuthn) y notificaciones push requieren development build (`npx expo run:android` o `eas build --profile development`); en Expo Go se muestra un aviso.
