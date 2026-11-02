import { ReactNode, useEffect, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// ion-menu: panel lateral con esquinas redondeadas, sombra azul y fondo translúcido.
export function SideDrawer({ open, onClose, side, children, onOpened }: {
  open: boolean; onClose: () => void; side: 'start' | 'end'; children: ReactNode; onOpened?: () => void;
}) {
  const { colors } = useTheme();
  const width = Math.min(304, Dimensions.get('window').width * 0.85);
  const offset = side === 'start' ? -width : width;
  const [translate] = useState(() => new Animated.Value(offset));
  const [fade] = useState(() => new Animated.Value(0));
  const [visible, setVisible] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setVisible(true);
  }

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(translate, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => onOpened?.());
    } else if (visible) {
      Animated.parallel([
        Animated.timing(translate, { toValue: offset, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar menú" />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          { width, backgroundColor: colors.background, transform: [{ translateX: translate }] },
          side === 'start'
            ? { left: 0, borderTopRightRadius: 20, borderBottomRightRadius: 20 }
            : { right: 0, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute', top: 0, bottom: 0, overflow: 'hidden',
    elevation: 24, shadowColor: 'rgb(0, 79, 164)', shadowOpacity: 0.85, shadowRadius: 16, shadowOffset: { width: 4, height: 0 },
  },
});
