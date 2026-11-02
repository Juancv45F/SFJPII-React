import { ReactNode, useEffect, useState } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LOGO } from './Navbar';
import { rgba } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { body, heading, radius, shadow, space, tabular } from '../theme/tokens';
import { discounted, money } from '../utils/format';
import { Chip, Icon } from './ui';

const web = Platform.OS === 'web';
const pointer = web ? ({ cursor: 'pointer' } as any) : null;

// ion-col size="6" size-md="4" size-lg="3"
export function useGridColumns() {
  const { width } = useWindowDimensions();
  return width >= 992 ? 4 : width >= 768 ? 3 : 2;
}

export function ProductGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function GridCell({ children }: { children: ReactNode }) {
  const cols = useGridColumns();
  return <View style={{ width: `${100 / cols}%`, padding: space[1] }}>{children}</View>;
}

// .filters-container: chips de categoría + chip de Ofertas, fijos al hacer scroll.
export function CategoryChips({ categories, selected, onSelect, offers, onToggleOffers, label = 'Categorías' }: {
  categories: { id: string; name: string }[]; selected: string; onSelect: (id: string) => void; offers: boolean; onToggleOffers: () => void; label?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.filters, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={{ width: '100%', maxWidth: 1200, alignSelf: 'center' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} role="toolbar" aria-label={label}>
          {categories.map(c => <Chip key={c.id || '_all'} label={c.name} selected={selected === c.id} onPress={() => onSelect(c.id)} />)}
          <Chip label="Ofertas" selected={offers} color="warning" icon="star" onPress={onToggleOffers} />
        </ScrollView>
      </View>
    </View>
  );
}

export function AddProductCard({ onPress, label = 'Nuevo producto' }: { onPress: () => void; label?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed, hovered }: any) => [styles.addCard, pointer, {
        borderColor: hovered ? colors.primary : rgba(colors.primaryRgb, 0.45),
        backgroundColor: rgba(colors.primaryRgb, hovered ? 0.1 : 0.05),
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }]}>
      <Icon name="add-circle-outline" size={48} color={colors.primary} />
      <Text style={[heading(700), { color: colors.primary, fontSize: 16 }]}>{label}</Text>
    </Pressable>
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: !web }),
      Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: !web }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  const bg = colors.surface2;
  return (
    <View aria-busy style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, minHeight: 280 }, shadow(colors, 'sm')]}>
      <Animated.View style={{ opacity, padding: space[2], gap: 10 }}>
        <View style={{ aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: bg }} />
        <View style={{ paddingHorizontal: 4, gap: 10 }}>
          <View style={{ height: 10, width: '40%', borderRadius: 4, backgroundColor: bg }} />
          <View style={{ height: 16, width: '85%', borderRadius: 4, backgroundColor: bg }} />
          <View style={{ height: 22, width: '50%', borderRadius: 4, backgroundColor: bg }} />
          <View style={{ height: 44, width: '100%', borderRadius: radius.md, backgroundColor: bg, marginTop: 6 }} />
        </View>
      </Animated.View>
    </View>
  );
}

// Badge de stock con color semántico + texto + punto (no solo color).
export function StockBadge({ stock }: { stock: number }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const low = stock > 0 && stock <= 5;
  const fg = stock === 0 ? colors.muted : low ? colors.warning : colors.success;
  const bg = stock === 0 ? colors.surface2 : low ? rgba(colors.warningRgb, 0.14) : rgba(colors.successRgb, 0.12);
  return (
    <View style={[styles.stockBadge, { backgroundColor: bg }]}>
      {width > 400 ? <View style={[styles.stockDot, { backgroundColor: fg }]} /> : null}
      <Text style={[styles.stockText, { color: fg }]} numberOfLines={1}>{stock > 0 ? `Stock: ${stock}` : 'Agotado'}</Text>
    </View>
  );
}

type CardProps = {
  product: any;
  hasDiscountBorder?: boolean;
  categoryLabel?: string;
  stockBadge?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: ReactNode;
  priceSuffix?: string;
  body?: ReactNode;
};

// .product-card de home.page.scss.
export function ProductCard({ product: p, categoryLabel, stockBadge = true, onEdit, onDelete, children, priceSuffix, body: extra }: CardProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [imgError, setImgError] = useState(false);
  const [hover, setHover] = useState(false);
  const hasDiscount = Number(p.descuento) > 0;
  const stock = Number(p.stock);
  const soldOut = stockBadge && stock === 0;
  const small = width <= 400;
  return (
    <View
      {...(web ? { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) } as any : null)}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.mode === 'dark' ? colors.border : 'transparent' },
        shadow(colors, hover ? 'md' : 'sm'),
        hasDiscount && { borderWidth: 1, borderColor: rgba(colors.dangerRgb, 0.35) },
        hover && { transform: [{ translateY: -2 }], borderColor: rgba(colors.primaryRgb, 0.35) },
        web && ({ transitionProperty: 'transform, box-shadow, border-color', transitionDuration: '220ms' } as any),
      ]}>
      {onEdit || onDelete ? (
        <View style={styles.adminActions}>
          {onEdit ? (
            <Pressable onPress={onEdit} style={[styles.adminBtn, pointer, { backgroundColor: colors.surface }, shadow(colors, 'md')]} accessibilityRole="button" accessibilityLabel={`Editar ${p.nombre}`}>
              <Icon name="create-outline" size={19} color={colors.primary} />
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable onPress={onDelete} style={[styles.adminBtn, pointer, { backgroundColor: colors.surface }, shadow(colors, 'md')]} accessibilityRole="button" accessibilityLabel={`Eliminar ${p.nombre}`}>
              <Icon name="trash-outline" size={19} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {hasDiscount ? (
        <View style={[styles.ribbon, { backgroundColor: colors.danger }]}>
          <Text style={[styles.ribbonText, { color: colors.onDanger }]}>-{p.descuento}%</Text>
        </View>
      ) : null}
      <View style={[styles.img, { backgroundColor: colors.photoBg }]}>
        <Image source={p.imagen && !imgError ? { uri: p.imagen } : LOGO} onError={() => setImgError(true)}
          style={[{ width: '100%', height: '100%', resizeMode: 'contain' }, soldOut && { opacity: 0.55 }, hover && { transform: [{ scale: 1.04 }] }]}
          accessibilityLabel={p.nombre} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.category, { color: colors.muted }]} numberOfLines={1}>{categoryLabel ?? p.categoria?.nombre ?? p.Categoria?.nombre ?? ''}</Text>
          {stockBadge ? <StockBadge stock={stock} /> : null}
        </View>
        <Text role="heading" aria-level={3} style={[styles.title, { color: colors.text }, small && { fontSize: 14.5 }]} numberOfLines={2}>{p.nombre}</Text>
        {extra}
        <View style={styles.prices}>
          <Text style={[styles.final, { color: colors.primary }, small && { fontSize: 18.5 }]}>{money(hasDiscount ? discounted(p) : p.precio)}</Text>
          {hasDiscount ? <Text style={[styles.original, { color: colors.muted }]}>{money(p.precio)}</Text> : null}
          {priceSuffix ? <Text style={[body(500), { color: colors.muted, fontSize: 13 }]}>{priceSuffix}</Text> : null}
        </View>
        <View style={{ marginTop: 'auto', gap: 8 }}>{children}</View>
      </View>
    </View>
  );
}

// .stock-control-wrapper: stock rápido con +/- e input editable.
export function QuickStock({ value, onChange, onCommit, label = 'Stock rápido' }: { value: number; onChange: (v: number) => void; onCommit: (v: number) => void; label?: string }) {
  const { colors } = useTheme();
  const [text, setText] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);
  if (prevValue !== value) { setPrevValue(value); setText(String(value)); }
  const btn = (icon: string, a11y: string, onPress: () => void, disabled?: boolean) => (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y}
      style={({ pressed }) => [styles.stockBtn, pointer, { backgroundColor: colors.surface }, pressed && { opacity: 0.7 }, disabled && { opacity: 0.45 }]}>
      <Icon name={icon} size={20} color={colors.primary} />
    </Pressable>
  );
  return (
    <View style={[styles.stockWrap, { backgroundColor: colors.surface2 }]}>
      <Text style={[styles.stockLabel, { color: colors.muted }]}>{label}</Text>
      <View style={styles.stockInputs}>
        {btn('remove', 'Disminuir stock', () => value > 0 && onCommit(value - 1), value <= 0)}
        <TextInput
          value={text}
          aria-label={label}
          onChangeText={t => { setText(t); const n = parseInt(t, 10); if (!Number.isNaN(n)) onChange(n); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onCommit(parseInt(text, 10)); }}
          onSubmitEditing={() => onCommit(parseInt(text, 10))}
          keyboardType="number-pad"
          style={[styles.stockInput, { color: colors.text, backgroundColor: colors.surface, borderColor: focused ? colors.primary : colors.border },
            web && ({ outlineStyle: 'none' } as any)]}
        />
        {btn('add', 'Aumentar stock', () => onCommit(value + 1))}
      </View>
    </View>
  );
}

export function PromoStock({ product }: { product: any }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stockWrap, { backgroundColor: colors.surface2 }]}>
      <Text style={[styles.stockLabel, { color: colors.muted }]}>Stock calculado: {product.stock} promociones</Text>
      <Text style={[body(400), { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18 }]}>
        Cada promoción consume {product.unidades_por_venta} unidades del producto base.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space[1] },
  filters: { paddingVertical: space[3], borderBottomWidth: 1, zIndex: 10 },
  chips: { paddingHorizontal: space[4], gap: space[2], alignItems: 'center' },
  card: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1 },
  addCard: { flex: 1, minHeight: 280, borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: space[2] },
  adminActions: { position: 'absolute', top: space[3], right: space[3], zIndex: 10, flexDirection: 'row', gap: 6 },
  adminBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ribbon: { position: 'absolute', top: space[3], left: space[3], zIndex: 10, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  ribbonText: { ...heading(800), ...tabular, fontSize: 13 },
  img: { aspectRatio: 4 / 3, padding: space[3], margin: space[2], borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: space[3], paddingTop: space[2], paddingBottom: space[3] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2], gap: space[2] },
  category: { ...body(700), flexShrink: 1, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.7 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill, flexShrink: 0 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { ...body(700), ...tabular, fontSize: 11.5 },
  title: { ...body(600), fontSize: 16, lineHeight: 21, minHeight: 42, marginBottom: space[2] },
  prices: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: space[2], rowGap: 2, marginBottom: space[3] },
  original: { ...body(500), ...tabular, fontSize: 14.5, textDecorationLine: 'line-through' },
  final: { ...heading(800), ...tabular, fontSize: 21, letterSpacing: -0.2 },
  stockWrap: { padding: space[2], borderRadius: radius.md },
  stockLabel: { ...body(600), fontSize: 13, marginBottom: 6, textAlign: 'center' },
  stockInputs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stockBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stockInput: { ...heading(800), ...tabular, flex: 1, minWidth: 0, height: 40, borderRadius: radius.sm, borderWidth: 1, textAlign: 'center', fontSize: 17, padding: 0 },
});
