import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Emitter } from './events';

// Equivalente a StorageService (localStorage cifrado con CryptoJS).
// Los tokens van al llavero del sistema (SecureStore); el resto a AsyncStorage.
// Se mantiene una copia en memoria para leer de forma síncrona, como en Ionic.
const SECURE_KEYS = new Set(['token', 'refreshToken']);
const PREFIX = 'sfjpii:';
const cache = new Map<string, any>();
const secureAvailable = Platform.OS !== 'web';

export const sessionChanged = new Emitter<void>();

async function readSecure(key: string) {
  if (!secureAvailable) return AsyncStorage.getItem(PREFIX + key);
  return SecureStore.getItemAsync(key);
}

export const storage = {
  async hydrate() {
    const keys = (await AsyncStorage.getAllKeys()).filter(k => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [k, raw] of pairs) {
      if (raw == null) continue;
      try { cache.set(k.slice(PREFIX.length), JSON.parse(raw)); } catch { /* dato ilegible: se ignora */ }
    }
    for (const key of SECURE_KEYS) {
      try {
        const raw = await readSecure(key);
        if (raw) cache.set(key, JSON.parse(raw));
      } catch { /* sin acceso al llavero */ }
    }
  },

  get<T = any>(key: string): T | null {
    return cache.has(key) ? cache.get(key) : null;
  },

  set(key: string, value: any) {
    cache.set(key, value);
    const data = JSON.stringify(value);
    if (SECURE_KEYS.has(key) && secureAvailable) SecureStore.setItemAsync(key, data).catch(() => {});
    else AsyncStorage.setItem(PREFIX + key, data).catch(() => {});
    if (key === 'user' || key === 'token') sessionChanged.emit();
  },

  remove(key: string) {
    cache.delete(key);
    if (SECURE_KEYS.has(key) && secureAvailable) SecureStore.deleteItemAsync(key).catch(() => {});
    else AsyncStorage.removeItem(PREFIX + key).catch(() => {});
    if (key === 'user' || key === 'token') sessionChanged.emit();
  },

  // Borra solo la sesión; conserva carrito y tema.
  logout() {
    storage.remove('token');
    storage.remove('refreshToken');
    storage.remove('user');
    storage.remove('role');
  },
};

export function currentUser(): any {
  return storage.get('user');
}

export function currentRole(): string {
  const u = storage.get('user');
  return String(u?.rol || u?.role || 'cliente').trim().toLowerCase();
}

export function isAuthenticated() {
  return !!storage.get('token');
}
