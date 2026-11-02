import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../services/connectivity';
import { notifications } from '../services/notifications';
import { pendingOrders } from '../services/orders';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { showAlert } from '../ui/overlays';
import { money, short, shortTime } from '../utils/format';
import { Button, Icon } from './ui';

// Popover de la campana: ClientNotificationsComponent (cliente) o NotificationsPopoverComponent (personal).
export function NotificationsPopover({ visible, onClose, role }: { visible: boolean; onClose: () => void; role: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.popover, { top: insets.top + 56, backgroundColor: colors.surface }]}>
          {role === 'cliente' ? <ClientNotifications onClose={onClose} /> : <PendingOrders onClose={onClose} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ClientNotifications({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const items = useStore(notifications.items);
  const error = useStore(notifications.error);
  useEffect(() => { notifications.refresh(); }, []);

  const open = (n: any) => {
    notifications.read(n);
    onClose();
    router.push(n.tipo === 'encargo' ? `/encargos/detalle/${n.referenciaId}` : `/pedidos/detalle/${n.referenciaId}`);
  };
  const confirmRemoveAll = () => showAlert({
    header: 'Eliminar notificaciones',
    message: '¿Quieres eliminar todas tus notificaciones? Esta acción no se puede deshacer.',
    buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive', handler: () => { notifications.removeAll(); } }],
  });

  return (
    <ScrollView>
      <View style={{ padding: 16 }}>
        <Text style={[styles.h2, { color: colors.text }]}>Mis notificaciones</Text>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginLeft: -12 }}>
          <Button fill="clear" onPress={() => notifications.refresh()}>Actualizar</Button>
          {items.length ? <Button fill="clear" color="danger" onPress={confirmRemoveAll}>Eliminar todas</Button> : null}
        </View>
        {!items.length ? <Text style={{ color: colors.text }}>Todavía no tienes notificaciones.</Text> : null}
      </View>
      {items.map(n => (
        <View key={n._id} style={[styles.item, { borderBottomColor: rgba(colors.mediumRgb, 0.25) }]}>
          <Pressable style={{ flex: 1, paddingRight: 4 }} onPress={() => open(n)} accessibilityRole="button">
            <Text style={{ color: colors.text, fontWeight: '700' }}>{n.leida ? '' : '● '}{n.titulo}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{n.mensaje}</Text>
            <Text style={{ color: colors.medium, fontSize: 12, marginTop: 2 }}>{short(n.createdAt)}</Text>
          </Pressable>
          <Button fill="clear" color="danger" iconOnly="trash-outline" accessibilityLabel={`Eliminar ${n.titulo}`} onPress={() => notifications.remove(n)} />
        </View>
      ))}
    </ScrollView>
  );
}

function PendingOrders({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  const router = useRouter();
  const pedidos = useStore(pendingOrders);
  const tint = colors.primary;
  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 10 }}>Pedidos Pendientes</Text>
      {pedidos.length ? pedidos.map(p => (
        <Pressable key={p.id} onPress={() => { onClose(); router.push(`/pedidos/detalle/${p.id}`); }}
          style={({ pressed }) => [styles.item, { borderBottomColor: rgba(colors.mediumRgb, 0.25) }, pressed && { backgroundColor: rgba(colors.primaryRgb, 0.08) }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.row}><Icon name="location" size={16} color={tint} /><Text style={[styles.small, { color: colors.medium }]}>{p.Ubicacion?.calle} #{p.Ubicacion?.numero} ({p.Ubicacion?.alias})</Text></View>
            <View style={styles.row}><Icon name="medkit" size={16} color={tint} /><Text style={[styles.small, { color: colors.medium }]}>{(p.DetallePedidos || []).map((d: any) => d.Producto?.nombre).join(', ')}</Text></View>
            <View style={styles.row}><Icon name="cash" size={16} color={colors.success} /><Text style={{ color: colors.text, fontWeight: 'bold' }}>Total: {money(p.total)}</Text></View>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 5 }}>{shortTime(p.createdAt)}</Text>
          </View>
        </Pressable>
      )) : (
        <Text style={{ color: colors.text, textAlign: 'center', padding: 16 }}>No tienes pedidos pendientes por entregar.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  popover: { position: 'absolute', right: 8, width: 320, maxWidth: '94%', maxHeight: '70%', borderRadius: 4, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10 },
  h2: { fontSize: 20, fontWeight: '600', marginBottom: 7 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 4 },
  small: { fontSize: 13.5, flex: 1 },
});
