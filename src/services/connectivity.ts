import NetInfo from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';
import { Emitter, Store } from './events';

// Equivalente a ConnectivityService (eventos online/offline del navegador).
export const offline = new Store(false);
export const restored = new Emitter<void>();

NetInfo.addEventListener(state => {
  const isOffline = state.isConnected === false || state.isInternetReachable === false;
  if (isOffline === offline.value) return;
  offline.set(isOffline);
  if (!isOffline) restored.emit();
});

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(cb => store.subscribe(() => cb()), () => store.value, () => store.value);
}

export function useOffline() {
  return useStore(offline);
}
