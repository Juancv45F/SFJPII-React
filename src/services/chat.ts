import { api } from './api';

export type ChartUnit = 'MXN' | 'unidades' | 'pedidos' | 'productos' | 'encargos';
export interface ChatChart { tipo: string; titulo: string; labels: string[]; data: number[]; unidad?: ChartUnit; }
export interface AdminChatResponse { respuesta: string; tools_utilizadas: string[]; grafica: ChatChart | null; conversation_id?: string; }
export interface Conversation { conversation_id: string; titulo: string; updatedAt: string; }
export interface ConversationDetail { conversation_id: string; mensajes: { role: 'user' | 'assistant'; content: string; grafica?: ChatChart | null }[]; }

export const adminChat = {
  list: (offset = 0) => api.get<{ items: Conversation[]; has_more: boolean }>('/admin/conversations', { params: { offset }, timeout: 30000 }),
  conversation: (id: string) => api.get<ConversationDetail>(`/admin/conversations/${encodeURIComponent(id)}`, { timeout: 30000 }),
  deleteConversation: (id: string) => api.delete(`/admin/conversations/${encodeURIComponent(id)}`, undefined, { timeout: 30000 }),
  send: (mensaje: string, conversation_id: string | null = null) =>
    api.post<AdminChatResponse>('/admin/chat', { mensaje: mensaje.trim(), conversation_id }, { timeout: 125000 }),
};

export const clientChat = {
  send: (mensaje: string, conversationId: string | null = null) =>
    api.post<{ respuesta: string; conversation_id?: string }>('/cliente/chat', { mensaje: mensaje.trim(), conversation_id: conversationId }, { timeout: 125000 }),
};
