import { ReactNode, RefObject, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LegalDocSection } from '../content/legal';
import { rgba } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { body, heading, radius, space } from '../theme/tokens';
import { Button, Icon } from './ui';

const pointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

// Texto con fragmentos en negrita marcados como **así**.
export function Rich({ children, style }: { children: string; style?: any }) {
  const parts = children.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) => (p.startsWith('**') ? <Text key={i} style={body(700)}>{p.slice(2, -2)}</Text> : p))}
    </Text>
  );
}

export function Bullets({ items, color, markerColor, style }: { items: string[]; color: string; markerColor?: string; style?: any }) {
  return (
    <View role="list" style={{ gap: 10 }}>
      {items.map((item, i) => (
        <View key={i} role="listitem" style={styles.li}>
          <View style={[styles.marker, { backgroundColor: markerColor || color }]} />
          <Rich style={[styles.p, { flex: 1, color, marginBottom: 0 }, style]}>{item}</Rich>
        </View>
      ))}
    </View>
  );
}

// Documento legal: secciones separadas por espacio, texto a ~68ch, sin tarjetas.
export function LegalDocument({ sections, onSectionLayout }: { sections: LegalDocSection[]; onSectionLayout?: (id: string, y: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ maxWidth: 680 }}>
      {sections.map(s => (
        <View key={s.id} style={styles.section} onLayout={e => onSectionLayout?.(s.id, e.nativeEvent.layout.y)}>
          <Text role="heading" aria-level={2} style={[styles.h2, { color: colors.text }]}>{s.title}</Text>
          {s.blocks.map((b, i) => (
            'p' in b ? <Rich key={i} style={[styles.p, { color: colors.text }]}>{b.p}</Rich>
              : 'ul' in b ? <View key={i} style={{ marginBottom: 16 }}><Bullets items={b.ul} color={colors.text} markerColor={colors.primary} /></View>
                : (
                  <View key={i} style={[styles.note, { borderLeftColor: colors.primary, backgroundColor: rgba(colors.primaryRgb, 0.06) }]}>
                    <Rich style={[styles.p, { color: colors.text, marginBottom: 0 }]}>{b.note}</Rich>
                  </View>
                )
          ))}
        </View>
      ))}
    </View>
  );
}

// app-legal-toc: índice que lleva a cada sección. En pantallas chicas va plegado.
function LegalToc({ sections, active, onGo, compact }: { sections: LegalDocSection[]; active: string; onGo: (id: string) => void; compact: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(!compact);
  return (
    <View role="navigation" aria-label="Contenido del documento" style={compact ? [styles.tocCompact, { backgroundColor: colors.surface, borderColor: colors.border }] : null}>
      <Pressable onPress={() => compact && setOpen(o => !o)} accessibilityRole={compact ? 'button' : undefined} accessibilityState={compact ? { expanded: open } : undefined}
        style={[styles.tocSummary, compact && pointer]}>
        <Text style={[heading(700), { color: colors.text, fontSize: 16, flex: 1 }]}>Contenido</Text>
        {compact ? <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} /> : null}
      </Pressable>
      {open ? (
        <View role="list" style={{ gap: 2, marginTop: space[1] }}>
          {sections.map(s => {
            const isActive = s.id === active;
            return (
              <Pressable key={s.id} role="listitem" onPress={() => onGo(s.id)} accessibilityRole="link" aria-current={isActive ? 'location' : undefined}
                style={({ hovered }: any) => [styles.tocLink, pointer, (isActive || hovered) && { backgroundColor: rgba(colors.primaryRgb, isActive ? 0.1 : 0.06) }]}>
                <Text style={[isActive ? body(600) : body(400), { color: isActive ? colors.primary : colors.muted, fontSize: 15 }]}>{s.toc || s.title}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// .legal de aviso-privacidad y terminos-condiciones: encabezado grande, índice y cierre con contacto.
export function LegalPage({ title, lead, meta, sections, scrollRef, help }: {
  title: string; lead: string; meta: string; sections: LegalDocSection[];
  scrollRef: RefObject<ScrollViewInstance | null>; help?: { title: string; text: string };
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 992;
  const offsets = useRef<Record<string, number>>({});
  const bodyY = useRef(0);
  const layoutY = useRef(0);
  const [active, setActive] = useState(sections[0]?.id || '');
  const display = Math.min(56, Math.max(34, width * 0.045));

  const go = (id: string) => {
    setActive(id);
    const y = offsets.current[id];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, layoutY.current + bodyY.current + y - 16), animated: true });
  };

  return (
    <View style={[styles.page, { paddingHorizontal: width < 600 ? space[4] : space[5] }]}>
      <View style={styles.header}>
        <Text role="heading" aria-level={1} style={[heading(800), { color: colors.text, fontSize: display, lineHeight: display * 1.05, letterSpacing: -1.2, marginBottom: space[4] }]}>{title}</Text>
        <Text style={[body(400), { color: colors.text, fontSize: 19, lineHeight: 29, maxWidth: 720 }]}>{lead}</Text>
        <Text style={[body(400), { color: colors.muted, fontSize: 14.5, marginTop: space[3] }]}>{meta}</Text>
      </View>

      <View style={[styles.layout, !wide && { flexDirection: 'column', alignItems: 'stretch' }]} onLayout={e => { layoutY.current = e.nativeEvent.layout.y; }}>
        <View style={wide ? styles.aside : { marginBottom: space[6] }}>
          <LegalToc sections={sections} active={active} onGo={go} compact={!wide} />
        </View>
        <View style={{ flex: 1 }} onLayout={e => { bodyY.current = e.nativeEvent.layout.y; }}>
          <LegalDocument sections={sections} onSectionLayout={(id, y) => { offsets.current[id] = y; }} />
          {help ? <LegalHelp title={help.title} text={help.text} /> : null}
        </View>
      </View>
    </View>
  );
}

function LegalHelp({ title, text }: { title: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.help, { backgroundColor: colors.surface2 }]}>
      <Text role="heading" aria-level={2} style={[styles.h2, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.p, { color: colors.text }]}>{text}</Text>
      <View style={styles.helpActions}>
        <Button round icon="call" onPress={() => Linking.openURL('tel:+524959681331')}>Llamar al 495 968 1331</Button>
        <Pressable onPress={() => Linking.openURL('https://wa.me/524951278814')} accessibilityRole="link" style={[styles.helpLink, pointer]}>
          <Icon name="logo-whatsapp" size={20} color={colors.primary} />
          <Text style={[body(600), { color: colors.primary, fontSize: 16, textDecorationLine: 'underline' }]}>Escribir por WhatsApp</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function LegalHeaderIntro({ title, lead, meta }: { title: string; lead: string; meta: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingBottom: space[6] }}>
      <Text role="heading" aria-level={2} style={[heading(800), { color: colors.text, fontSize: 34, lineHeight: 36, letterSpacing: -1, marginBottom: space[3] }]}>{title}</Text>
      <Text style={[body(400), { color: colors.text, fontSize: 17.5, lineHeight: 26, marginBottom: space[3] }]}>{lead}</Text>
      <Text style={[body(400), { color: colors.muted, fontSize: 14.5 }]}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingTop: space[7] },
  header: { paddingBottom: space[7], maxWidth: 860 },
  layout: { flexDirection: 'row', gap: space[7], alignItems: 'flex-start' },
  aside: { width: 260, position: Platform.OS === 'web' ? ('sticky' as any) : 'relative', top: space[4] },
  tocCompact: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[1] },
  tocSummary: { minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  tocLink: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm },
  section: { paddingBottom: space[7] },
  h2: { ...heading(800), fontSize: 26, lineHeight: 30, letterSpacing: -0.5, marginBottom: space[3] },
  p: { ...body(400), fontSize: 17, lineHeight: 29, marginBottom: 16 },
  li: { flexDirection: 'row', gap: 12, paddingLeft: 2 },
  marker: { width: 7, height: 7, borderRadius: 4, marginTop: 12 },
  note: { borderLeftWidth: 3, paddingVertical: space[3], paddingHorizontal: space[4], borderRadius: radius.sm, marginBottom: 16 },
  help: { borderRadius: radius.lg, padding: space[5], marginBottom: space[6] },
  helpActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[4] },
  helpLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
});
