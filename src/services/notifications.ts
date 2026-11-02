import { presentToast } from '../ui/overlays';
import { api } from './api';
import { offline, restored } from './connectivity';
import { Store } from './events';
import { sessionChanged, storage } from './storage';
import { ws } from './websocket';

// Equivalente a NotificationsService (notificaciones del cliente).
class NotificationsService {
  readonly items = new Store<any[]>([]);
  readonly error = new Store('');
  private owner = '';

  get unread() { return this.items.value.filter(n => !n.leida).length; }

  init() {
    sessionChanged.subscribe(() => this.session());
    ws.connected.subscribe(() => this.refresh());
    restored.subscribe(() => this.refresh());
    ws.onNotificaciones(n => {
      if (String(n.userId) !== this.owner) return;
      const fresh = !this.items.value.some(x => x._id === n._id);
      const previous = this.items.value.find(x => x._id === n._id);
      this.save([{ ...n, leida: n.leida || previous?.leida }, ...this.items.value.filter(x => x._id !== n._id)]);
      if (fresh && !n.leida) presentToast({ header: n.titulo, message: n.mensaje, duration: 5000, position: 'top' });
    });
    ws.onNotificacionEliminada(event => {
      if (String(event.userId) !== this.owner) return;
      this.save(this.items.value.filter(item => item._id !== event._id));
    });
    ws.onNotificacionesEliminadas(event => {
      if (String(event.userId) !== this.owner) return;
      this.save([]);
    });
    this.session();
  }

  private session() {
    const u = storage.get('user');
    const owner = storage.get('token') ? String(u?.id || u?._id || '') : '';
    if (owner === this.owner) return;
    this.owner = owner;
    this.items.set(owner ? storage.get(`notifications_${owner}`) || [] : []);
    this.error.set('');
    setTimeout(() => this.refresh(), 0);
  }

  private save(items: any[]) {
    this.items.set([...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    if (this.owner) storage.set(`notifications_${this.owner}`, this.items.value);
  }

  async refresh() {
    const owner = this.owner;
    if (!owner || offline.value) return;
    try {
      const res = await api.get('/notificaciones');
      if (owner !== this.owner) return;
      const current = new Map(this.items.value.map(n => [n._id, n]));
      this.save((res?.data || []).map((n: any) => ({ ...n, leida: n.leida || current.get(n._id)?.leida })));
      this.error.set('');
    } catch {
      if (owner === this.owner) this.error.set('No se pudieron actualizar las notificaciones. Puedes reintentar.');
    }
  }

  async read(n: any) {
    const owner = this.owner;
    if (offline.value) return;
    try {
      const res = await api.patch(`/notificaciones/${n._id}/leida`, {});
      if (owner === this.owner) this.save(this.items.value.map(x => (x._id === n._id ? res.data : x)));
    } catch {
      if (owner === this.owner) this.error.set('No se pudo marcar como leída. Inténtalo de nuevo.');
    }
  }

  async remove(n: any) {
    const owner = this.owner;
    if (!owner || offline.value) { this.error.set('Necesitas conexión para eliminar una notificación.'); return; }
    try {
      await api.delete(`/notificaciones/${n._id}`);
      if (owner !== this.owner) return;
      this.save(this.items.value.filter(item => item._id !== n._id));
      this.error.set('');
    } catch {
      if (owner === this.owner) this.error.set('No se pudo eliminar la notificación. Inténtalo de nuevo.');
    }
  }

  async removeAll() {
    const owner = this.owner;
    if (!owner || offline.value) { this.error.set('Necesitas conexión para eliminar las notificaciones.'); return; }
    try {
      await api.delete('/notificaciones');
      if (owner !== this.owner) return;
      this.save([]);
      this.error.set('');
    } catch {
      if (owner === this.owner) this.error.set('No se pudieron eliminar las notificaciones. Inténtalo de nuevo.');
    }
  }
}

export const notifications = new NotificationsService();
