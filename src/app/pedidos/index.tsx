import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Guard, Screen } from '../../components/Screen';
import { StatusBadge } from '../../components/StatusBadge';
import { Button, Icon, Segment, Spinner } from '../../components/ui';
import { getOrders, updateOrderStatus } from '../../services/auth';
import { cart } from '../../services/cart';
import { getStock } from '../../services/products';
import { ws } from '../../services/websocket';
import { rgba } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';
import { Color, showAlert, showLoading, showToast } from '../../ui/overlays';
import { dateTime, money } from '../../utils/format';

const statusIcon = (s: string) =>
  ({ pendiente: 'time-outline', enviado: 'car-outline', entregado: 'checkmark-circle-outline', cancelado: 'close-circle-outline' } as Record<string, string>)[s] || 'help-circle-outline';
const statusColor = (s: string): Color =>
  ({ pendiente: 'warning', enviado: 'primary', entregado: 'success', cancelado: 'danger' } as Record<string, Color>)[s] || 'medium';

export default function PedidosRoute() {
  return <Guard roles={['cliente']}><PedidosPage /></Guard>;
}

function PedidosPage() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [segment, setSegment] = useState<'activos' | 'historial'>('activos');
  const [activos, setActivos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const resp: any = await getOrders();
      const todos = resp?.data || [];
      setActivos(todos.filter((p: any) => p.estado === 'pendiente' || p.estado === 'enviado'));
      setHistorial(todos.filter((p: any) => p.estado === 'entregado' || p.estado === 'cancelado'));
    } catch {
      showToast('Error al cargar tus pedidos', 'danger', 3000);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    cargarPedidos();
    const off1 = ws.onActualizacionesPedidos(() => cargarPedidos());
    const off2 = ws.connected.subscribe(() => cargarPedidos());
    return () => { off1(); off2(); };
  }, [cargarPedidos]);

  const cancelarPedido = async (id: string) => {
    const r = await showAlert({
      header: 'Cancelar Pedido',
      message: '¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.',
      buttons: [{ text: 'No', role: 'cancel' }, { text: 'Sí, cancelar', role: 'destructive' }],
    });
    if (r.role !== 'destructive') return;
    const dismiss = showLoading('Cancelando pedido...');
    try {
      await updateOrderStatus(id, 'cancelado');
      showToast('Pedido cancelado correctamente', 'success', 3000);
      cargarPedidos();
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al cancelar el pedido', 'danger', 3000);
    } finally {
      dismiss();
    }
  };

  const volverAEncargar = async (pedido: any) => {
    const dismiss = showLoading('Verificando stock...');
    let agregados = 0;
    const sinStock: string[] = [];
    for (const item of pedido.items || []) {
      try {
        const res: any = await getStock(item.productoId);
        const stockActual = Number(res?.stock);
        if (stockActual >= item.cantidad) {
          const producto = { id: item.productoId, nombre: item.nombre, precio: item.precio_unitario, imagen: item.imagen, stock: stockActual };
          for (let i = 0; i < item.cantidad; i++) cart.addProduct(producto);
          agregados++;
        } else sinStock.push(item.nombre);
      } catch {
        sinStock.push(item.nombre);
      }
    }
    dismiss();
    if (agregados > 0) {
      showToast(`${agregados} productos añadidos al carrito`, 'success', 3000);
      if (sinStock.length) showAlert({ header: 'Algunos productos no disponibles', message: `Los siguientes productos no tienen stock suficiente: ${sinStock.join(', ')}`, buttons: ['OK'] });
    } else {
      showAlert({ header: 'Sin Stock', message: 'Ninguno de los productos de este pedido tiene stock suficiente actualmente.', buttons: ['OK'] });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarPedidos();
    setRefreshing(false);
  };

  const cardStyle = [styles.card, {
    backgroundColor: colors.surface, borderColor: rgba(colors.mediumRgb, 0.1), shadowOpacity: isDark ? 0.3 : 0.05,
  }];
  const accent = colors.primary;
  const half = width >= 768;

  const header = (p: any) => (
    <Pressable onPress={() => router.push(`/pedidos/detalle/${p._id}`)} style={{ padding: 16, paddingBottom: 5 }}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: colors.text }]}>Pedido #{String(p._id).slice(-6)}</Text>
        <StatusBadge label={String(p.estado).toUpperCase()} color={statusColor(p.estado)} icon={statusIcon(p.estado)} />
      </View>
      <Text style={{ color: colors.medium, fontSize: 14 }}>{dateTime(p.createdAt)}</Text>
    </Pressable>
  );
  const location = (p: any) => (
    <>
      {p.tipo_entrega === 'recoger' ? <Text style={{ color: accent, fontWeight: '500', fontSize: 13.5 }}>Recoger en farmacia</Text> : null}
      {p.ubicacion?.alias ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="pin" size={17} color={accent} />
          <Text style={{ color: accent, fontWeight: '500', fontSize: 13.5 }}>{p.ubicacion.alias}</Text>
        </View>
      ) : null}
    </>
  );
  const empty = (icon: string, text: string, action?: boolean) => (
    <View style={styles.empty}>
      <Icon name={icon} size={32} color={colors.medium} style={{ opacity: 0.5, marginBottom: 15 }} />
      <Text style={{ color: colors.medium, textAlign: 'center', marginBottom: 12 }}>{text}</Text>
      {action ? <Button onPress={() => router.push('/catalogo')}>Ver productos</Button> : null}
    </View>
  );

  return (
    <Screen title="Mis pedidos" refreshing={refreshing} onRefresh={onRefresh} siteFooter>
      <Segment value={segment} onChange={setSegment} options={[{ value: 'activos', label: 'En Curso' }, { value: 'historial', label: 'Historial' }]}
        style={[styles.segment, { backgroundColor: colors.surface, borderColor: rgba(colors.mediumRgb, isDark ? 0.26 : 0.18) }]} />

      {loading ? (
        <View style={styles.empty}><Spinner size="large" color={accent} /><Text style={{ color: colors.medium, marginTop: 12 }}>Cargando tus pedidos...</Text></View>
      ) : segment === 'activos' ? (
        activos.length === 0 ? empty('time-outline', 'No tienes pedidos activos en este momento.', true) : (
          <View style={styles.grid}>
            {activos.map(p => (
              <View key={p._id} style={{ width: half ? '50%' : '100%', paddingHorizontal: half ? 5 : 0 }}>
                <View style={cardStyle}>
                  {header(p)}
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                    <View style={{ marginVertical: 10 }}>
                      {(p.items || []).map((item: any, i: number, arr: any[]) => (
                        <View key={i} style={[styles.item, i < arr.length - 1 && { borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: rgba(colors.mediumRgb, 0.2) }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{item.nombre}</Text>
                            <Text style={{ color: colors.medium, fontSize: 13.5, marginTop: 2 }}>{item.cantidad} x {money(item.precio_unitario)}</Text>
                          </View>
                          <Text style={{ color: accent, fontWeight: '700' }}>{money(item.subtotal)}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.footer, { borderTopColor: rgba(colors.mediumRgb, 0.1) }]}>
                      <View style={{ gap: 4 }}>{location(p)}</View>
                      <View>
                        <Text style={{ color: colors.medium, fontSize: 13 }}>Total</Text>
                        <Text style={{ color: colors.text, fontSize: 17.5, fontWeight: '700' }}>{money(p.total)}</Text>
                      </View>
                      {p.estado === 'pendiente' ? (
                        <Button color="danger" fill="outline" size="small" icon="close-circle-outline" onPress={() => cancelarPedido(p._id)}>Cancelar</Button>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )
      ) : historial.length === 0 ? empty('refresh-outline', 'Aún no tienes pedidos finalizados.') : (
        <View style={styles.grid}>
          {historial.map(p => (
            <View key={p._id} style={{ width: half ? '50%' : '100%', paddingHorizontal: half ? 5 : 0 }}>
              <View style={cardStyle}>
                {header(p)}
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Text style={{ color: colors.text, marginVertical: 8 }}>{(p.items || []).length} productos por {money(p.total)}</Text>
                  {location(p)}
                  <View style={[styles.footer, { borderTopColor: rgba(colors.mediumRgb, 0.1) }]}>
                    <Button size="small" icon="refresh-outline" onPress={() => volverAEncargar(p)}>Volver a pedir</Button>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { marginBottom: 15, borderRadius: 8, borderWidth: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { marginVertical: 10, borderRadius: 12, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 15, paddingTop: 10, borderTopWidth: 1 },
});
