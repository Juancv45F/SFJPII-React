import { Platform, useWindowDimensions } from 'react-native';

// Equivalente a MobileLayoutService: nativo siempre móvil; en web, (max-width: 700px).
export function useMobileLayout() {
  const { width } = useWindowDimensions();
  return Platform.OS !== 'web' || width <= 700;
}
