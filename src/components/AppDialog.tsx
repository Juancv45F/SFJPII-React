import { ReactNode, RefObject } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { heading, radius, shadow, space } from '../theme/tokens';
import { Icon } from './ui';

// .app-dialog: en PC diálogo centrado (hasta 1040×940); en teléfono o pantallas bajas, pantalla completa.
// Estructura: encabezado (título, cerrar y pestañas opcionales), contenido con scroll y pie con acciones.
export function AppDialog({ open, onClose, title, tabs, footer, children, maxWidth = 1040, scrollRef, contentBackground }: {
  open: boolean;
  onClose: () => void;
  title: string;
  tabs?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  scrollRef?: RefObject<ScrollViewInstance | null>;
  contentBackground?: string;
}) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const full = width < 768 || height < 560;

  return (
    <Modal visible={open} transparent animationType={full ? 'slide' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }, full && { padding: 0 }]}>
        {!full ? <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar diálogo" /> : null}
        <View role="dialog" aria-modal aria-label={title} style={[
          styles.dialog, { backgroundColor: colors.surface },
          full
            ? { width: '100%', height: '100%', borderRadius: 0, paddingTop: insets.top }
            : [{ width: Math.min(maxWidth, width - 48), height: Math.min(height * 0.92, 940) }, shadow(colors, 'lg')],
        ]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleRow}>
              <Text role="heading" aria-level={2} style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={`Cerrar ${title}`}
                style={({ hovered }: any) => [styles.close, Platform.OS === 'web' && ({ cursor: 'pointer' } as any), hovered && { backgroundColor: colors.surface2 }]}>
                <Icon name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            {tabs ? <View style={styles.tabs}>{tabs}</View> : null}
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: contentBackground ?? colors.surface }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? (
              <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: space[3] + (full ? insets.bottom : 0) }]}>
                <View style={[styles.actions, width <= 480 && { flexDirection: 'column-reverse', alignItems: 'stretch' }]}>{footer}</View>
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: radius.xl, overflow: 'hidden' },
  header: { borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingLeft: space[5], paddingRight: space[2] },
  title: { ...heading(800), flex: 1, fontSize: 19 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tabs: { paddingHorizontal: space[4], paddingBottom: space[2], width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: { borderTopWidth: 1, paddingTop: space[3], paddingHorizontal: space[5] },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space[2] },
});
