import { router } from 'expo-router';
import { environment } from '../config/env';
import { storage } from './storage';

// Misma forma que HttpErrorResponse de Angular: err.status y err.error?.message.
export class ApiError extends Error {
  constructor(public status: number, public error: any) {
    super(error?.message || `Error ${status}`);
  }
}

type RequestOptions = {
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
  timeout?: number;
};

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/verify', '/auth/mfa/verify', '/auth/refresh', '/auth/recovery/'];
let refreshInFlight: Promise<boolean> | null = null;

function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = path.startsWith('http') ? path : `${environment.apiUrl}${path}`;
  const qs = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

async function rawRequest(method: string, path: string, opts: RequestOptions = {}) {
  const token = storage.get<string>('token');
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers || {}) };
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-token'] = token;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? 30000);
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.params), {
      method,
      headers,
      body: opts.body === undefined ? undefined : isForm ? opts.body : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new ApiError(0, { message: e?.name === 'AbortError' ? 'La solicitud tardó demasiado.' : 'Sin conexión con el servidor.' });
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = storage.get('refreshToken');
  if (!refreshToken) return false;
  const resp = await rawRequest('POST', '/auth/refresh', { body: { refreshToken } });
  if (resp?.token) storage.set('token', resp.token);
  if (resp?.refreshToken) storage.set('refreshToken', resp.refreshToken);
  return !!resp?.token;
}

function expireSession() {
  storage.logout();
  try { router.replace('/log-in'); } catch { /* el router aún no está montado */ }
}

// Equivalente a auth.interceptor.ts: agrega el token y renueva la sesión ante un 401.
export async function request<T = any>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest(method, path, opts);
  } catch (err: any) {
    const isAuthEndpoint = AUTH_ENDPOINTS.some(e => path.includes(e));
    if (!(err instanceof ApiError) || err.status !== 401 || isAuthEndpoint) throw err;
    if (!storage.get('refreshToken')) {
      expireSession();
      throw err;
    }
    if (!refreshInFlight) refreshInFlight = refreshTokens().finally(() => { refreshInFlight = null; });
    let ok = false;
    try {
      ok = await refreshInFlight;
    } catch (refreshError: any) {
      if (refreshError?.status === 0) throw refreshError;
    }
    if (!ok) {
      expireSession();
      throw err;
    }
    return rawRequest(method, path, opts);
  }
}

export const api = {
  get: <T = any>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T = any>(path: string, body?: any, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body: body ?? {} }),
  put: <T = any>(path: string, body?: any, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body: body ?? {} }),
  patch: <T = any>(path: string, body?: any, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body: body ?? {} }),
  delete: <T = any>(path: string, body?: any, opts?: RequestOptions) => request<T>('DELETE', path, { ...opts, body }),
};

export function errorMessage(err: any, fallback: string) {
  return err?.error?.message || err?.error?.msg || fallback;
}
