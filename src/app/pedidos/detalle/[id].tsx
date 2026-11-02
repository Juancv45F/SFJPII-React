import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LOGO, SimpleHeader } from '../../../components/Navbar';
import { Guard, Screen } from '../../../components/Screen';
import { StatusBadge } from '../../../components/StatusBadge';
import { Card, Icon } from '../../../components/ui';
import { getPedidoById } from '../../../services/orders';
import { ws } from '../../../services/websocket';
import { rgba } from '../../../theme/colors';
import { useTheme } from '../../../theme/ThemeProvider';
import { Color } from '../../../ui/overlays';
import { medium, money } from '../../../utils/format';

const badgeColor = (e: string): Color => ({ pendiente: 'warning', en_camino: 'primary', entregado: 'success' } as Record<string, Color>)[e] || 'medium';

export default function PedidoDetalleRoute() {
  return <Guard><PedidoDetalle /></Guard>;
}

function PedidoDetalle() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pedido, setPedido] = useState<any>(null);

  const cargar = useCallback(async () => {
    if (!id) return;
    try { setPedido((await getPedidoById(id))?.data); } catch { /* conserva el detalle */ }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    cargar();
    const off1 = ws.onActualizacionesPedidos(() => cargar());
    const off2 = ws.connected.subscribe(() => cargar());
    return () => { off1(); off2(); };
  }, [cargar]);

  const accent = colors.primary;
  const user = pedido?.User;
  const ubic = pedido?.Ubicacion;

  return (
    <Screen header={<SimpleHeader title="Pedido" defaultHref="/pedidos" />} tabs={false} padding={false}>
      {pedido ? (
        <>
          <View style={{ padding: 16 }}>
            <StatusBadge label={String(pedido.estado).toUpperCase()} color={badgeColor(pedido.estado)} />
            <Text style={{ color: colors.text, marginTop: 10 }}><Icon name="time-outline" size={15} color={colors.text} /> {medium(pedido.createdAt)}</Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.row}>
              <Icon name="person-outline" size={24} color={colors.medium} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.h2, { color: colors.text }]}>{user?.nombre} {user?.apellido}</Text>
                <Text style={[styles.p, { color: colors.medium }]}>{user?.email}</Text>
                {user?.telefono ? <Text style={[styles.p, { color: colors.medium }]}>{user.telefono}</Text> : null}
              </View>
              {user?.telefono ? (
                <Pressable onPress={() => Linking.openURL(`tel:${user.telefono}`)} style={{ padding: 10 }} accessibilityLabel="Llamar">
                  <Icon name="call-outline" size={24} color={accent} />
                </Pressable>
              ) : null}
            </View>
          </Card>

          <Card style={styles.card}>
            {pedido.tipo_entrega !== 'recoger' ? (
              <View style={styles.row}>
                <Icon name="location-outline" size={24} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.h2, { color: colors.text, fontWeight: '700' }]}>{ubic?.alias}</Text>
                  <Text style={[styles.p, { color: colors.medium }]}>{ubic?.calle} #{ubic?.numero}</Text>
                  <Text style={[styles.p, { color: colors.medium }]}>{ubic?.codigo_postal}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.row}>
                <Icon name="storefront-outline" size={24} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.h2, { color: colors.text, fontWeight: '700' }]}>Recoger en farmacia</Text>
                  <Text style={[styles.p, { color: colors.medium }]}>El cliente pasará por los productos apartados.</Text>
                </View>
              </View>
            )}
          </Card>

          <Text style={[styles.section, { color: colors.text }]}>Productos</Text>
          {(pedido.DetallePedidos || []).map((item: any, i: number) => (
            <View key={i} style={[styles.item, { borderBottomColor: rgba(colors.mediumRgb, 0.25), backgroundColor: colors.card }]}>
              <Image source={item.Producto?.imagen ? { uri: item.Producto.imagen } : LOGO} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.h2, { color: colors.text }]}>{item.Producto?.nombre}</Text>
                <Text style={[styles.p, { color: colors.medium }]}>{item.cantidad} unidad(es) x {money(item.precio_unitario)}</Text>
              </View>
              <Text style={{ fontSize: 15, color: colors.text }}>{money(item.cantidad * item.precio_unitario)}</Text>
            </View>
          ))}

          <View style={{ padding: 16, gap: 12 }}>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.text }}>Total</Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 19 }}>{money(pedido.total)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.text }}>Método de Pago</Text>
              <Text style={{ color: colors.text }}>{String(pedido.metodo_pago || '').toUpperCase()}</Text>
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 10, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  h2: { fontSize: 16 },
  p: { fontSize: 14, marginTop: 2 },
  section: { fontSize: 18, fontWeight: '700', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 56, height: 56, borderRadius: 4, resizeMode: 'cover', backgroundColor: '#fff' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
