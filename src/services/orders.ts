import { api } from './api';
import { Store } from './events';
import { ws } from './websocket';

// Equivalente a OrderService.
const normalizeOrder = (p: any) => ({
  id: String(p?._id ?? p?.id ?? ''),
  estado: p?.estado,
  total: p?.total,
  createdAt: p?.createdAt,
  metodo_pago: p?.metodo_pago,
  tipo_entrega: p?.tipo_entrega || 'domicilio',
  User: p?.userId ? { nombre: p.userId.nombre, apellido: p.userId.apellido, email: p.userId.email, telefono: p.userId.telefono } : undefined,
  Ubicacion: p?.ubicacion ? { ...p.ubicacion } : undefined,
  DetallePedidos: Array.isArray(p?.items)
    ? p.items.map((it: any) => ({ Producto: { nombre: it?.nombre, imagen: it?.imagen }, cantidad: it?.cantidad, precio_unitario: it?.precio_unitario }))
    : [],
});

export const pendingOrders = new Store<any[]>([]);

ws.onNuevosPedidos((data: any) => {
  const direccion = String(data?.direccion || '');
  const pedido = {
    id: data.pedidoId,
    total: data.total,
    createdAt: data.hora,
    Ubicacion: {
      calle: direccion.split(' #')[0],
      numero: direccion.split('#')[1]?.split(',')[0],
      alias: direccion.split(', ')[1],
    },
    DetallePedidos: (data.productos || []).map((prod: any) => ({ Producto: { nombre: prod.nombre }, cantidad: prod.cantidad })),
  };
  pendingOrders.set([pedido, ...pendingOrders.value]);
});

export const crearPedido = (pedido: any) => api.post('/pedidos', pedido);

export async function fetchPendingOrders() {
  const res = await api.get('/pedidos');
  const data = (Array.isArray(res?.data) ? res.data : []).map(normalizeOrder);
  pendingOrders.set(data.filter((p: any) => ['pendiente', 'pagado', 'en_camino'].includes(p.estado)));
  return { ...res, data };
}

export async function getPedidoById(id: string) {
  const res = await api.get(`/pedidos/${id}`);
  return { ...res, data: normalizeOrder(res?.data || {}) };
}
