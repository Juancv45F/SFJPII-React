import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { LOGO } from '../../components/Navbar';
import { Guard, Screen } from '../../components/Screen';
import { Button, Spinner } from '../../components/ui';
import { getUbicaciones } from '../../services/auth';
import { cart, useCartItems } from '../../services/cart';
import { offline } from '../../services/connectivity';
import { encargoService } from '../../services/encargos';
import { currentUser, storage } from '../../services/storage';
import { rgba } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';
import { money } from '../../utils/format';
import { canCreateEncargo, estimatedArrivalDate, formatEstimatedArrival } from '../../utils/encargoSchedule';

export default function ConfirmarEncargoRoute() {
  return <Guard roles={['cliente']}><ConfirmarEncargo /></Guard>;
}

function RadioItem({ selected, disabled, onPress, children }: { selected: boolean; disabled?: boolean; onPress: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  const accent = colors.primary;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected, disabled }}
      style={[styles.radioRow, { borderBottomColor: rgba(colors.mediumRgb, 0.25), opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.radio, { borderColor: selected ? accent : colors.medium }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: accent }]} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

function ConfirmarEncargo() {
  const { colors } = useTheme();
  const router = useRouter();
  useCartItems();
  const items = cart.getCartItems('encargo');
  const total = cart.getTotalPrice('encargo');
  const canOrderNow = canCreateEncargo();
  const [tipo, setTipo] = useState<'recoger' | 'domicilio'>('recoger');
  const [ubicacionId, setUbicacionId] = useState('');
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  const loadLocations = useCallback(async () => {
    setLoadingLocations(true);
    setLocationError('');
    try {
      const res: any = await getUbicaciones();
      const list = res?.data || [];
      setUbicaciones(list);
      setUbicacionId(id => (list.some((u: any) => u._id === id) ? id : list[0]?._id || ''));
    } catch {
      setLocationError('No se pudieron cargar tus direcciones.');
    }
    setLoadingLocations(false);
  }, []);

  useFocusEffect(useCallback(() => { loadLocations(); }, [loadLocations]));

  const confirm = async () => {
    if (offline.value) return setError('Recupera la conexión para confirmar. Tus medicamentos siguen guardados en el carrito.');
    if (!canCreateEncargo()) return setError('Los encargos solo se reciben antes de las 10:00 p. m. Inténtalo mañana.');
    if (busy || !items.length || (tipo === 'domicilio' && !ubicacionId)) return;
    setBusy(true);
    setError('');
    const payload = {
      productos: items.map(it => ({ id: String(it.producto.id || it.producto._id), cantidad: it.cantidad })),
      tipo_entrega: tipo,
      ...(tipo === 'domicilio' ? { ubicacionId } : {}),
    };
    const user = currentUser();
    const key = `encargo_request_${user?.id || user?._id}`;
    const fingerprint = JSON.stringify(payload);
    const previous = storage.get(key);
    // Conservar la clave tras una caída de red permite reintentar sin duplicar el encargo.
    const solicitudId = previous?.fingerprint === fingerprint ? previous.id : Crypto.randomUUID();
    storage.set(key, { id: solicitudId, fingerprint });
    try {
      const res = await encargoService.crear({ ...payload, solicitudId });
      cart.clearCart('encargo');
      storage.remove(key);
      router.replace(`/encargos/detalle/${res.data._id}`);
    } catch (err: any) {
      setError(err?.error?.message || 'No pudimos confirmar el encargo. Tus medicamentos siguen en el carrito; puedes reintentar.');
    } finally {
      setBusy(false);
    }
  };

  const accent = colors.primary;
  const warningShade = colors.warning;
  const card = [styles.order, { backgroundColor: colors.card, borderColor: rgba(colors.mediumRgb, 0.22) }];

  return (
    <Screen title="Confirmar encargo" backButton hrefBtn="/ofertas" showCart={!busy} contentStyle={{ paddingHorizontal: 14, paddingTop: 20 }}>
      <Text style={[styles.eyebrow, { color: accent }]}>ÚLTIMO PASO</Text>
      <Text style={[styles.h1, { color: colors.text }]}>¿Cómo recibirás tus medicamentos?</Text>
      <Text style={{ color: colors.text }}>La farmacia confirmará cuándo llegaron. Esta solicitud no realiza un cobro.</Text>
      <View style={[styles.note, canOrderNow ? { backgroundColor: rgba(colors.primaryRgb, 0.08) } : { backgroundColor: rgba(colors.warningRgb, 0.12) }]}>
        <Text style={{ color: canOrderNow ? accent : warningShade, fontWeight: '700' }}>
          {canOrderNow ? 'Puedes confirmar tu encargo ahora.' : 'Encargos cerrados por hoy.'}
        </Text>
        <Text style={{ color: canOrderNow ? accent : warningShade, marginTop: 6 }}>Recibimos encargos únicamente antes de las 10:00 p. m.</Text>
        {canOrderNow ? (
          <Text style={{ color: accent, marginTop: 6 }}>
            Llegada estimada: {formatEstimatedArrival(estimatedArrivalDate())}. Los encargos del sábado se estiman para el lunes.
          </Text>
        ) : null}
      </View>
      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }} accessibilityRole="alert">{error}</Text> : null}

      {!items.length ? (
        <View style={{ alignItems: 'center', paddingVertical: 50 }}>
          <Text style={[styles.h2, { color: colors.text, marginBottom: 12 }]}>No tienes medicamentos por encargar</Text>
          <Button onPress={() => router.push('/ofertas')}>Explorar medicamentos</Button>
        </View>
      ) : (
        <>
          <View style={card}>
            <Text style={[styles.h2, { color: colors.text }]}>Resumen del encargo</Text>
            {items.map(item => (
              <View key={String(item.producto.id || item.producto._id)} style={styles.item}>
                <Image source={item.producto.imagen ? { uri: item.producto.imagen } : LOGO} style={styles.img} accessibilityLabel={item.producto.nombre} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{item.producto.nombre}</Text>
                  <Text style={{ color: colors.text, fontSize: 14, marginTop: 6 }}>Cantidad: {item.cantidad}</Text>
                </View>
              </View>
            ))}
            <View style={[styles.total, { borderTopColor: rgba(colors.mediumRgb, 0.2) }]}>
              <Text style={{ color: colors.text }}>Total estimado</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{money(total)}</Text>
            </View>
          </View>

          <View style={[card, { marginTop: 16 }]}>
            <Text style={[styles.h2, { color: colors.text }]}>Forma de entrega</Text>
            <RadioItem selected={tipo === 'recoger'} disabled={busy} onPress={() => setTipo('recoger')}>
              <Text style={{ color: colors.text, fontSize: 16 }}>Voy a recoger en farmacia</Text>
            </RadioItem>
            <RadioItem selected={tipo === 'domicilio'} disabled={busy} onPress={() => setTipo('domicilio')}>
              <Text style={{ color: colors.text, fontSize: 16 }}>Llévenlo a mi domicilio</Text>
            </RadioItem>
            {tipo === 'domicilio' ? (
              <View style={{ marginTop: 16 }}>
                {loadingLocations ? <Spinner color={accent} /> : null}
                {locationError ? (
                  <View accessibilityRole="alert">
                    <Text style={{ color: colors.text }}>{locationError}</Text>
                    <View style={{ alignItems: 'flex-start' }}><Button fill="clear" onPress={loadLocations}>Reintentar</Button></View>
                  </View>
                ) : null}
                {!loadingLocations && !locationError && !ubicaciones.length ? (
                  <Text style={{ color: colors.text }}>Guarda una dirección para recibir el encargo a domicilio.</Text>
                ) : null}
                {ubicaciones.map(u => (
                  <RadioItem key={u._id} selected={ubicacionId === u._id} disabled={busy} onPress={() => setUbicacionId(u._id)}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>{u.alias}</Text>
                    <Text style={{ color: colors.medium, fontSize: 14, marginTop: 2 }}>{u.calle} #{u.numero}, CP {u.codigo_postal}</Text>
                  </RadioItem>
                ))}
                <View style={{ alignItems: 'flex-start' }}>
                  <Button fill="clear" disabled={busy} onPress={() => router.push('/configuracion')}>Administrar mis direcciones</Button>
                </View>
              </View>
            ) : null}
          </View>

          <Button expand onPress={confirm} loading={busy} style={{ marginTop: 16 }}
            disabled={busy || !canOrderNow || (tipo === 'domicilio' && (!ubicacionId || loadingLocations || !!locationError))}>
            {busy ? 'Guardando encargo…' : 'Confirmar encargo'}
          </Button>
          <Text style={{ color: colors.text, marginTop: 12 }}>Los productos de “Comprar ahora” permanecerán en tu carrito.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 12, letterSpacing: 1, fontWeight: '700' },
  h1: { fontSize: 26, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  h2: { fontSize: 17.5, fontWeight: '700', marginBottom: 8 },
  note: { marginVertical: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 },
  order: {
    borderWidth: 1, borderRadius: 18, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 22, shadowOffset: { width: 0, height: 6 },
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  img: { width: 54, height: 54, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#fff' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 15, marginTop: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
