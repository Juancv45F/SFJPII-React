import { useCallback, useEffect, useRef, useState } from 'react';
import { restored } from '../services/connectivity';
import { clearProductCache, getAllProducts, getCategorias, searchProducts, searchTerm } from '../services/products';
import { ws } from '../services/websocket';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export type Category = { id: string; name: string };

// Carga, filtros y tiempo real compartidos por el catálogo (clientes) y el inventario (personal).
export function useCatalog() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([{ id: '', name: 'Todos' }]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showOnlyDiscounts, setShowOnlyDiscounts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const filters = useRef({ term: searchTerm.value, category: '', offers: false });

  const loadCategories = useCallback(async (list: any[]) => {
    try {
      const res: any = await getCategorias();
      const nameToId: Record<string, string> = {};
      for (const p of list) if (p?.categoria?._id && p?.categoria?.nombre) nameToId[p.categoria.nombre] = String(p.categoria._id);
      setCategories([{ id: '', name: 'Todos' }, ...(res?.data || []).map((c: any) => {
        const nombre = typeof c === 'string' ? c : c.nombre || 'Sin nombre';
        const id = typeof c === 'object' && c._id ? String(c._id) : nameToId[nombre] || nombre;
        return { id, name: nombre };
      })]);
    } catch { /* sin categorías */ }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getAllProducts();
      const list = res?.data || [];
      setProducts(list);
      loadCategories(list);
    } catch { /* se conserva la lista */ }
    setLoading(false);
  }, [loadCategories]);

  const applyFilters = useCallback(async () => {
    const { term, category, offers } = filters.current;
    setLoading(true);
    const isObjectId = OBJECT_ID.test(category);
    try {
      const res: any = await searchProducts(term, isObjectId ? category : '');
      let data: any[] = res?.data || [];
      if (category) {
        data = data.filter(p => isObjectId
          ? String(p.categoriaId || p.categoria?._id || '') === category
          : String(p.categoria?.nombre || '').trim().toLowerCase() === category.trim().toLowerCase());
      }
      if (offers) data = data.filter(p => p.descuento > 0);
      setProducts(data);
    } catch {
      setProducts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    if (searchTerm.value) applyFilters(); else loadProducts();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const offSearch = searchTerm.subscribe(term => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (term === filters.current.term) return;
        filters.current.term = term;
        applyFilters();
      }, 300);
    });
    const offRestored = restored.subscribe(() => { clearProductCache(); loadProducts(); });
    const offStock = ws.onStock((data: any) => {
      setProducts(list => list.map(p => (String(p.id) === String(data.productoId) ? { ...p, stock: data.nuevoStock } : p)));
    });
    const offProductos = ws.onProductos((upd: any) => {
      setProducts(list => {
        const i = list.findIndex(p => String(p.id) === String(upd.id));
        if (i === -1) { loadProducts(); return list; }
        const next = [...list];
        next[i] = { ...next[i], ...upd };
        return next;
      });
    });
    return () => { clearTimeout(timer); offSearch(); offRestored(); offStock(); offProductos(); };
  }, [applyFilters, loadProducts]);

  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    filters.current.category = id;
    applyFilters();
  };

  const toggleOffers = () => {
    const next = !showOnlyDiscounts;
    setShowOnlyDiscounts(next);
    filters.current.offers = next;
    applyFilters();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    clearProductCache();
    await (filters.current.term || filters.current.category || filters.current.offers ? applyFilters() : loadProducts());
    setRefreshing(false);
  };

  return {
    products, setProducts, isLoading, categories, selectedCategory, showOnlyDiscounts, refreshing,
    loadProducts, selectCategory, toggleOffers, onRefresh,
  };
}
