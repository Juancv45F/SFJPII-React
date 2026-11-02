import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useValue } from '../state/app';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { AlertButton, AlertEntry, alerts, closeAlert, dismissToast, loadings, ToastEntry, toasts } from '../ui/overlays';
import { colorOf, contrastOf, Icon } from './ui';

function ToastView({ toast, index }: { toast: ToastEntry; index: number }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => dismissToast(toast.id));
    }, toast.duration ?? 2500);
    return () => clearTimeout(t);
  }, [opacity, toast]);
  const bg = toast.color ? colorOf(colors, toast.color) : colors.text;
  const fg = toast.color ? contrastOf(colors, toast.color) : colors.background;
  const top = toast.position === 'top';
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.toastWrap, top ? { top: insets.top + 8 + index * 70 } : { bottom: insets.bottom + 70 + index * 70 }, { opacity }]}
    >
      <View style={[styles.toast, { backgroundColor: bg }]}>
        {toast.icon ? <Icon name={toast.icon} size={22} color={fg} style={{ marginRight: 10 }} /> : null}
        <View style={{ flex: 1 }}>
          {toast.header ? <Text style={[styles.toastHeader, { color: fg }]}>{toast.header}</Text> : null}
          <Text style={{ color: fg, fontSize: 14 }}>{toast.message}</Text>
        </View>
        {toast.buttons?.map((b, i) => (
          <Pressable key={i} hitSlop={8} onPress={() => { b.handler?.(); dismissToast(toast.id); }} style={{ marginLeft: 12 }}>
            {b.icon ? <Icon name={b.icon} size={20} color={fg} /> : <Text style={{ color: fg, fontWeight: '700' }}>{b.text}</Text>}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

function AlertView({ alert }: { alert: AlertEntry }) {
  const { colors } = useTheme();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((alert.inputs || []).map(i => [i.name, i.value || ''])));
  const buttons: AlertButton[] = alert.buttons.map(b => (typeof b === 'string' ? { text: b } : b));

  const press = async (b: AlertButton) => {
    const keep = b.handler ? await b.handler(values) : undefined;
    if (keep === false) return;
    closeAlert(alert.id);
    alert.resolve({ role: b.role, values });
  };
  const dismiss = () => {
    closeAlert(alert.id);
    alert.resolve({ role: 'backdrop', values });
  };
  const tint = colors.primary;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={[styles.alert, { backgroundColor: colors.surface }]} onPress={() => {}}>
          {alert.header ? <Text style={[styles.alertHeader, { color: colors.text }]}>{alert.header}</Text> : null}
          {alert.message ? (
            <Text selectable onLongPress={() => Clipboard.setStringAsync(alert.message || '')} style={[styles.alertMessage, { color: colors.muted }]}>
              {alert.message}
            </Text>
          ) : null}
          {(alert.inputs || []).map(input => (
            <TextInput
              key={input.name}
              value={values[input.name]}
              onChangeText={t => setValues(v => ({ ...v, [input.name]: t }))}
              placeholder={input.placeholder}
              placeholderTextColor={colors.medium}
              secureTextEntry={input.type === 'password'}
              autoCapitalize="none"
              style={[styles.alertInput, { color: colors.text, borderBottomColor: tint }]}
            />
          ))}
          <View style={styles.alertButtons}>
            {buttons.map((b, i) => (
              <Pressable key={i} onPress={() => press(b)} style={({ pressed }) => [styles.alertButton, pressed && { backgroundColor: rgba(colors.primaryRgb, 0.1) }]}>
                <Text style={{ color: b.role === 'destructive' ? colors.danger : tint, fontWeight: '600', textTransform: 'uppercase', fontSize: 14 }}>{b.text}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function OverlayHost() {
  const { colors } = useTheme();
  const toastList = useValue(toasts);
  const alertList = useValue(alerts);
  const loadingList = useValue(loadings);
  const loading = loadingList[loadingList.length - 1];
  const top = toastList.filter(t => t.position === 'top');
  const bottom = toastList.filter(t => t.position !== 'top');
  return (
    <>
      {alertList.length ? <AlertView key={alertList[0].id} alert={alertList[0]} /> : null}
      {loading ? (
        <Modal transparent visible animationType="fade">
          <View style={styles.backdrop}>
            <View style={[styles.loading, { backgroundColor: colors.surface }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.text, marginLeft: 16, fontSize: 15 }}>{loading.message}</Text>
            </View>
          </View>
        </Modal>
      ) : null}
      {top.map((t, i) => <ToastView key={t.id} toast={t} index={i} />)}
      {bottom.map((t, i) => <ToastView key={t.id} toast={t} index={i} />)}
    </>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 12, right: 12, zIndex: 9999, elevation: 30 },
  toast: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 16, paddingVertical: 13,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  toastHeader: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  alert: { width: '100%', maxWidth: 340, borderRadius: 4, paddingTop: 20, elevation: 12 },
  alertHeader: { fontSize: 20, fontWeight: '500', paddingHorizontal: 23, marginBottom: 10 },
  alertMessage: { fontSize: 16, paddingHorizontal: 23, marginBottom: 12, lineHeight: 22 },
  alertInput: { marginHorizontal: 23, borderBottomWidth: 1, fontSize: 16, paddingVertical: 8, marginBottom: 12 },
  alertButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', padding: 8 },
  alertButton: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 2, marginLeft: 6 },
  loading: { flexDirection: 'row', alignItems: 'center', borderRadius: 2, padding: 24, minWidth: 200, elevation: 12 },
});
