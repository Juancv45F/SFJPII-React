import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clientChat } from '../services/chat';
import { useOffline } from '../services/connectivity';
import { cartMenuOpen, chatbotOpen, mainMenuOpen, useValue } from '../state/app';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { Markdown } from './Markdown';
import { Icon, Spinner } from './ui';

interface ClientMessage { id: number; role: 'user' | 'assistant'; text: string; failed?: boolean; }
let nextMessageId = 1;

const SUGGESTIONS = [
  '¿Cuáles son mis pedidos?',
  '¿Cuál es el estado de mi último pedido?',
  'Muéstrame mis encargos',
  '¿Tienen paracetamol?',
  '¿Cuál es el horario de la farmacia?',
  '¿Cómo puedo contactarlos por WhatsApp?',
];

// Equivalente a app-client-chatbot: botón flotante y panel del asistente para clientes.
export function ClientChatbot() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const offline = useOffline();
  const open = useValue(chatbotOpen);
  const mainOpen = useValue(mainMenuOpen);
  const cartOpen = useValue(cartMenuOpen);
  const menuOpen = mainOpen || cartOpen;
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const conversationId = useRef<string | null>(null);
  const list = useRef<ScrollViewInstance>(null);
  const tint = colors.primary;

  const scroll = () => setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);

  const newConversation = () => {
    conversationId.current = null;
    setMessages([]);
    setDraft('');
    setError('');
    setBusy(false);
  };

  const send = async (suggestion?: string, retry?: ClientMessage) => {
    if (busy || offline) return;
    const text = (retry?.text || suggestion || draft).trim();
    if (!text || text.length > 2000) return;
    const userMessage: ClientMessage = retry || { id: nextMessageId++, role: 'user', text };
    const setFailed = (failed: boolean) => setMessages(m => m.map(x => (x.id === userMessage.id ? { ...x, failed } : x)));
    if (!retry) { setMessages(m => [...m, userMessage]); setDraft(''); } else setFailed(false);
    setBusy(true);
    setError('');
    scroll();
    try {
      const response = await clientChat.send(text, conversationId.current);
      conversationId.current = response.conversation_id || conversationId.current;
      setMessages(m => [...m, { id: nextMessageId++, role: 'assistant', text: response.respuesta }]);
    } catch (err: any) {
      setFailed(true);
      setError(err?.status === 0 ? 'Se perdió la conexión. Puedes reintentar tu mensaje.' : err?.error?.message || 'No pude completar la consulta. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
      scroll();
    }
  };

  return (
    <>
      {!open && !menuOpen ? (
        <Pressable onPress={() => chatbotOpen.set(true)} accessibilityLabel="Abrir asistente de la farmacia"
          style={[styles.launcher, { backgroundColor: colors.primary, bottom: insets.bottom + 72 }]}>
          <Icon name="chatbubble-ellipses-outline" size={28} color="#fff" />
          <View style={[styles.spark, { backgroundColor: colors.warning }]}><Icon name="sparkles-outline" size={12} color="#000" /></View>
        </Pressable>
      ) : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => chatbotOpen.set(false)}>
        <Pressable style={styles.backdrop} onPress={() => chatbotOpen.set(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.panelWrap} pointerEvents="box-none">
          <View style={[styles.panel, { backgroundColor: colors.surface, paddingBottom: insets.bottom, marginTop: insets.top + 40 }]}>
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
              <View style={styles.identity}>
                <View style={styles.assistantIcon}><Icon name="sparkles-outline" size={20} color="#fff" /></View>
                <View>
                  <Text style={styles.headerTitle}>Asistente de la farmacia</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.dot, { backgroundColor: offline ? colors.medium : colors.success }]} />
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5 }}>{offline ? 'Sin conexión' : 'Disponible'}</Text>
                  </View>
                </View>
              </View>
              <Pressable onPress={newConversation} disabled={busy} style={styles.headerBtn} accessibilityLabel="Iniciar una nueva consulta"><Icon name="add-outline" size={24} color="#fff" /></Pressable>
              <Pressable onPress={() => chatbotOpen.set(false)} style={styles.headerBtn} accessibilityLabel="Cerrar asistente"><Icon name="close-outline" size={26} color="#fff" /></Pressable>
            </View>
            {offline ? (
              <Text style={[styles.offline, { backgroundColor: colors.warning }]}>El asistente necesita internet. Puedes cerrar esta ventana y volver cuando recuperes la conexión.</Text>
            ) : null}
            <ScrollView ref={list} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
              {!messages.length ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.welcomeIcon, { backgroundColor: rgba(colors.primaryRgb, 0.12) }]}><Icon name="sparkles-outline" size={26} color={tint} /></View>
                  <Text style={[styles.welcomeTitle, { color: colors.text }]}>Hola, ¿en qué puedo ayudarte?</Text>
                  <Text style={{ color: colors.medium, textAlign: 'center', marginBottom: 12 }}>Puedo consultar productos, tus pedidos, tus encargos y la información de la farmacia.</Text>
                  {SUGGESTIONS.map(s => (
                    <Pressable key={s} disabled={busy || offline} onPress={() => send(s)}
                      style={[styles.suggestion, { borderColor: rgba(colors.primaryRgb, 0.25), backgroundColor: rgba(colors.primaryRgb, 0.05) }]}>
                      <Text style={{ color: colors.text, flex: 1 }}>{s}</Text><Text style={{ color: tint, fontSize: 18 }}>›</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {messages.map((m, i) => (
                <View key={m.id} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ color: colors.medium, fontSize: 12, marginBottom: 3 }}>{m.role === 'user' ? 'Tú' : 'Asistente'}</Text>
                  <View style={[styles.bubble, m.role === 'user'
                    ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: colors.surface2, borderBottomLeftRadius: 4 }]}>
                    {m.role === 'user' ? <Text style={{ color: '#fff', fontSize: 15 }}>{m.text}</Text> : <Markdown text={m.text} />}
                  </View>
                  {m.failed ? (
                    <Pressable onPress={() => send(undefined, m)} disabled={busy || offline}><Text style={{ color: colors.danger, marginTop: 4, fontWeight: '600' }}>Reintentar</Text></Pressable>
                  ) : null}
                </View>
              ))}
              {busy ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Spinner /><Text style={{ color: colors.medium }}>Consultando…</Text></View> : null}
              {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            </ScrollView>
            <View style={[styles.composer, { borderTopColor: rgba(colors.mediumRgb, 0.25) }]}>
              <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>Escribe tu consulta</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  maxLength={2000}
                  editable={!busy && !offline}
                  placeholder="Pregunta por un producto o por tus pedidos"
                  placeholderTextColor={colors.medium}
                  style={[styles.input, { color: colors.text, borderColor: rgba(colors.mediumRgb, 0.4) }]}
                />
                <Pressable onPress={() => send()} disabled={busy || !draft.trim() || offline} accessibilityLabel="Enviar mensaje"
                  style={[styles.send, { backgroundColor: colors.primary }, (busy || !draft.trim() || offline) && { opacity: 0.5 }]}>
                  <Icon name="send-outline" size={20} color="#fff" />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: colors.medium, fontSize: 12 }}>Toca enviar para mandar tu mensaje</Text>
                <Text style={{ color: colors.medium, fontSize: 12 }}>{draft.length}/2000</Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  launcher: {
    position: 'absolute', right: 16, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, zIndex: 900,
  },
  spark: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  panelWrap: { flex: 1, justifyContent: 'flex-end' },
  panel: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  assistantIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerBtn: { padding: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  offline: { padding: 10, textAlign: 'center', fontWeight: '600', color: '#000' },
  welcomeIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  welcomeTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  suggestion: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, padding: 12, marginVertical: 4 },
  bubble: { maxWidth: '88%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  composer: { padding: 12, borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 48, maxHeight: 120, fontSize: 15 },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
