import { Store } from '../services/events';

// API imperativa equivalente a ToastController, AlertController y LoadingController de Ionic.

export type Color = 'primary' | 'success' | 'warning' | 'danger' | 'medium' | 'secondary' | 'light';

export type ToastOptions = {
  message: string;
  header?: string;
  color?: Color;
  duration?: number;
  position?: 'top' | 'bottom';
  icon?: string;
  buttons?: { text?: string; icon?: string; role?: 'cancel'; handler?: () => void }[];
};

export type AlertInput = { name: string; type?: 'text' | 'password'; placeholder?: string; value?: string };
export type AlertButton = {
  text: string;
  role?: 'cancel' | 'destructive' | 'confirm';
  // Devolver false mantiene la alerta abierta (igual que en Ionic).
  handler?: (values: Record<string, string>) => void | boolean | Promise<void | boolean>;
};
export type AlertOptions = { header?: string; message?: string; inputs?: AlertInput[]; buttons: (AlertButton | string)[]; selectable?: boolean };
export type AlertResult = { role?: string; values: Record<string, string> };

export type ToastEntry = ToastOptions & { id: number };
export type AlertEntry = AlertOptions & { id: number; resolve: (r: AlertResult) => void };

export const toasts = new Store<ToastEntry[]>([]);
export const alerts = new Store<AlertEntry[]>([]);
export const loadings = new Store<{ id: number; message: string }[]>([]);
let seq = 0;

export function showToast(message: string, color: Color = 'primary', duration = 2500, extra: Partial<ToastOptions> = {}) {
  const id = ++seq;
  toasts.set([...toasts.value, { id, message, color, duration, position: 'bottom', ...extra }]);
  return id;
}

export function presentToast(opts: ToastOptions) {
  const id = ++seq;
  toasts.set([...toasts.value, { duration: 2500, position: 'bottom', ...opts, id }]);
  return id;
}

export function dismissToast(id: number) {
  toasts.set(toasts.value.filter(t => t.id !== id));
}

// Devuelve una promesa con el rol del botón pulsado y los valores de los campos (como onDidDismiss()).
export function showAlert(opts: AlertOptions): Promise<AlertResult> {
  return new Promise(resolve => {
    const id = ++seq;
    alerts.set([...alerts.value, { ...opts, id, resolve }]);
  });
}

export function closeAlert(id: number) {
  alerts.set(alerts.value.filter(a => a.id !== id));
}

export function showLoading(message = 'Cargando...') {
  const id = ++seq;
  loadings.set([...loadings.value, { id, message }]);
  return () => loadings.set(loadings.value.filter(l => l.id !== id));
}
