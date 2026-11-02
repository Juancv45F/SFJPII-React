import { useSyncExternalStore } from 'react';
import { api } from './api';
import { offline, restored } from './connectivity';
import { Store } from './events';
import { sessionChanged, storage } from './storage';

export type CartMode = 'compra' | 'encargo';
export interface CartItem { producto: any; cantidad: number; modo?: CartMode; }

type Job = { owner: string; items: any[]; revision: number };

// Equivalente a CartService: carrito local por usuario sincronizado con /carrito/sync.
class CartService {
  readonly conflicts = new Store<any[]>([]);
  readonly pending = new Store(false);
  readonly syncError = new Store('');
  readonly list = new Store<CartItem[]>([]);
  private items: CartItem[] = [];
  private owner = '';
  private revision = 0;
  private syncing = false;
  private guestTransferred = false;
  private queue: Promise<void> = Promise.resolve();

  init() {
    this.owner = this.userId();
    const saved: CartItem[] = storage.get(this.key()) || [];
    this.items = saved.map(it => ({
      ...it,
      modo: it.modo || 'compra',
      producto: { ...it.producto, id: String(it.producto?.id || it.producto?._id || '') },
    }));
    this.publish();
    this.pending.set(!!storage.get('cart_dirty_' + this.owner));
    restored.subscribe(() => this.retryPending());
    sessionChanged.subscribe(() => this.onSessionChanged());
    setInterval(() => this.retryPending(), 30000);
  }

  private onSessionChanged() {
    const nextOwner = this.userId();
    if (nextOwner === this.owner) return;
    const guest = this.owner ? [] : this.items;
    this.owner = nextOwner;
    this.revision++;
    this.items = storage.get(this.key()) || guest;
    if (nextOwner && guest.length) {
      const merged = new Map(this.items.map(i => [i.producto.id, i]));
      for (const item of guest) merged.set(item.producto.id, item);
      this.items = [...merged.values()];
      this.guestTransferred = true;
      storage.set('cart_dirty_' + nextOwner, true);
      storage.set(this.key(), this.items);
    }
    this.conflicts.set([]);
    this.syncError.set('');
    this.pending.set(!!storage.get('cart_dirty_' + this.owner));
    this.publish();
  }

  private userId() {
    const u = storage.get('user');
    return String(u?.id || u?._id || '');
  }
  private key() { return this.owner ? `cart_${this.owner}` : 'cart_guest'; }
  private payload() { return this.items.map(it => ({ id: String(it.producto.id), cantidad: it.cantidad, modo: it.modo || 'compra' })); }
  private publish() { this.list.set([...this.items]); }

  private save(sync = true) {
    storage.set(this.key(), this.items);
    this.publish();
    if (sync && storage.get('token')) {
      storage.set(`cart_dirty_${this.owner}`, true);
      this.pending.set(true);
      const job = { owner: this.owner, items: this.payload(), revision: ++this.revision };
      // Serializar escrituras evita que una solicitud lenta restaure un carrito anterior.
      this.queue = this.queue.then(() => this.runJob(job));
    }
  }

  private async runJob(job: Job) {
    if (!job.owner || job.owner !== this.userId() || job.revision !== this.revision || offline.value) return;
    this.syncing = true;
    try {
      const res = await api.post('/carrito/sync', { items: job.items }, { timeout: 15000 });
      if (job.owner !== this.userId() || job.revision !== this.revision) return;
      storage.remove(`cart_dirty_${job.owner}`);
      this.pending.set(false);
      this.conflicts.set([]);
      if (this.guestTransferred) { storage.remove('cart_guest'); this.guestTransferred = false; }
      this.items = (res?.data || []).map((it: any) => ({ producto: { ...it, id: String(it.id) }, cantidad: it.cantidad, modo: it.modo || 'compra' }));
      this.save(false);
      this.syncError.set('');
    } catch (err: any) {
      if (job.owner === this.userId() && job.revision === this.revision) {
        this.conflicts.set(err?.error?.conflicts || []);
        this.syncError.set(err?.error?.message || 'No se pudo sincronizar el carrito. Tus cambios siguen en este dispositivo.');
      }
    } finally {
      this.syncing = false;
    }
  }

  retryPending() {
    if (!this.syncing && storage.get('token') && this.owner === this.userId() && storage.get('cart_dirty_' + this.owner) && !offline.value && !this.conflicts.value.length) this.retrySync();
  }

  retrySync() { this.save(); }

  resolveConflict(conflict: any, action: 'encargo' | 'compra' | 'ajustar' | 'eliminar') {
    const item = this.items.find(i => i.producto.id === conflict.id);
    if (!item) return;
    if (action === 'eliminar') this.items = this.items.filter(i => i !== item);
    else {
      item.producto.stock = conflict.stock;
      item.producto.solo_encargo = conflict.solo_encargo;
      if (action === 'encargo' && conflict.puedeEncargar) item.modo = 'encargo';
      else if (action === 'compra' && conflict.stock > 0 && !conflict.solo_encargo) { item.modo = 'compra'; item.cantidad = Math.min(item.cantidad, conflict.stock); }
      else if (action === 'ajustar' && conflict.stock > 0) item.cantidad = conflict.stock;
      else return;
    }
    this.conflicts.set(this.conflicts.value.filter(c => c.id !== conflict.id));
    this.save();
  }

  getCartItems(modo: CartMode = 'compra') { return this.items.filter(it => (it.modo || 'compra') === modo); }

  addProduct(product: any, modo: CartMode = 'compra'): boolean {
    if (modo === 'encargo' && Number(product.stock) !== 0) return false;
    if (modo === 'compra' && product.solo_encargo) return false;
    const id = String(product.id || product._id);
    const existing = this.items.find(it => it.producto.id === id);
    if (existing && (existing.modo || 'compra') !== modo) return false;
    const limit = modo === 'encargo' ? 999 : Math.min(999, Number(product.stock || 0));
    if ((existing?.cantidad || 0) >= limit) return false;
    if (existing) existing.cantidad++;
    else this.items.push({ producto: { ...product, id }, cantidad: 1, modo });
    this.save();
    return true;
  }

  async moveProduct(product: any, modo: CartMode): Promise<boolean> {
    const item = this.items.find(it => it.producto.id === String(product.id || product._id));
    if (!item) return false;
    if (!offline.value) {
      const res = await api.get(`/productos/${item.producto.id}/stock`);
      const stock = Number(res?.data?.stock ?? res?.stock ?? 0);
      item.producto.stock = stock;
      item.producto.solo_encargo = !!(res?.data?.solo_encargo ?? res?.solo_encargo);
      if ((modo === 'compra' && (stock < item.cantidad || item.producto.solo_encargo)) || (modo === 'encargo' && stock !== 0)) { this.save(false); return false; }
    }
    if ((modo === 'encargo' && Number(item.producto.stock) !== 0) || (modo === 'compra' && (item.producto.solo_encargo || item.producto.stock < item.cantidad))) return false;
    item.modo = modo;
    this.save();
    return true;
  }

  decreaseProduct(product: any) {
    const it = this.items.find(i => i.producto.id === product.id);
    if (!it) return;
    if (it.cantidad === 1) this.removeProduct(product);
    else { it.cantidad--; this.save(); }
  }

  removeProduct(product: any) {
    const id = String(product.id || product._id);
    this.items = this.items.filter(it => it.producto.id !== id);
    this.conflicts.set(this.conflicts.value.filter(c => c.id !== id));
    this.save();
  }

  clearCart(modo: CartMode = 'compra') {
    this.items = this.items.filter(it => (it.modo || 'compra') !== modo);
    this.save();
  }

  getTotalPrice(modo: CartMode = 'compra') {
    return this.getCartItems(modo).reduce((n, it) => n + it.cantidad * it.producto.precio * (1 - (it.producto.descuento || 0) / 100), 0);
  }

  async syncOnLogin() {
    const previousOwner = this.owner;
    const guest = previousOwner ? [] : this.items;
    this.owner = this.userId();
    const local: CartItem[] = previousOwner === this.owner ? this.items : (storage.get(this.key()) || guest);
    if (offline.value) { this.items = local; this.save(); return; }
    const loginOwner = this.owner;
    const loginRevision = this.revision;
    try {
      const res = await api.get('/carrito');
      if (loginOwner !== this.userId() || loginRevision !== this.revision) return;
      const merged = new Map<string, CartItem>();
      const serverItems = storage.get(`cart_dirty_${this.owner}`) ? [] : res?.data || [];
      for (const it of serverItems) merged.set(it.id, { producto: { ...it, id: String(it.id) }, cantidad: it.cantidad, modo: it.modo || 'compra' });
      for (const it of local) {
        const id = String(it.producto.id || it.producto._id);
        const server = merged.get(id);
        merged.set(id, { ...it, producto: server?.producto || it.producto });
      }
      this.items = [...merged.values()];
      storage.set(`cart_dirty_${this.owner}`, true);
      this.pending.set(true);
      this.save(false);
      this.save();
    } catch (err: any) {
      if (loginOwner === this.userId() && loginRevision === this.revision) {
        this.items = local.length && !this.items.length ? local : this.items;
        storage.set('cart_dirty_' + this.owner, true);
        this.pending.set(true);
        this.save(false);
        this.conflicts.set(err?.error?.conflicts || []);
        this.syncError.set(err?.error?.message || 'Carrito guardado en este dispositivo. Se sincronizará al recuperar conexión.');
      }
    }
  }
}

export const cart = new CartService();

export function useCartItems() {
  return useSyncExternalStore(cb => cart.list.subscribe(() => cb()), () => cart.list.value);
}
