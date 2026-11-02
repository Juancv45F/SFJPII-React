import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Guard, Screen } from '../../components/Screen';
import { Button, Icon } from '../../components/ui';
import { getUbicaciones } from '../../services/auth';
import { cart, CartItem } from '../../services/cart';
import { offline } from '../../services/connectivity';
import { crearPedido } from '../../services/orders';
import { getStock } from '../../services/products';
import { storage } from '../../services/storage';
import { rgba } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';
import { showLoading, showToast } from '../../ui/overlays';
import { discounted, money } from '../../utils/format';

const isMongoId = (v: any) => typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);

export default function CheckoutRoute() {
  return <Guard roles={['cliente']}><CheckoutPage /></Guard>;
}

function RadioRow({ selected, onPress, title, subtitle }: { selected: boolean; onPress: () => void; title: string; subtitle: string }) {
  const { colors } = useTheme();
  const accent = colors.primary;
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}
      style={[styles.radioRow, { borderBottomColor: rgba(colors.mediumRgb, 0.25) }]}>
      <View style={[styles.radio, { borderColor: selected ? accent : colors.medium }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: accent }]} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16 }}>{title}</Text>
        <Text style={{ color: colors.medium, fontSize: 14, marginTop: 2 }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function CheckoutPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [seleccion, setSeleccion] = useState<string | number | null>(null);
  const [tipoEntrega, setTipoEntrega] = useState<'domicilio' | 'recoger'>('domicilio');

  // ionViewWillEnter
  useFocusEffect(useCallback(() => {
    const items = cart.getCartItems();
    setCartItems(items);
    setTotal(cart.getTotalPrice());
    if (!items.length) router.replace('/catalogo');
    if (!storage.get('token')) return;
    getUbicaciones().then((res: any) => {
      if (!res?.ok) return;
      const list = res.data || [];
      setUbicaciones(list);
      if (list.length) setSeleccion(list[0]?._id ? String(list[0]._id) : 0);
    }).catch(() => {});
  }, [router]));

  const confirmarPedido = async () => {
    if (offline.value) return showToast('Recupera la conexión para confirmar. Tu carrito está guardado.', 'warning', 3000);
    if (tipoEntrega === 'domicilio' && seleccion == null) return showToast('Por favor selecciona una dirección de entrega', 'warning', 3000);
    const dismiss = showLoading('Procesando pedido...');
    const productos = cartItems.map(item => ({
      id: String(item.producto.id ?? item.producto._id ?? ''),
      cantidad: item.cantidad,
      precio: discounted(item.producto),
    }));
    if (productos.some(p => !isMongoId(p.id))) {
      dismiss();
      return showToast('Algunos productos del carrito son antiguos. Elimínalos y vuelve a agregarlos.', 'danger', 3000);
    }
    const sel = seleccion == null ? null
      : typeof seleccion === 'number' ? ubicaciones[seleccion] ?? null
        : ubicaciones.find(u => String(u?._id) === String(seleccion)) ?? null;
    const snapshot = sel ? { calle: sel.calle, numero: sel.numero, codigo_postal: sel.codigo_postal, descripcion: sel.descripcion, alias: sel.alias } : undefined;

    const existence = await Promise.all(productos.map(p => getStock(p.id).then(() => true).catch(() => false)));
    const missing = productos.filter((_, i) => !existence[i]).map(p => p.id);
    if (missing.length) {
      for (const id of missing) {
        const found = cartItems.find(ci => String(ci.producto.id ?? ci.producto._id) === id);
        if (found) cart.removeProduct(found.producto);
      }
      dismiss();
      setCartItems(cart.getCartItems());
      setTotal(cart.getTotalPrice());
      return showToast('Algunos productos ya no existen y fueron removidos del carrito.', 'warning', 3000);
    }

    try {
      await crearPedido({
        productos,
        total,
        tipo_entrega: tipoEntrega,
        ...(tipoEntrega === 'domicilio' ? { ubicacionId: seleccion } : {}),
        ...(tipoEntrega === 'domicilio' && snapshot ? { ubicacion: snapshot } : {}),
      });
      cart.clearCart();
      showToast(tipoEntrega === 'recoger' ? '¡Productos apartados para recoger en farmacia!' : '¡Pedido realizado con éxito!', 'success', 3000);
      router.replace('/catalogo');
    } catch (err: any) {
      const errors = err?.error?.errors;
      const first = errors && typeof errors === 'object' ? errors[Object.keys(errors)[0]]?.msg : null;
      showToast(first || err?.error?.message || err?.error?.msg || 'Error al crear el pedido', 'danger', 3000);
    } finally {
      dismiss();
    }
  };

  const accent = colors.primary;
  const disabled = !cartItems.length || (tipoEntrega === 'domicilio' && seleccion == null);

  return (
    <Screen
      title="Confirmar Pedido"
      backButton
      hrefBtn="/catalogo"
      tabs={false}
      footer={(
        <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: 16 + insets.bottom, borderTopColor: rgba(colors.mediumRgb, 0.2) }]}>
          <View style={styles.totalRow}>
            <Text style={{ color: colors.text, fontSize: 17.5 }}>Total a Pagar:</Text>
            <Text style={{ color: accent, fontSize: 24, fontWeight: '900' }}>{money(total)}</Text>
          </View>
          <Button expand color="success" icon="checkmark-circle" onPress={confirmarPedido} disabled={disabled} style={{ marginTop: 16 }}>
            Confirmar Pedido
          </Button>
        </View>
      )}
    >
      <Text style={[styles.h3, { color: colors.text, marginLeft: 16 }]}>Resumen</Text>
      {cartItems.map(item => {
        const p = item.producto;
        const hasDiscount = Number(p.descuento) > 0;
        return (
          <View key={String(p.id ?? p._id)} style={styles.item}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16 }}>{p.nombre}</Text>
              <Text style={{ color: colors.medium, fontSize: 14, marginTop: 2 }}>
                Cant: {item.cantidad} x{' '}
                {hasDiscount ? (
                  <>
                    <Text style={{ textDecorationLine: 'line-through', color: colors.muted }}>${p.precio}</Text>
                    <Text style={{ color: colors.success, fontWeight: '700' }}>  {money(discounted(p))}</Text>
                  </>
                ) : `$${p.precio}`}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{money(item.cantidad * discounted(p))}</Text>
          </View>
        );
      })}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
        <Text style={[styles.h3, { color: colors.text }]}>¿Cómo quieres recibir tu pedido?</Text>
        <RadioRow selected={tipoEntrega === 'domicilio'} onPress={() => setTipoEntrega('domicilio')} title="Entrega a domicilio" subtitle="Usar una dirección guardada" />
        <RadioRow selected={tipoEntrega === 'recoger'} onPress={() => setTipoEntrega('recoger')} title="Recoger en farmacia" subtitle="Apartaremos tus productos para que pases por ellos" />

        {tipoEntrega === 'domicilio' ? (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.h3, { color: colors.text }]}><Icon name="location" size={18} color={accent} /> Dirección de Entrega</Text>
            {ubicaciones.length === 0 ? (
              <View style={[styles.noAddress, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, marginBottom: 10 }}>No tienes direcciones guardadas.</Text>
                <Button fill="outline" size="small" onPress={() => router.push('/configuracion')}>Agregar Dirección</Button>
              </View>
            ) : ubicaciones.map((u, i) => {
              const value = u._id ? String(u._id) : i;
              return (
                <RadioRow key={String(value)} selected={seleccion === value} onPress={() => setSeleccion(value)}
                  title={u.alias} subtitle={`${u.calle} #${u.numero}, ${u.codigo_postal}`} />
              );
            })}
          </View>
        ) : (
          <Text style={[styles.pickup, { color: colors.text, backgroundColor: rgba(colors.successRgb, 0.12) }]}>
            Tu pedido quedará pendiente de pago y reservado para recoger en la farmacia.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h3: { fontSize: 18, fontWeight: '700', marginVertical: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  divider: { height: 1, marginVertical: 10, marginHorizontal: 16 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  noAddress: { alignItems: 'center', padding: 20, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  pickup: { marginTop: 16, padding: 16, borderRadius: 10, overflow: 'hidden' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
