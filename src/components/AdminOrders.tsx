import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getOrders, updateOrderStatus } from '../services/auth';
import { useTheme } from '../theme/ThemeProvider';
import { Color, showAlert, showLoading, showToast } from '../ui/overlays';
import { dateTime, money } from '../utils/format';
import { Screen } from './Screen';
import { StatusBadge } from './StatusBadge';
import { Select, Spinner } from './ui';

const statusColor = (s: string): Color =>
  ({ pendiente: 'warning', enviado: 'primary', entregado: 'success', cancelado: 'danger' } as Record<string, Color>)[s] || 'medium';

// Port de GestionPedidosPage ('gestion') y PedidosPendientesPage ('pendientes').
export function AdminOrders({ mode }: { mode: 'gestion' | 'pendientes' }) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pendientes = mode === 'pendientes';

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const resp: any = await getOrders();
      const data = resp?.data || [];
      setPedidos(pendientes ? data.filter((p: any) => p.estado !== 'entregado' && p.estado !== 'cancelado') : data);
    } catch {
      showToast('Error al cargar los pedidos', 'danger', 2000);
    }
    setLoading(false);
  }, [pendientes]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (id: string, estado: string) => {
    const r = await showAlert({
      header: 'Confirmar cambio',
      message: `¿Deseas cambiar el estado a "${estado.toUpperCase()}"?`,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Confirmar', role: 'confirm' }],
    });
    if (r.role !== 'confirm') return;
    const dismiss = showLoading('Actualizando...');
    try {
      await updateOrderStatus(id, estado);
      showToast('Estado actualizado con éxito', 'success', 2000);
      cargar();
    } catch (err: any) {
      showToast(err?.error?.message || 'Error al actualizar estado', 'danger', 2000);
    } finally {
      dismiss();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  const cols = width >= 992 ? 3 : width >= 768 ? 2 : 1;
  const divider = { borderBottomWidth: 1, borderBottomColor: colors.surface2, paddingVertical: 8 };
  const line = (label: string, value: any) => (
    <Text style={[styles.p, { color: colors.text }]}><Text style={{ fontWeight: '700' }}>{label}</Text> {value}</Text>
  );

  return (
    <Screen title={pendientes ? 'Pedidos Pendientes' : 'Gestión de Pedidos'} refreshing={refreshing} onRefresh={onRefresh}>
      {loading ? (
        <View style={styles.empty}>
          <Spinner size="large" color={colors.primary} />
          <Text style={{ color: colors.medium, marginTop: 12 }}>{pendientes ? 'Cargando pedidos pendientes...' : 'Cargando historial de pedidos...'}</Text>
        </View>
      ) : pedidos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ color: colors.medium }}>{pendientes ? 'No hay pedidos pendientes por procesar.' : 'No se encontraron pedidos en el sistema.'}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
          {pedidos.map(p => (
            <View key={p._id} style={{ width: `${100 / cols}%`, paddingHorizontal: 5 }}>
              <View style={[styles.card, {
                backgroundColor: colors.surface, shadowOpacity: isDark ? 0.3 : 0.05,
                borderWidth: 1, borderColor: colors.border,
              }]}>
                <Pressable onPress={() => router.push(`/pedidos/detalle/${p._id}`)} style={{ padding: 16, paddingBottom: 0 }}>
                  <View style={styles.headerTop}>
                    <Text style={[styles.title, { color: colors.text }]}>Pedido #{String(p._id).slice(-6)}</Text>
                    <StatusBadge label={String(p.estado).toUpperCase()} color={statusColor(p.estado)} />
                  </View>
                  <Text style={{ color: colors.medium, fontSize: 13.5 }}>{dateTime(p.createdAt)}</Text>
                </Pressable>
                <View style={{ padding: 16, paddingTop: 10 }}>
                  <View style={divider}>
                    {line('Cliente:', `${p.userId?.nombre || ''} ${p.userId?.apellido || ''}`)}
                    {!pendientes ? line('Email:', p.userId?.email) : null}
                    {p.userId?.telefono ? line('Teléfono:', p.userId.telefono) : null}
                  </View>
                  <View style={divider}>
                    {line('Total:', money(p.total))}
                    {pendientes ? line('Items:', (p.items || []).length) : line('Productos:', `${(p.items || []).length} ítems`)}
                  </View>
                  {pendientes ? (
                    <>
                      <View style={{ paddingTop: 8 }}>{line('Entrega:', p.tipo_entrega === 'recoger' ? 'Recoger en farmacia' : 'A domicilio')}</View>
                      <View style={{ paddingTop: 8 }}>
                        <Select label="Cambiar estado:" value={p.estado} onChange={v => v !== p.estado && cambiarEstado(p._id, v)}
                          options={[
                            { value: 'pendiente', label: 'Pendiente' }, { value: 'enviado', label: 'Enviado' },
                            { value: 'entregado', label: 'Entregado' }, { value: 'cancelado', label: 'Cancelar' },
                          ]} />
                      </View>
                    </>
                  ) : (
                    <View style={{ paddingTop: 8 }}>
                      {p.tipo_entrega === 'recoger' ? line('Entrega:', 'Recoger en farmacia') : line('Dirección:', `${p.ubicacion?.calle || ''} #${p.ubicacion?.numero || ''}`)}
                      {p.ubicacion?.alias ? (
                        <Text style={[styles.p, { fontStyle: 'italic', color: colors.primary }]}>({p.ubicacion.alias})</Text>
                      ) : null}
                    </View>
                  )}
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
  empty: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  card: { marginVertical: 10, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 },
  title: { fontSize: 17.5, fontWeight: '700' },
  p: { marginVertical: 4, fontSize: 15 },
});
