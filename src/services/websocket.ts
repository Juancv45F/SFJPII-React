import { io, Socket } from 'socket.io-client';
import { socketOrigin } from '../config/env';
import { offline, restored } from './connectivity';
import { Emitter } from './events';
import { sessionChanged, storage } from './storage';

// Equivalente a WebsocketService.
class WebsocketService {
  private socket: Socket;
  private token = '';
  readonly connected = new Emitter<void>();

  constructor() {
    this.socket = io(socketOrigin, {
      autoConnect: false,
      transports: ['websocket'],
      auth: cb => cb({ token: storage.get('token') || undefined }),
    });
    this.socket.on('connect', () => this.connected.emit());
    this.socket.on('disconnect', reason => {
      if (reason === 'io server disconnect') this.connected.emit();
    });
    sessionChanged.subscribe(() => this.connect());
    restored.subscribe(() => this.connect());
  }

  connect() {
    const token = storage.get<string>('token') || '';
    if (token !== this.token) {
      this.socket.disconnect();
      this.token = token;
    }
    if (!this.socket.connected && !offline.value) this.socket.connect();
  }

  listen<T = any>(event: string, handler: (data: T) => void) {
    this.socket.on(event, handler);
    return () => { this.socket.off(event, handler); };
  }

  onActualizacionesPedidos(h: (d: any) => void) { return this.listen('pedido_actualizado', h); }
  onNotificaciones(h: (d: any) => void) { return this.listen('notificacion_cliente', h); }
  onNotificacionEliminada(h: (d: any) => void) { return this.listen('notificacion_eliminada', h); }
  onNotificacionesEliminadas(h: (d: any) => void) { return this.listen('notificaciones_eliminadas', h); }
  onEncargos(h: (d: any) => void) { return this.listen('encargo_actualizado', h); }
  onNuevosPedidos(h: (d: any) => void) { return this.listen('nuevo_pedido_notificacion', h); }
  onStock(h: (d: any) => void) { return this.listen('stock_actualizado', h); }
  onProductos(h: (d: any) => void) {
    return this.listen('producto_actualizado', (data: any) => h({ ...data, id: data?.id ?? String(data?._id ?? '') }));
  }
}

export const ws = new WebsocketService();
