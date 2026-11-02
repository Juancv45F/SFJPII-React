import { api } from './api';

export type EstadoEncargo = 'pendiente' | 'disponible' | 'en_camino' | 'entregado' | 'cancelado';
export interface Encargo {
  _id: string;
  estado: EstadoEncargo;
  tipo_entrega: 'recoger' | 'domicilio';
  userId: { nombre: string; apellido: string; email: string } | null;
  items: { productoId: string; nombre: string; imagen?: string; cantidad: number; precio_unitario: number }[];
  total_estimado: number;
  ubicacion?: { calle: string; numero: string; codigo_postal: string; alias: string; descripcion?: string };
  motivo_cancelacion?: string;
  cancelable_hasta?: string;
  fecha_estimada_llegada?: string;
  disponibleAt?: string;
  createdAt: string;
  historial: { estado: EstadoEncargo; fecha: string }[];
}

export const ESTADOS_ENCARGO: Record<EstadoEncargo, string> = {
  pendiente: 'Esperando medicamento', disponible: 'Ya llegó', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado',
};

export const encargoService = {
  listar: () => api.get<{ data: Encargo[] }>('/encargos'),
  detalle: (id: string) => api.get<{ data: Encargo }>(`/encargos/${id}`),
  crear: (payload: any) => api.post<{ data: Encargo }>('/encargos', payload),
  actualizar: (id: string, estado: EstadoEncargo, motivo_cancelacion?: string) =>
    api.patch<{ data: Encargo }>(`/encargos/${id}/estado`, { estado, motivo_cancelacion }),
};
