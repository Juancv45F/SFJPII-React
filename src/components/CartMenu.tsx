import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cart, CartItem, CartMode, useCartItems } from '../services/cart';
import { useOffline, useStore } from '../services/connectivity';
import { cartMenuOpen } from '../state/app';
import { useTheme } from '../theme/ThemeProvider';
import { showToast } from '../ui/overlays';
import { discounted, money } from '../utils/format';
import { LOGO } from './Navbar';
import { Button, EmptyState, Icon, Notice, Segment } from './ui';
import { rgba } from '../theme/colors';
import { body, heading, radius, space, tabular } from '../theme/tokens';

type SwipeHandle = { hint: () => void };
const ACTION_WIDTH = 72;

// ion-item-sliding: deslizar a la izquierda muestra el botón de eliminar.
const SwipeRow = forwardRef<SwipeHandle, { children: React.ReactNode; onDelete: () => void }>(({ children, onDelete }, ref) => {
  const { colors } = useTheme();
  const x = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const settle = (open: boolean) => {
    openRef.current = open;
    Animated.spring(x, { toValue: open ? -ACTION_WIDTH : 0, useNativeDriver: Platform.OS !== 'web', bounciness: 0 }).start();
  };
  useImperativeHandle(ref, () => ({
    hint: () => {
      Animated.sequence([
        Animated.timing(x, { toValue: -ACTION_WIDTH, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(600),
        Animated.timing(x, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    },
  }));
  // Se reclama el gesto en fase de captura: si no, los botones de la fila (Pressable) se quedan con el toque.
  const horizontal = (g: { dx: number; dy: number }) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => horizontal(g),
    onMoveShouldSetPanResponder: (_, g) => horizontal(g),
    onPanResponderGrant: () => x.stopAnimation(),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.setValue(Math.min(0, Math.max(-ACTION_WIDTH * 1.5, (openRef.current ? -ACTION_WIDTH : 0) + g.dx))),
    onPanResponderRelease: (_, g) => settle((openRef.current ? -ACTION_WIDTH : 0) + g.dx < -ACTION_WIDTH / 2),
    onPanResponderTerminate: () => settle(openRef.current),
  })).current;
  return (
    <View style={{ overflow: 'hidden', borderRadius: radius.lg }}>
      <Pressable onPress={() => { settle(false); onDelete(); }} style={[styles.deleteAction, { backgroundColor: colors.danger }]} accessibilityRole="button" accessibilityLabel="Eliminar del carrito">
        <Icon name="trash" size={24} color={colors.onDanger} />
      </Pressable>
      <Animated.View style={[{ transform: [{ translateX: x }], backgroundColor: 'transparent' }, Platform.OS === 'web' && ({ touchAction: 'pan-y', userSelect: 'none', cursor: 'grab' } as any)]} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
});
SwipeRow.displayName = 'SwipeRow';

export type CartMenuHandle = { animateHint: () => void };

// Menú lateral derecho del carrito (ion-menu menuId="cart-menu").
export const CartMenu = forwardRef<CartMenuHandle>((_, ref) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useCartItems();
  const offline = useOffline();
  const syncError = useStore(cart.syncError);
  const pending = useStore(cart.pending);
  const conflicts = useStore(cart.conflicts);
  const [mode, setMode] = useState<CartMode>('compra');
  const firstRow = useRef<SwipeHandle>(null);
  const visible = items.filter(it => (it.modo || 'compra') === mode);
  const total = visible.reduce((n, it) => n + it.cantidad * discounted(it.producto), 0);
  const countMode = (m: CartMode) => items.filter(it => (it.modo || 'compra') === m).reduce((n, it) => n + it.cantidad, 0);

  useImperativeHandle(ref, () => ({ animateHint: () => setTimeout(() => firstRow.current?.hint(), 300) }));

  const moveCartItem = async (item: CartItem) => {
    try {
      const moved = await cart.moveProduct(item.producto, mode === 'compra' ? 'encargo' : 'compra');
      if (!moved) showToast(mode === 'compra' ? 'Solo se pueden encargar medicamentos sin stock.' : 'Este medicamento es exclusivo por encargo o no tiene stock suficiente para esa cantidad.', 'warning', 4000);
    } catch {
      showToast('No se pudo verificar el stock. Inténtalo de nuevo.', 'danger', 3000);
    }
  };

  const conflictText = (c: any) => c.motivo === 'agotado' ? 'Ya no hay inventario. ¿Quieres encargarlo?'
    : c.motivo === 'eliminado' ? 'Este producto ya no está disponible.'
      : c.motivo === 'disponible' ? 'Ya hay existencias para comprar ahora.'
        : `Solo quedan ${c.stock} unidades.`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.toolbar, { backgroundColor: colors.toolbar, paddingTop: insets.top }]}>
        <Text role="heading" aria-level={2} style={[styles.title, { color: colors.onToolbar }]}>Tu carrito</Text>
        <Pressable onPress={() => cartMenuOpen.set(false)} style={[styles.close, pointer]} accessibilityRole="button" accessibilityLabel="Cerrar carrito">
          <Icon name="close" size={26} color={colors.onToolbar} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[2] }}>
        <Segment variant="pill" value={mode} onChange={setMode} style={{ marginBottom: space[1] }} options={[
          { value: 'compra', label: `Comprar ahora (${countMode('compra')})` },
          { value: 'encargo', label: `Encargos (${countMode('encargo')})` },
        ]} />
        {mode === 'encargo' ? <Text style={[styles.hint, { color: colors.muted }]}>Solicita tus medicamentos y consulta cuándo llegan en Mis encargos.</Text> : null}
        {syncError ? (
          <View role="alert">
            <Notice icon="alert-circle">{syncError}</Notice>
            <Button fill="clear" onPress={() => cart.retrySync()}>Reintentar sincronización</Button>
          </View>
        ) : null}
        {pending ? <Notice tone="info" icon="cloud-offline-outline">Cambios guardados en este dispositivo. Pendientes de sincronizar.</Notice> : null}
        {conflicts.map(c => (
          <View key={c.id} style={[styles.conflict, { backgroundColor: colors.warningBg }]} role="alert">
            <Text style={[heading(700), { color: colors.warningText, fontSize: 15.5 }]}>{c.nombre || 'Medicamento'}</Text>
            <Text style={[styles.hint, { color: colors.warningText, marginBottom: 4 }]}>{conflictText(c)}</Text>
            {c.puedeEncargar ? <Button onPress={() => cart.resolveConflict(c, 'encargo')}>Sí, encargar</Button> : null}
            {c.motivo === 'disponible' ? <Button onPress={() => cart.resolveConflict(c, 'compra')}>Comprar ahora</Button> : null}
            {c.motivo === 'insuficiente' ? <Button onPress={() => cart.resolveConflict(c, 'ajustar')}>Ajustar cantidad</Button> : null}
            <Button fill="outline" color="danger" onPress={() => cart.resolveConflict(c, 'eliminar')}>Eliminar del carrito</Button>
          </View>
        ))}

        {visible.map((item, index) => {
          const p = item.producto;
          const max = mode === 'encargo' ? 999 : Number(p.stock || 0);
          const hasDiscount = Number(p.descuento) > 0;
          return (
            <SwipeRow key={p.id} ref={index === 0 ? firstRow : undefined} onDelete={() => cart.removeProduct(p)}>
              <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.thumb, { backgroundColor: colors.photoBg, borderColor: colors.border }]}>
                  <Image source={p.imagen ? { uri: p.imagen } : LOGO} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} accessibilityLabel={p.nombre} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={3}>{p.nombre}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceNow, { color: colors.text }]}>{money(hasDiscount ? discounted(p) : p.precio)}</Text>
                    {hasDiscount ? (
                      <>
                        <Text style={[styles.priceOld, { color: colors.muted }]}>{money(p.precio)}</Text>
                        <Text style={[styles.discount, { color: colors.danger, backgroundColor: rgba(colors.dangerRgb, 0.1) }]}>-{p.descuento}%</Text>
                      </>
                    ) : <Text style={[styles.priceOld, { color: colors.muted, textDecorationLine: 'none' }]}>c/u</Text>}
                  </View>
                  <View style={styles.controls}>
                    <View role="group" aria-label="Cantidad" style={[styles.qty, { backgroundColor: colors.surface2 }]}>
                      <Pressable style={[styles.qtyBtn, pointer]} onPress={() => cart.decreaseProduct(p)} accessibilityRole="button" accessibilityLabel="Disminuir cantidad">
                        <Icon name="remove" size={18} color={colors.primary} />
                      </Pressable>
                      <Text aria-live="polite" style={[styles.qtyText, { color: colors.text }]}>{item.cantidad}</Text>
                      <Pressable style={[styles.qtyBtn, pointer, item.cantidad >= max && { opacity: 0.4 }]} disabled={item.cantidad >= max}
                        onPress={() => cart.addProduct(p, mode)} accessibilityRole="button" accessibilityLabel="Aumentar cantidad">
                        <Icon name="add" size={18} color={colors.primary} />
                      </Pressable>
                    </View>
                    <Text style={[styles.subtotal, { color: colors.primary }]}>{money(discounted(p) * item.cantidad)}</Text>
                  </View>
                  <View style={styles.links}>
                    <Pressable onPress={() => moveCartItem(item)} accessibilityRole="button" style={[styles.link, pointer]}>
                      <Text style={[body(600), styles.underline, { color: colors.primary, fontSize: 14 }]}>
                        {mode === 'compra' ? 'Mover a encargos' : 'Mover a comprar ahora'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => cart.removeProduct(p)} accessibilityRole="button" accessibilityLabel={`Eliminar ${p.nombre} del carrito`} style={[styles.link, pointer]}>
                      <Icon name="trash" size={15} color={colors.danger} />
                      <Text style={[body(600), styles.underline, { color: colors.danger, fontSize: 14 }]}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </SwipeRow>
          );
        })}

        {visible.length === 0 ? (
          <EmptyState icon="cart-outline" message={mode === 'compra' ? 'No tienes productos para comprar ahora' : 'No tienes medicamentos por encargar'} />
        ) : null}
      </ScrollView>
      {visible.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[3], backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.totalRow}>
            <Text style={[body(600), { color: colors.muted, fontSize: 15 }]}>{mode === 'encargo' ? 'Total estimado' : 'Total'}</Text>
            <Text style={[styles.total, { color: colors.text }]}>{money(total)}</Text>
          </View>
          <Button expand disabled={offline || conflicts.length > 0} style={{ marginTop: space[3], minHeight: 48 }}
            onPress={() => { cartMenuOpen.set(false); router.push(mode === 'encargo' ? '/encargos/confirmar' : '/pedidos/checkout'); }}>
            {mode === 'encargo' ? 'Continuar con encargo' : 'Continuar con compra'}
          </Button>
        </View>
      ) : null}
    </View>
  );
});
CartMenu.displayName = 'CartMenu';

const pointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingLeft: space[4], paddingRight: 4 },
  title: { ...heading(700), flex: 1, fontSize: 20 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hint: { ...body(400), fontSize: 14.5, lineHeight: 21 },
  conflict: { padding: space[3], borderRadius: radius.md, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'flex-start', padding: space[3], borderWidth: 1, borderRadius: radius.lg, gap: space[3] },
  thumb: { width: 72, height: 72, borderRadius: radius.md, borderWidth: 1, padding: 6, overflow: 'hidden' },
  name: { ...heading(700), fontSize: 16, lineHeight: 21, marginBottom: 4 },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, rowGap: 2, marginBottom: space[2] },
  priceNow: { ...body(700), ...tabular, fontSize: 15 },
  priceOld: { ...body(400), ...tabular, fontSize: 13.5, textDecorationLine: 'line-through' },
  discount: { ...body(700), fontSize: 12, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  qty: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, padding: 2 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qtyText: { ...body(700), ...tabular, fontSize: 16, minWidth: 28, textAlign: 'center' },
  subtotal: { ...heading(800), ...tabular, fontSize: 17 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space[4], marginTop: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  underline: { textDecorationLine: 'underline' },
  deleteAction: { position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  footer: { paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  total: { ...heading(800), ...tabular, fontSize: 24 },
});
