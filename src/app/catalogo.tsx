import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { CategoryChips, GridCell, ProductCard, ProductGrid, SkeletonCard } from '../components/ProductCard';
import { Screen } from '../components/Screen';
import { Button, EmptyState, PageContainer } from '../components/ui';
import { isStaff } from '../config/roles';
import { useCatalog } from '../hooks/useCatalog';
import { cart } from '../services/cart';
import { useSession } from '../state/app';
import { space } from '../theme/tokens';
import { showToast } from '../ui/overlays';

// Port de HomePage (ruta /catalogo). El personal usa /admin/inventario.
export default function CatalogoPage() {
  const { role, isAuthenticated } = useSession();
  if (isAuthenticated && isStaff(role)) return <Redirect href="/admin/inventario" />;
  return <Catalogo role={role} />;
}

function Catalogo({ role }: { role: string }) {
  const c = useCatalog();
  const isClient = role === 'cliente';

  const addToCart = (p: any) => {
    if (p.stock <= 0) return showToast('Producto agotado', 'warning', 2000);
    const added = cart.addProduct(p);
    showToast(added ? `Agregado: ${p.nombre}` : 'Revisa el carrito: alcanzaste el stock o el medicamento está en Encargos.', added ? 'success' : 'warning', 2000);
  };

  const addToEncargos = (p: any) => {
    const added = cart.addProduct(p, 'encargo');
    showToast(added ? 'Agregado a Encargos. Confírmalo desde el carrito.' : 'Revisa el carrito para mover este medicamento a Encargos o ajustar su cantidad.', added ? 'success' : 'warning', 2000);
  };

  return (
    <Screen title="Catálogo" showSearch padding={false} stickyHeaderIndices={[0]} refreshing={c.refreshing} onRefresh={c.onRefresh} siteFooter>
      <CategoryChips categories={c.categories} selected={c.selectedCategory} onSelect={c.selectCategory}
        offers={c.showOnlyDiscounts} onToggleOffers={c.toggleOffers} label="Catálogo" />

      <PageContainer style={{ paddingTop: space[3], paddingHorizontal: space[2], paddingBottom: space[6] }}>
        {c.isLoading ? (
          <ProductGrid>{[1, 2, 3, 4, 5, 6, 7, 8].map(i => <GridCell key={i}><SkeletonCard /></GridCell>)}</ProductGrid>
        ) : c.products.length === 0 ? (
          <EmptyState icon="search-outline" message="No encontramos productos."
            action={<Button fill="outline" round onPress={() => c.selectCategory('')}>Ver todos</Button>} />
        ) : (
          <ProductGrid>
            {c.products.map(p => (
              <GridCell key={p.id}>
                <ProductCard product={p}>
                  {isClient ? (
                    <View>
                      {p.stock > 0
                        ? <Button expand icon="cart" onPress={() => addToCart(p)} style={{ marginVertical: 0 }}>Agregar</Button>
                        : <Button expand fill="outline" onPress={() => addToEncargos(p)} style={{ marginVertical: 0 }}>Encargar</Button>}
                    </View>
                  ) : null}
                </ProductCard>
              </GridCell>
            ))}
          </ProductGrid>
        )}
      </PageContainer>
    </Screen>
  );
}
