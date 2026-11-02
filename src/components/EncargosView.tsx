import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Encargo, encargoService, ESTADOS_ENCARGO, EstadoEncargo } from '../services/encargos';
import { ws } from '../services/websocket';
import { useSession } from '../state/app';
import { rgba } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { dateTime, money } from '../utils/format';
import { canCancelEncargo, formatEstimatedArrival } from '../utils/encargoSchedule';
import { LOGO } from './Navbar';
import { Screen } from './Screen';
import { Button, Field, Icon, Select, Spinner } from './ui';

const STATES = Object.keys(ESTADOS_ENCARGO) as EstadoEncargo[];

// Port de EncargosPage (rutas /encargos, /admin/encargos y /encargos/detalle/:id).
export function EncargosView({ detailId }: { detailId?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { role } = useSession();
  const staff = ['admin', 'editor', 'super_admin'].includes(role);
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [filter, setFilter] = useState<'' | EstadoEncargo>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (detailId) setEncargos([(await encargoService.detalle(detailId)).data]);
      else setEncargos((await encargoService.listar()).data || []);
    } catch (err: any) {
      setError(err?.error?.message || 'No se pudieron cargar los encargos.');
    }
    setLoading(false);
  }, [detailId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const off1 = ws.onNotificaciones(n => { if (n?.tipo === 'encargo') load(); });
    const off2 = ws.onEncargos(() => load());
    const off3 = ws.connected.subscribe(() => load());
    return () => { off1(); off2(); off3(); };
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return encargos.filter(e => (!filter || e.estado === filter)
      && `${e._id} ${e.userId?.nombre || ''} ${e.userId?.apellido || ''} ${e.items.map(i => i.nombre).join(' ')}`.toLowerCase().includes(term));
  }, [encargos, filter, search]);

  const canCancel = (e: Encargo) => ['pendiente', 'disponible'].includes(e.estado) && (staff || canCancelEncargo(e.createdAt));
  const cancellationMessage = (e: Encargo) => {
    if (staff || !['pendiente', 'disponible'].includes(e.estado)) return '';
    return canCancel(e) ? 'Puedes cancelar este encargo hasta las 9:00 p. m. de hoy.' : 'El plazo para cancelar terminó a las 9:00 p. m. del día del encargo.';
  };
  const nextState = (e: Encargo): EstadoEncargo | null => {
    if (e.estado === 'pendiente') return 'disponible';
    if (e.estado === 'disponible') return e.tipo_entrega === 'domicilio' ? 'en_camino' : 'entregado';
    if (e.estado === 'en_camino') return 'entregado';
    return null;
  };
  const nextLabel = (e: Encargo) => {
    const n = nextState(e);
    return n === 'disponible' ? 'Marcar que ya llegó' : n === 'en_camino' ? 'Enviar a domicilio' : 'Marcar entregado';
  };

  const update = async (e: Encargo, estado: EstadoEncargo | null) => {
    if (!estado || busy) return;
    if (estado === 'cancelado' && !staff && !canCancel(e)) {
      setCancelId(null);
      setError('El plazo para cancelar terminó a las 9:00 p. m. del día del encargo.');
      return;
    }
    if (estado === 'cancelado' && (!reason.trim() || reason.trim().length > 500)) return;
    setBusy(true);
    setError('');
    try {
      const res = await encargoService.actualizar(e._id, estado, estado === 'cancelado' ? reason.trim() : undefined);
      setEncargos(list => list.map(it => (it._id === e._id ? res.data : it)));
      setCancelId(null);
      setReason('');
    } catch (err: any) {
      setError(err?.error?.message || 'No se pudo actualizar el encargo.');
    }
    setBusy(false);
  };

  const accent = colors.primary;
  const successShade = colors.success;
  const warningShade = colors.warning;
  const title = staff ? 'Gestión de encargos' : 'Mis encargos';

  return (
    <Screen title={title} contentStyle={{ paddingHorizontal: 14, paddingTop: 20 }}>
      <Text style={[styles.eyebrow, { color: accent }]}>{staff ? 'ATENCIÓN EN FARMACIA' : 'SEGUIMIENTO'}</Text>
      <Text style={[styles.h1, { color: colors.text }]}>{detailId ? 'Detalle del encargo' : title}</Text>
      <Text style={{ color: colors.text, lineHeight: 21 }}>
        {staff ? 'Confirma la llegada y da seguimiento a cada entrega.' : 'Consulta si tus medicamentos ya llegaron y cómo los recibirás.'}
      </Text>
      <Button fill="outline" onPress={load} disabled={loading || busy} style={{ marginTop: 14 }}>Actualizar</Button>
      {detailId ? (
        <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
          <Button fill="clear" onPress={() => router.replace(staff ? '/admin/encargos' : '/encargos')}>Volver a encargos</Button>
        </View>
      ) : (
        <View style={{ marginVertical: 20, gap: 10 }}>
          <View style={[styles.searchbar, { backgroundColor: colors.surface }]}>
            <Icon name="search-outline" size={20} color={colors.medium} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Buscar medicamento o folio" accessibilityLabel="Buscar encargos"
              placeholderTextColor={colors.medium} style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 }} />
          </View>
          <Select label="Estado" value={filter} onChange={setFilter}
            options={[{ value: '' as const, label: 'Todos' }, ...STATES.map(s => ({ value: s, label: ESTADOS_ENCARGO[s] }))]} />
        </View>
      )}

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }} accessibilityRole="alert">{error}</Text> : null}
      {loading ? <View style={styles.empty}><Spinner size="large" color={accent} /><Text style={{ color: colors.text, marginTop: 12 }}>Cargando encargos…</Text></View> : null}
      {!loading && !error && !filtered.length ? (
        <View style={styles.empty}>
          <Text style={[styles.h2, { color: colors.text }]}>No hay encargos para mostrar</Text>
          <Text style={{ color: colors.text, marginVertical: 8 }}>Los encargos confirmados aparecerán aquí.</Text>
          {!staff ? <Button onPress={() => router.push('/ofertas')}>Ver medicamentos por encargo</Button> : null}
        </View>
      ) : null}

      {!loading ? filtered.map(e => {
        const historyOpen = !!detailId || !!openHistory[e._id];
        const msg = cancellationMessage(e);
        return (
          <View key={e._id} style={[styles.order, { backgroundColor: colors.card, borderColor: rgba(colors.mediumRgb, 0.22) }]}>
            <View style={{ gap: 10 }}>
              <View>
                <Text style={[styles.h2, { color: colors.text }]}>Encargo #{e._id.slice(-8).toUpperCase()}</Text>
                <Text style={{ color: colors.medium, fontSize: 13.5 }}>{dateTime(e.createdAt)}</Text>
              </View>
              <Text style={[styles.status, {
                backgroundColor: rgba(colors.primaryRgb, 0.1),
                color: e.estado === 'disponible' ? successShade : e.estado === 'cancelado' ? colors.danger : accent,
              }]}>{ESTADOS_ENCARGO[e.estado]}</Text>
            </View>
            {staff ? (
              <Text style={[styles.p, { color: colors.text }]}>
                <Text style={styles.b}>Cliente:</Text> {e.userId?.nombre} {e.userId?.apellido} · {e.userId?.email}
              </Text>
            ) : null}
            {e.fecha_estimada_llegada && e.estado === 'pendiente' ? (
              <Text style={[styles.note, { color: accent, backgroundColor: rgba(colors.primaryRgb, 0.08) }]}>
                <Text style={styles.b}>Llegada estimada:</Text> {formatEstimatedArrival(e.fecha_estimada_llegada)}
              </Text>
            ) : null}
            {msg ? <Text style={[styles.limit, { color: warningShade, backgroundColor: rgba(colors.warningRgb, 0.12) }]}>{msg}</Text> : null}
            {e.estado === 'disponible' ? (
              <Text style={[styles.p, { color: successShade }]}>
                {e.tipo_entrega === 'recoger' ? 'Tu medicamento ya está aquí. Puedes recogerlo en farmacia.' : 'Tu medicamento ya llegó. Está pendiente de salir a tu domicilio.'}
              </Text>
            ) : null}
            <View style={{ marginVertical: 8 }}>
              {e.items.map((item, i) => (
                <View key={i} style={styles.item}>
                  <Image source={item.imagen ? { uri: item.imagen } : LOGO} style={styles.img} accessibilityLabel={item.nombre} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{item.nombre}</Text>
                    <Text style={{ color: colors.text, fontSize: 14, marginTop: 6 }}>{item.cantidad} × {money(item.precio_unitario)}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={[styles.box, { backgroundColor: rgba(colors.primaryRgb, 0.05) }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{e.tipo_entrega === 'recoger' ? 'Recoger en farmacia' : 'Entrega a domicilio'}</Text>
              {e.tipo_entrega === 'domicilio' && e.ubicacion ? (
                <Text style={{ color: colors.text, marginTop: 8 }}>
                  {e.ubicacion.alias}: {e.ubicacion.calle} #{e.ubicacion.numero}, CP {e.ubicacion.codigo_postal}
                  {e.ubicacion.descripcion ? `\n${e.ubicacion.descripcion}` : ''}
                </Text>
              ) : null}
            </View>
            <View style={[styles.total, { borderTopColor: rgba(colors.mediumRgb, 0.2) }]}>
              <Text style={{ color: colors.text }}>Total estimado</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{money(e.total_estimado)}</Text>
            </View>
            {e.motivo_cancelacion ? (
              <Text style={[styles.p, { color: colors.text }]}><Text style={styles.b}>Motivo de cancelación:</Text> {e.motivo_cancelacion}</Text>
            ) : null}
            <Pressable onPress={() => !detailId && setOpenHistory(h => ({ ...h, [e._id]: !h[e._id] }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}>
              <Icon name={historyOpen ? 'caret-down' : 'caret-forward'} size={14} color={accent} />
              <Text style={{ color: accent }}>Historial de estados</Text>
            </Pressable>
            {historyOpen ? (
              <View style={{ paddingLeft: 22, marginTop: 4 }}>
                {(e.historial || []).map((ev, i) => (
                  <Text key={i} style={{ color: colors.text, marginVertical: 6 }}>{i + 1}. {ESTADOS_ENCARGO[ev.estado]} · {dateTime(ev.fecha)}</Text>
                ))}
              </View>
            ) : null}
            <View style={styles.actions}>
              {!detailId ? <Button fill="clear" onPress={() => router.push(`/encargos/detalle/${e._id}`)}>Ver detalle</Button> : null}
              {staff && nextState(e) ? <Button disabled={busy} onPress={() => update(e, nextState(e))}>{nextLabel(e)}</Button> : null}
              {canCancel(e) && cancelId !== e._id ? (
                <Button fill="outline" color="danger" disabled={busy} onPress={() => { setCancelId(e._id); setReason(''); setError(''); }}>Cancelar encargo</Button>
              ) : null}
            </View>
            {cancelId === e._id ? (
              <View style={[styles.box, { backgroundColor: rgba(colors.primaryRgb, 0.05), marginTop: 12 }]}>
                <Field label="Motivo de cancelación" value={reason} onChangeText={setReason} maxLength={500} multiline editable={!busy}
                  placeholder="Cuéntanos por qué deseas cancelarlo" />
                <Text style={{ color: colors.medium, fontSize: 12, textAlign: 'right' }}>{reason.length} / 500</Text>
                <View style={[styles.actions, { marginTop: 8 }]}>
                  <Button color="danger" disabled={busy || !reason.trim()} onPress={() => update(e, 'cancelado')}>Confirmar cancelación</Button>
                  <Button fill="clear" disabled={busy} onPress={() => setCancelId(null)}>Conservar encargo</Button>
                </View>
              </View>
            ) : null}
          </View>
        );
      }) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 12, letterSpacing: 1, fontWeight: '700' },
  h1: { fontSize: 26, fontWeight: '800', marginTop: 8, marginBottom: 8 },
  h2: { fontSize: 17.5, fontWeight: '700' },
  p: { marginTop: 12, lineHeight: 20 },
  b: { fontWeight: '700' },
  searchbar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 15 },
  order: {
    borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 22, shadowOffset: { width: 0, height: 6 },
  },
  status: { alignSelf: 'flex-start', borderRadius: 25, paddingVertical: 8, paddingHorizontal: 14, fontSize: 13, fontWeight: '700', overflow: 'hidden' },
  note: { marginVertical: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  limit: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  img: { width: 54, height: 54, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#fff' },
  box: { padding: 16, borderRadius: 12 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 15, marginTop: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, alignItems: 'center' },
});
