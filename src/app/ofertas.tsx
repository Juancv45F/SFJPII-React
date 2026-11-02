import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AddProductCard, CategoryChips, GridCell, ProductCard, ProductGrid } from '../components/ProductCard';
import { ProductForm } from '../components/ProductForm';
import { Screen } from '../components/Screen';
import { Button, Icon, Spinner } from '../components/ui';
import { cart } from '../services/cart';
import { restored } from '../services/connectivity';
import { clearProductCache, deleteProducto, getAllProducts } from '../services/products';
import { useSession } from '../state/app';
import { rgba } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { showAlert, showToast } from '../ui/overlays';

// Port de OfertasPage (ruta /ofertas, "Por encargo").
export default function OfertasPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { role, isAuthenticated } = useSession();
  const isClient = !isAuthenticated || role === 'cliente';
  const canEdit = ['admin', 'editor', 'super_admin'].includes(role);
  const canDelete = ['admin', 'super_admin'].includes(role);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showOnlyDiscounts, setShowOnlyDiscounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ open: boolean; producto?: any }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res: any = await getAllProducts(true);
      setProducts(res?.data || []);
    } catch {
      setError('No pudimos cargar los medicamentos.');
    }
    setLoading(false);
  }, []);

  // ionViewWillEnter
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => restored.subscribe(() => { clearProductCache(); load(); }), [load]);

  const categories = useMemo(
    () => [...new Set(products.map(p => String(p.categoria?.nombre || 'Sin categoría')))].map(c => ({ id: c, name: c })),
    [products],
  );
  const filtered = useMemo(() => products.filter(p =>
    (!category || (p.categoria?.nombre || 'Sin categoría') === category)
    && (!showOnlyDiscounts || p.descuento > 0)
    && `${p.nombre} ${p.descripcion || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [products, category, showOnlyDiscounts, search]);

  const remove = async (p: any) => {
    const r = await showAlert({
      header: 'Eliminar producto por encargo',
      message: 'Dejará de aparecer en el catálogo. Los encargos ya realizados conservarán su historial.',
      buttons: [{ text: 'Conservar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive' }],
    });
    if (r.role !== 'destructive') return;
    try {
      await deleteProducto(p.id);
      load();
    } catch (err: any) {
      setError(err?.error?.message || 'No se pudo eliminar el producto.');
    }
  };

  const add = (p: any) => {
    const added = cart.addProduct(p, 'encargo');
    showToast(added ? 'Agregado a Encargos. Abre el carrito para confirmar.' : 'Este medicamento ya está en Comprar ahora o alcanzó el límite. Revísalo en el carrito.', added ? 'success' : 'warning', 3500);
  };

  const accent = colors.primary;

  return (
    <Screen title="Por encargo" contentStyle={{ paddingHorizontal: 0 }} siteFooter>
      <View style={{ paddingHorizontal: 8 }}>
        <Text style={[styles.eyebrow, { color: accent }]}>TUS MEDICAMENTOS, A TU TIEMPO</Text>
        <Text style={[styles.h1, { color: colors.text }]}>Medicamentos por encargo</Text>
        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
          Medicamentos sin stock y exclusivos por encargo. Recoge en farmacia o recibe en una dirección guardada.
        </Text>
        <Button fill="outline" expand style={{ marginTop: 16 }} onPress={() => router.push(isClient ? '/encargos' : '/admin/encargos')}>
          {isClient ? 'Mis encargos' : 'Gestionar encargos'}
        </Button>
        <Text style={[styles.notice, { color: colors.text, backgroundColor: rgba(colors.primaryRgb, 0.08) }]}>
          Los precios son estimados. La farmacia confirmará la llegada; el encargo no realiza un cobro.
        </Text>
        <View style={[styles.searchbar, { backgroundColor: colors.surface }]}>
          <Icon name="search-outline" size={20} color={colors.medium} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Buscar medicamento" accessibilityLabel="Buscar medicamento"
            placeholderTextColor={colors.medium} style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 }} />
          {search ? <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Limpiar"><Icon name="close-circle" size={20} color={colors.medium} /></Pressable> : null}
        </View>
      </View>

      <CategoryChips categories={[{ id: '', name: 'Todos' }, ...categories]} selected={category} onSelect={setCategory}
        offers={showOnlyDiscounts} onToggleOffers={() => setShowOnlyDiscounts(v => !v)} />

      <View style={{ paddingTop: 16 }}>
        {loading ? (
          <View style={styles.empty}><Spinner size="large" color={accent} /><Text style={{ color: colors.text, marginTop: 12 }}>Cargando medicamentos…</Text></View>
        ) : null}
        {error ? (
          <View style={styles.empty} accessibilityRole="alert">
            <Text style={{ color: colors.text, marginBottom: 12 }}>{error}</Text>
            <Button onPress={load}>Reintentar</Button>
          </View>
        ) : null}
        {!loading && !error && !filtered.length ? (
          <View style={styles.empty}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>No encontramos medicamentos</Text>
            <Text style={{ color: colors.text, marginTop: 8 }}>Prueba otro nombre o categoría.</Text>
          </View>
        ) : null}
        {!loading && !error ? (
          <ProductGrid>
            {canEdit ? <GridCell><AddProductCard onPress={() => setModal({ open: true })} /></GridCell> : null}
            {filtered.map(p => (
              <GridCell key={p.id}>
                <ProductCard
                  product={p}
                  stockBadge={false}
                  categoryLabel={p.categoria?.nombre || 'Medicamentos'}
                  priceSuffix="estimado"
                  onEdit={canEdit && p.solo_encargo ? () => setModal({ open: true, producto: p }) : undefined}
                  onDelete={canEdit && canDelete && p.solo_encargo ? () => remove(p) : undefined}
                  body={(
                    <View style={{ marginBottom: 4 }}>
                      {p.descripcion ? <Text style={{ color: colors.text, fontSize: 13.5, marginBottom: 8 }} numberOfLines={4}>{p.descripcion}</Text> : null}
                      <Text style={{ color: colors.text, fontSize: 12.5, marginBottom: 12 }}>
                        {p.solo_encargo ? 'Exclusivo por encargo · no se mantiene inventario' : 'Sin stock · disponible por encargo'}
                      </Text>
                      {p.requiere_receta ? <Text style={{ color: colors.text, fontSize: 13.5 }}>Requiere receta</Text> : null}
                    </View>
                  )}
                >
                  {isClient ? (
                    <Button expand disabled={p.stock !== 0} onPress={() => add(p)} style={{ minHeight: 42, borderRadius: 10 }} textStyle={{ fontWeight: '700' }}>
                      Agregar a encargos
                    </Button>
                  ) : null}
                </ProductCard>
              </GridCell>
            ))}
          </ProductGrid>
        ) : null}
      </View>

      <ProductForm open={modal.open} producto={modal.producto} exclusivoEncargo onClose={refresh => {
        setModal({ open: false });
        if (refresh) load();
      }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6 },
  h1: { fontSize: 28, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  notice: { padding: 16, borderRadius: 12, marginTop: 16, fontSize: 14.5, lineHeight: 20, overflow: 'hidden' },
  searchbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 12, marginVertical: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 },
});
