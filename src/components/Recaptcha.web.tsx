import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { environment } from '../config/env';
import { useTheme } from '../theme/ThemeProvider';
import type { RecaptchaHandle } from './Recaptcha';

declare global {
  interface Window { grecaptcha?: any; __recaptchaReady?: Promise<void> }
}

function loadRecaptcha() {
  if (!window.__recaptchaReady) {
    window.__recaptchaReady = new Promise(resolve => {
      (window as any).__onRecaptchaLoad = () => resolve();
      const s = document.createElement('script');
      s.src = 'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit&hl=es';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return window.__recaptchaReady;
}

// En web el widget se renderiza directo en el DOM (igual que ng-recaptcha).
export const Recaptcha = forwardRef<RecaptchaHandle, { onResolved: (token: string) => void }>(({ onResolved }, ref) => {
  const { isDark } = useTheme();
  const container = useRef<HTMLElement | null>(null);
  const widget = useRef<number | null>(null);
  const callback = useRef(onResolved);
  useEffect(() => { callback.current = onResolved; }, [onResolved]);
  useImperativeHandle(ref, () => ({
    reset: () => { if (widget.current !== null) window.grecaptcha?.reset(widget.current); },
  }));
  useEffect(() => {
    let cancelled = false;
    const host = document.createElement('div');
    container.current?.appendChild(host);
    loadRecaptcha().then(() => {
      if (cancelled) return;
      widget.current = window.grecaptcha.render(host, {
        sitekey: environment.recaptchaSiteKey,
        theme: isDark ? 'dark' : 'light',
        callback: (t: string) => callback.current(t),
        'expired-callback': () => callback.current(''),
        'error-callback': () => callback.current(''),
      });
    });
    return () => { cancelled = true; host.remove(); widget.current = null; };
  }, [isDark]);
  return <View ref={container as any} style={{ alignItems: 'center', minHeight: 78, width: '100%' }} />;
});
Recaptcha.displayName = 'Recaptcha';
