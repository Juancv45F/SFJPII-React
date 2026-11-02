import { api } from './api';
import { offline } from './connectivity';
import { Store } from './events';
import { storage } from './storage';

// Equivalente a ProductService.
const cache = new Map<string, { data: any; exp: number }>();
const TTL = 30000;

export const searchTerm = new Store('');
export const catalogCached = new Store(false);

const normalize = (res: any) => ({
  ...res,
  data: Array.isArray(res?.data) ? res.data.map((p: any) => ({ ...p, id: p?.id ?? String(p?._id ?? '') })) : [],
});

function offlineData(key: string): any {
  catalogCached.set(true);
  return storage.get('catalog_cache_' + key) || { ok: true, data: [], cached: true };
}

function remember(key: string, res: any) {
  storage.set('catalog_cache_' + key, res);
  catalogCached.set(false);
}

export function clearProductCache() {
  cache.clear();
}

export async function getAllProducts(porEncargo = false): Promise<any> {
  const suffix = porEncargo ? '?encargos=true' : '';
  const key = `GET:/productos${suffix}`;
  if (offline.value) return offlineData(key);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;
  try {
    const res = normalize(await api.get(`/productos${suffix}`));
    remember(key, res);
    cache.set(key, { data: res, exp: Date.now() + TTL });
    return res;
  } catch (err: any) {
    if (err?.status === 0) return offlineData(key);
    throw err;
  }
}

export async function searchProducts(query = '', categoriaId = '', precioMin = '', precioMax = ''): Promise<any> {
  // El catálogo persistido permite filtrar sin conexión.
  const localSearch = () => {
    const res = offlineData('GET:/productos');
    return {
      ...res,
      data: res.data.filter((p: any) => !p.solo_encargo &&
        String(p.nombre + ' ' + (p.descripcion || '')).toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
        (!categoriaId || String(p.categoria?._id || p.categoriaId) === categoriaId || p.categoria?.nombre === categoriaId) &&
        (!precioMin || p.precio >= Number(precioMin)) && (!precioMax || p.precio <= Number(precioMax))),
    };
  };
  if (offline.value) return localSearch();
  const params = { q: query, categoriaId, precioMin, precioMax };
  const key = `GET:/productos/buscar?${JSON.stringify(params)}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;
  try {
    const res = normalize(await api.get('/productos/buscar', { params }));
    if (!query && !categoriaId && !precioMin && !precioMax) remember('GET:/productos', res);
    cache.set(key, { data: res, exp: Date.now() + TTL });
    return res;
  } catch (err: any) {
    if (err?.status === 0) return localSearch();
    throw err;
  }
}

export function updateStock(productId: string, stock: number) {
  clearProductCache();
  return api.put(`/productos/${productId}/stock`, { stock });
}

export function postProducto(data: FormData) {
  clearProductCache();
  return api.post('/productos', data, { timeout: 60000 });
}

export function putProducto(id: string, data: FormData) {
  clearProductCache();
  return api.put(`/productos/${id}`, data, { timeout: 60000 });
}

export function deleteProducto(id: string) {
  clearProductCache();
  return api.delete(`/productos/${id}`);
}

export function getStock(id: string) {
  return api.get(`/productos/${id}/stock`);
}

export async function getCategorias(): Promise<any> {
  if (offline.value) return offlineData('categorias');
  try {
    const res = await api.get('/productos/categorias');
    remember('categorias', res);
    return res;
  } catch (err: any) {
    if (err?.status === 0) return offlineData('categorias');
    throw err;
  }
}
