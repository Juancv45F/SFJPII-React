import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Color } from '../ui/overlays';
import { colorOf, contrastOf, Icon } from './ui';

// ion-badge con ion-icon + texto (estado de pedidos/encargos).
export function StatusBadge({ label, color, icon, style }: { label: string; color: Color; icon?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const fg = contrastOf(colors, color);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: colorOf(colors, color), alignSelf: 'flex-start' }, style]}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
