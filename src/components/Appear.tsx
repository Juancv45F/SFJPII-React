import { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleProp, ViewStyle } from 'react-native';

// appIoAppear: entrada con opacidad + desplazamiento. Sin movimiento si el sistema pide reducirlo.
// El contenido nunca queda oculto: si la animación no corre, se muestra tal cual.
export function Appear({ children, delay = 0, style, distance = 16 }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle>; distance?: number }) {
  const [progress] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce || cancelled) return;
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 420, delay, useNativeDriver: Platform.OS !== 'web' }).start();
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [delay, progress]);
  return (
    <Animated.View style={[style, {
      opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}
