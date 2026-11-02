import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { AddProductCard, CategoryChips, GridCell, ProductCard, ProductGrid, PromoStock, QuickStock, SkeletonCard } from '../../components/ProductCard';
import { ProductForm } from '../../components/ProductForm';
import { Guard, Screen } from '../../components/Screen';
import { Button, EmptyState, Icon, PageContainer } from '../../components/ui';
import { features } from '../../config/features';
import { isAdmin, STAFF_ROLES } from '../../config/roles';
import { useCatalog } from '../../hooks/useCatalog';
import { deleteProducto, updateStock } from '../../services/products';
import { useSession } from '../../state/app';
import { useTheme } from '../../theme/ThemeProvider';
import { body, shadow, space } from '../../theme/tokens';
import { showAlert, showToast } from '../../ui/overlays';

export default function InventarioRoute() {
  return <Guard roles={STAFF_ROLES}><InventarioPage /></Guard>;
}

// Port de InventarioPage (/admin/inventario): vista del personal con stock rápido y CRUD de productos.
function InventarioPage() {
  const { colors } = useTheme();
  const { role } = useSession();
  const c = useCatalog();
  const [modal, setModal] = useState<{ open: boolean; producto?: any }>({ open: false });
  const canDelete = isAdmin(role);

  const setLocalStock = (id: string, stock: number) => c.setProducts(list => list.map(p => (p.id === id ? { ...p, stock } : p)));

  const commitStock = async (p: any, value: number) => {
    if (Number.isNaN(value) || value < 0) return showToast('Stock inválido', 'warning', 2000);
    setLocalStock(p.id, value);
    try {
      await updateStock(p.id, value);
      showToast(`Stock actualizado a ${value} para ${p.nombre}`, 'success', 2000);
    } catch {
      showToast('Error al actualizar stock', 'danger', 2000);
    }
  };

  const confirmarEliminacion = async (p: any) => {
    const r = await showAlert({
      header: '¿Eliminar producto?',
      message: `¿Estás seguro de eliminar ${p.nombre}?`,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive' }],
    });
    if (r.role !== 'destructive') return;
    try {
      await deleteProducto(p.id);
      showToast('Producto eliminado', 'success', 2000);
      c.loadProducts();
    } catch {
      showToast('Error al eliminar', 'danger', 2000);
    }
  };

  const exportarJSON = async () => {
    if (!c.products.length) return showToast('No hay datos para exportar', 'warning', 2000);
    try {
      await Share.share({ title: `inventario_farmacia_${Date.now()}.json`, message: JSON.stringify(c.products, null, 2) });
      showToast('Exportación completada', 'success', 2000);
    } catch {
      showToast('Error al generar el archivo', 'danger', 2000);
    }
  };

  return (
    <Screen
      title="Inventario"
      showSearch
      padding={false}
      stickyHeaderIndices={[0]}
      refreshing={c.refreshing}
      onRefresh={c.onRefresh}
      fab={features.exportJson && isAdmin(role) ? (
        <Pressable onPress={exportarJSON} accessibilityRole="button" accessibilityLabel="Exportar inventario en JSON"
          style={[{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }, shadow(colors, 'md')]}>
          <Icon name="download-outline" size={24} color={colors.onSuccess} />
        </Pressable>
      ) : undefined}
    >
      <CategoryChips categories={c.categories} selected={c.selectedCategory} onSelect={c.selectCategory}
        offers={c.showOnlyDiscounts} onToggleOffers={c.toggleOffers} label="Inventario" />

      <PageContainer style={{ paddingTop: space[3], paddingHorizontal: space[2], paddingBottom: 90 }}>
        {!c.isLoading ? (
          <View style={{ paddingHorizontal: space[2], paddingBottom: space[2] }}>
            <Text style={[body(600), { color: colors.muted, fontSize: 15 }]}>
              {c.products.length === 1 ? '1 producto' : `${c.products.length} productos`}
            </Text>
          </View>
        ) : null}

        {c.isLoading ? (
          <ProductGrid>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <GridCell key={i}><SkeletonCard /></GridCell>)}</ProductGrid>
        ) : (
          <>
            {c.products.length === 0 ? (
              <EmptyState icon="search-outline" message="No encontramos productos."
                action={<Button fill="outline" round onPress={() => c.selectCategory('')}>Ver todos</Button>} />
            ) : null}
            <ProductGrid>
              <GridCell><AddProductCard onPress={() => setModal({ open: true })} /></GridCell>
              {c.products.map(p => (
                <GridCell key={p.id}>
                  <ProductCard
                    product={p}
                    onEdit={() => setModal({ open: true, producto: p })}
                    onDelete={canDelete ? () => confirmarEliminacion(p) : undefined}
                  >
                    {p.producto_base
                      ? <PromoStock product={p} />
                      : <QuickStock value={Number(p.stock) || 0} onChange={v => setLocalStock(p.id, v)} onCommit={v => commitStock(p, v)} />}
                  </ProductCard>
                </GridCell>
              ))}
            </ProductGrid>
          </>
        )}
      </PageContainer>

      <ProductForm open={modal.open} producto={modal.producto} onClose={refresh => {
        setModal({ open: false });
        if (refresh) c.loadProducts();
      }} />
    </Screen>
  );
}
