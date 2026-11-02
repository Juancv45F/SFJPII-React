import { useSyncExternalStore } from 'react';
import { Store } from '../services/events';
import { sessionChanged, storage } from '../services/storage';

// Estado global de la interfaz: menús laterales y acordeón activo (MainMenuService).
export const mainMenuOpen = new Store(false);
export const cartMenuOpen = new Store(false);
export const activeAccordion = new Store<'first' | 'second' | 'third' | ''>('first');
export const chatbotOpen = new Store(false);

export function openAccountMenu() {
  if (!storage.get('token')) return;
  activeAccordion.set('second');
  mainMenuOpen.set(true);
}

export function useValue<T>(store: Store<T>): T {
  return useSyncExternalStore(cb => store.subscribe(() => cb()), () => store.value, () => store.value);
}

let sessionVersion = 0;
sessionChanged.subscribe(() => { sessionVersion++; });

// Usuario actual reactivo a cambios de sesión (login, logout, getMe).
export function useSession() {
  useSyncExternalStore(cb => sessionChanged.subscribe(() => cb()), () => sessionVersion, () => sessionVersion);
  const user = storage.get('user');
  const token = storage.get<string>('token');
  return {
    user,
    isAuthenticated: !!token,
    role: String(user?.rol || user?.role || 'cliente').trim().toLowerCase(),
    userName: user?.nombre || 'Usuario',
    userPhoto: String(user?.foto_perfil || ''),
  };
}
