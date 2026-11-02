import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollViewInstance, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Markdown } from '../../components/Markdown';
import { Guard, Screen } from '../../components/Screen';
import { Button, Icon, Spinner } from '../../components/ui';
import { adminChat, ChatChart, Conversation } from '../../services/chat';
import { useOffline } from '../../services/connectivity';
import { currentUser, sessionChanged, storage } from '../../services/storage';
import { rgba } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';
import { showAlert } from '../../ui/overlays';
import { dateTime } from '../../utils/format';
import { features } from '../../config/features';

type Message = { id: number; role: 'user' | 'assistant'; text: string; chart?: ChatChart | null; failed?: boolean };

const SUGGESTIONS = ['¿Qué productos necesitan reabastecimiento?', 'Muéstrame una gráfica del inventario.', '¿Cuáles son las ventas de este mes?', 'Muéstrame una gráfica de pedidos por estado.'];
const CHART_COLORS = ['#2684ff', '#e69900', '#2fa785', '#b775e5', '#e56772', '#46acba'];
const color = (i: number) => CHART_COLORS[i % CHART_COLORS.length];
let nextId = 1;

function validChart(chart: ChatChart | null | undefined): ChatChart | null {
  if (!chart || !Array.isArray(chart.labels) || !Array.isArray(chart.data) || chart.labels.length !== chart.data.length || !chart.data.length) return null;
  if (!chart.data.every(n => Number.isFinite(n) && n >= 0) || !chart.labels.every(l => typeof l === 'string')) return null;
  if (chart.unidad && !['MXN', 'unidades', 'pedidos', 'productos', 'encargos'].includes(chart.unidad)) return null;
  return chart;
}

function formatChartValue(chart: ChatChart, value: number) {
  if (chart.unidad === 'MXN') return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(value);
  const formatted = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(value);
  return chart.unidad ? `${formatted} ${chart.unidad}` : formatted;
}

const identity = () => (storage.get('token') ? String(currentUser()?.id || currentUser()?._id || '') : '');

// Dona equivalente al conic-gradient de la versión web.
function Doughnut({ chart, hole }: { chart: ChatChart; hole: string }) {
  const total = chart.data.reduce((a, b) => a + b, 0);
  const size = 170;
  const r = size / 2;
  if (!total) return <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#d7d8da', alignSelf: 'center' }} />;
  const starts = chart.data.map((_, i) => -Math.PI / 2 + (chart.data.slice(0, i).reduce((a, b) => a + b, 0) / total) * Math.PI * 2);
  const arcs = chart.data.map((n, i) => {
    const angle = (n / total) * Math.PI * 2;
    const start = starts[i];
    const end = start + angle;
    const large = angle > Math.PI ? 1 : 0;
    const d = angle >= Math.PI * 2 - 1e-6
      ? `M ${r} 0 A ${r} ${r} 0 1 1 ${r - 0.01} 0 Z`
      : `M ${r} ${r} L ${r + r * Math.cos(start)} ${r + r * Math.sin(start)} A ${r} ${r} 0 ${large} 1 ${r + r * Math.cos(end)} ${r + r * Math.sin(end)} Z`;
    return <Path key={i} d={d} fill={color(i)} />;
  });
  return (
    <Svg width={size} height={size} style={{ alignSelf: 'center', marginVertical: 12 }}>
      {arcs}
      <Circle cx={r} cy={r} r={53} fill={hole} />
    </Svg>
  );
}

export default function AdminChatRoute() {
  if (!features.aiAssistant) return <Redirect href="/catalogo" />;
  return <Guard roles={['admin', 'super_admin']}><AdminChat /></Guard>;
}

function AdminChat() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isOffline = useOffline();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const requestToken = useRef(0);
  const identityRef = useRef(identity());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const scroll = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const loadHistory = useCallback(async (more = false) => {
    if (!identityRef.current) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await adminChat.list(more ? conversationsRef.current.length : 0);
      setConversations(prev => (more ? [...prev, ...result.items.filter(i => !prev.some(c => c.conversation_id === i.conversation_id))] : result.items));
      setHasMore(result.has_more);
    } catch {
      setHistoryError('No se pudo cargar el historial. Comprueba tu conexión y vuelve a intentar.');
    }
    setHistoryLoading(false);
  }, []);

  const clear = useCallback(() => {
    requestToken.current++;
    setLoadingConversation(false);
    setConversationId(null);
    setBusy(false);
    setMessages([]);
    setDraft('');
    setError('');
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));
  useEffect(() => sessionChanged.subscribe(() => {
    const next = identity();
    if (next === identityRef.current) return;
    clear();
    setConversations([]);
    setHistoryLoading(false);
    setHistoryError('');
    setHasMore(false);
    identityRef.current = next;
    if (next) loadHistory();
  }), [clear, loadHistory]);

  const openConversation = async (id: string) => {
    if (busy || loadingConversation || deletingId || isOffline) return;
    const token = ++requestToken.current;
    setLoadingConversation(true);
    setError('');
    try {
      const result = await adminChat.conversation(id);
      if (token !== requestToken.current) return;
      setConversationId(result.conversation_id);
      setMessages(result.mensajes.filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ id: nextId++, role: m.role, text: m.content, chart: validChart(m.grafica) })));
      setDraft('');
      scroll();
    } catch (err: any) {
      if (token === requestToken.current) setError(err?.error?.message || 'No se pudo abrir la conversación. Inténtalo nuevamente.');
    }
    if (token === requestToken.current) setLoadingConversation(false);
  };

  const confirmDelete = async (chat: Conversation) => {
    if (busy || deletingId || isOffline) return;
    const r = await showAlert({
      header: 'Eliminar conversación',
      message: `¿Quieres eliminar “${chat.titulo}”? Esta acción no se puede deshacer.`,
      buttons: [{ text: 'Conservar', role: 'cancel' }, { text: 'Eliminar', role: 'destructive' }],
    });
    if (r.role !== 'destructive') return;
    setDeletingId(chat.conversation_id);
    setHistoryError('');
    try {
      await adminChat.deleteConversation(chat.conversation_id);
      setConversations(list => list.filter(c => c.conversation_id !== chat.conversation_id));
      if (conversationId === chat.conversation_id) clear();
      if (hasMore) loadHistory();
    } catch (err: any) {
      setHistoryError(err?.error?.message || 'No se pudo eliminar la conversación. Inténtalo nuevamente.');
    }
    setDeletingId(null);
  };

  const send = async (suggestion?: string, retry?: Message) => {
    if (busy || loadingConversation || isOffline) return;
    const text = (retry?.text || suggestion || draft).trim();
    if (!text || text.length > 2000) return;
    const user: Message = retry || { id: nextId++, role: 'user', text };
    if (!retry) {
      setMessages(m => [...m, user]);
      setDraft('');
    } else setMessages(m => m.map(x => (x.id === user.id ? { ...x, failed: false } : x)));
    const token = ++requestToken.current;
    setBusy(true);
    setError('');
    scroll();
    try {
      const response = await adminChat.send(text, conversationId);
      if (token !== requestToken.current) return;
      setConversationId(response.conversation_id || conversationId);
      setMessages(m => [...m, { id: nextId++, role: 'assistant', text: response.respuesta, chart: validChart(response.grafica) }]);
      setBusy(false);
      scroll();
      loadHistory();
    } catch (err: any) {
      if (token !== requestToken.current) return;
      setBusy(false);
      setMessages(m => m.map(x => (x.id === user.id ? { ...x, failed: true } : x)));
      setError(err?.status === 0 ? 'Se perdió la conexión. Tu pregunta sigue aquí para reintentar.' : err?.error?.message || 'No se pudo completar la consulta. Inténtalo de nuevo.');
      scroll();
    }
  };

  const accent = colors.primary;
  const border = rgba(colors.mediumRgb, 0.2);
  const twoCols = width > 600;

  const composer = (
    <View style={[styles.composer, { backgroundColor: colors.background, borderTopColor: border, paddingBottom: 12 }]}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Tu consulta</Text>
      <View style={[styles.inputRow, { borderColor: rgba(colors.mediumRgb, 0.35), backgroundColor: colors.card }]}>
        <TextInput value={draft} onChangeText={setDraft} multiline maxLength={2000} editable={!busy && !loadingConversation}
          placeholder="Por ejemplo: ¿qué productos tienen pocas existencias?" placeholderTextColor={colors.medium}
          style={{ flex: 1, color: colors.text, maxHeight: 160, minHeight: 44, padding: 6, lineHeight: 21, textAlignVertical: 'top' }} />
        <Button iconOnly="send-outline" onPress={() => send()} disabled={busy || loadingConversation || !draft.trim() || isOffline} accessibilityLabel="Enviar consulta" />
      </View>
      <View style={styles.help}>
        <Text style={{ color: colors.medium, fontSize: 11.5, flex: 1 }}>
          {isOffline ? 'Necesitas conexión para consultar al asistente.' : 'Continúa esta conversación o inicia una nueva consulta.'}
        </Text>
        <Text style={{ color: colors.medium, fontSize: 11.5 }}>{draft.length}/2000</Text>
      </View>
    </View>
  );

  return (
    <Screen title="Asistente de administración" showCart={false} padding={false} scrollRef={scrollRef} footer={composer}>
      <View style={[styles.history, { borderBottomColor: border }]}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Mis conversaciones</Text>
        <Button expand fill="outline" onPress={clear} disabled={busy}>Nueva consulta</Button>
        {historyLoading ? <Text style={[styles.small, { color: colors.text }]}>Cargando historial…</Text> : null}
        {!historyLoading && !historyError && !conversations.length ? (
          <Text style={[styles.small, { color: colors.text }]}>Tus consultas aparecerán aquí al enviar el primer mensaje.</Text>
        ) : null}
        {historyError ? (
          <View accessibilityRole="alert">
            <Text style={[styles.small, { color: colors.text }]}>{historyError}</Text>
            <View style={{ alignItems: 'flex-start' }}><Button size="small" fill="clear" onPress={() => loadHistory()}>Reintentar historial</Button></View>
          </View>
        ) : null}
        <View style={{ gap: 8, marginTop: 14 }}>
          {conversations.map(chat => {
            const selected = conversationId === chat.conversation_id;
            return (
              <View key={chat.conversation_id} style={[styles.historyItem, {
                backgroundColor: selected ? rgba(colors.primaryRgb, 0.12) : colors.card, borderColor: selected ? colors.primary : 'transparent',
              }]}>
                <Pressable style={{ flex: 1, padding: 12 }} onPress={() => openConversation(chat.conversation_id)}
                  disabled={busy || deletingId === chat.conversation_id || isOffline} accessibilityState={{ selected }}>
                  <Text style={{ color: colors.text, lineHeight: 20 }}>{chat.titulo}</Text>
                  <Text style={{ color: colors.text, opacity: 0.7, marginTop: 6, fontSize: 12 }}>{dateTime(chat.updatedAt)}</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(chat)} disabled={busy || loadingConversation || deletingId !== null || isOffline}
                  style={{ width: 42, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }} accessibilityLabel={`Eliminar conversación ${chat.titulo}`}>
                  {deletingId === chat.conversation_id ? <Spinner color={colors.danger} /> : <Icon name="trash-outline" size={20} color={colors.danger} />}
                </Pressable>
              </View>
            );
          })}
        </View>
        {hasMore ? (
          <View style={{ alignItems: 'flex-start' }}>
            <Button fill="clear" size="small" onPress={() => loadHistory(true)} disabled={historyLoading}>Ver más conversaciones</Button>
          </View>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 14, paddingVertical: 22 }}>
        <Text style={[styles.eyebrow, { color: accent }]}>ASISTENTE DE LA FARMACIA</Text>
        <Text style={[styles.h1, { color: colors.text }]}>Tu información, más clara.</Text>
        <Text style={{ color: colors.medium, lineHeight: 22 }}>Consulta ventas, inventario y pedidos en un solo lugar.</Text>
        <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
          <Button fill="outline" icon="add-outline" onPress={clear} disabled={busy || (!messages.length && !loadingConversation)}>Nueva consulta</Button>
        </View>

        {loadingConversation ? <Text style={{ color: colors.text, marginTop: 16 }}>Abriendo conversación…</Text> : null}

        {!messages.length && !loadingConversation ? (
          <View style={{ paddingTop: 24, paddingBottom: 22, alignItems: 'center' }}>
            <View style={[styles.mark, { backgroundColor: rgba(colors.primaryRgb, 0.1) }]}><Icon name="sparkles-outline" size={30} color={accent} /></View>
            <Text style={[styles.h2, { color: colors.text }]}>¿Qué necesitas revisar hoy?</Text>
            <Text style={{ color: colors.medium, textAlign: 'center' }}>Pregunta sobre los datos de tu farmacia o elige una consulta.</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <Pressable key={s} onPress={() => send(s)} disabled={isOffline}
                  style={[styles.suggestion, { width: twoCols ? '48.5%' : '100%', borderColor: rgba(colors.mediumRgb, 0.25), backgroundColor: colors.card, opacity: isOffline ? 0.5 : 1 }]}>
                  <Text style={{ color: colors.text, flex: 1, lineHeight: 21 }}>{s}</Text>
                  <Text style={{ color: accent, fontSize: 20 }}>↗</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ gap: 24, paddingTop: 26 }}>
          {messages.map(m => {
            const isUser = m.role === 'user';
            return (
              <View key={m.id} style={{ maxWidth: '96%', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.speaker, { color: colors.medium, textAlign: isUser ? 'right' : 'left' }]}>{isUser ? 'Tú' : 'Asistente'}</Text>
                <View style={[styles.bubble, isUser
                  ? { backgroundColor: rgba(colors.primaryRgb, 0.09), borderColor: 'transparent', borderBottomRightRadius: 4 }
                  : { backgroundColor: colors.card, borderColor: border, borderBottomLeftRadius: 4 }]}>
                  <Markdown text={m.text} color={colors.text} />
                  {m.chart ? (
                    <View style={[styles.chart, { borderTopColor: border }]}>
                      <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 18 }}>{m.chart.titulo}</Text>
                      {m.chart.tipo === 'doughnut' ? <Doughnut chart={m.chart} hole={colors.card} /> : null}
                      {m.chart.tipo === 'bar' ? (
                        <View style={{ gap: 12 }}>
                          {m.chart.labels.map((label, i) => {
                            const max = Math.max(...m.chart!.data, 1);
                            return (
                              <View key={i}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                                  <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{label}</Text>
                                  <Text style={{ color: colors.text, fontSize: 13 }}>{formatChartValue(m.chart!, m.chart!.data[i])}</Text>
                                </View>
                                <View style={[styles.track, { backgroundColor: rgba(colors.mediumRgb, 0.12) }]}>
                                  <View style={{ height: '100%', borderRadius: 4, width: `${(m.chart!.data[i] / max) * 100}%`, backgroundColor: color(i) }} />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                      <View style={{ marginTop: 16 }}>
                        <View style={[styles.tr, { borderBottomColor: rgba(colors.mediumRgb, 0.18) }]}>
                          <Text style={[styles.th, { color: colors.text }]}>Concepto</Text>
                          <Text style={[styles.th, { color: colors.text, textAlign: 'right' }]}>Valor</Text>
                        </View>
                        {m.chart.labels.map((label, i) => (
                          <View key={i} style={[styles.tr, { borderBottomColor: rgba(colors.mediumRgb, 0.18) }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color(i) }} />
                              <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{label}</Text>
                            </View>
                            <Text style={{ color: colors.text, fontSize: 13, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{formatChartValue(m.chart!, m.chart!.data[i])}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
                {m.failed ? (
                  <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <Button fill="clear" size="small" onPress={() => send(undefined, m)} disabled={busy || isOffline}>Reintentar consulta</Button>
                  </View>
                ) : null}
              </View>
            );
          })}
          {busy ? (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }} accessibilityRole="progressbar">
              <Spinner color={accent} />
              <Text style={{ color: accent }}>Consultando información de la farmacia…</Text>
            </View>
          ) : null}
        </View>
        {error ? <Text style={[styles.error, { color: colors.danger, backgroundColor: rgba(colors.dangerRgb, 0.1) }]} accessibilityRole="alert">{error}</Text> : null}
        <View style={{ height: insets.bottom }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  history: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  small: { fontSize: 13.5, lineHeight: 20, marginTop: 10 },
  historyItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, fontWeight: '800' },
  h1: { fontSize: 24, fontWeight: '800', marginVertical: 10 },
  h2: { fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  mark: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 28, width: '100%', maxWidth: 700 },
  suggestion: { flexDirection: 'row', gap: 18, alignItems: 'center', padding: 15, borderWidth: 1, borderRadius: 16 },
  speaker: { marginHorizontal: 6, marginBottom: 8, fontSize: 13, fontWeight: '600' },
  bubble: { padding: 14, borderWidth: 1, borderRadius: 18 },
  chart: { marginTop: 22, borderTopWidth: 1, paddingTop: 18 },
  track: { height: 14, borderRadius: 4, marginVertical: 5, overflow: 'hidden' },
  tr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, gap: 8 },
  th: { fontWeight: '700', fontSize: 13 },
  error: { padding: 14, borderRadius: 12, marginTop: 16, overflow: 'hidden' },
  composer: { paddingHorizontal: 12, paddingTop: 14, borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', borderWidth: 1, borderRadius: 16, padding: 8 },
  help: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
});
