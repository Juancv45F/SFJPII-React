import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, ImageSourcePropType, Linking, Platform, Pressable, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appear } from '../components/Appear';
import { Screen } from '../components/Screen';
import { Button } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';
import { rgba } from '../theme/colors';
import { body, heading, radius, space } from '../theme/tokens';

// Nosotros — dirección "sentence-as-layout" del frontend Ionic: la historia de dos direcciones,
// de Vicente Guerrero #50 (2012) a Prolongación Colón #758 (2025).

const IMG = {
  plaza: require('../../assets/images/nosotros/plaza.webp'),
  templo: require('../../assets/images/nosotros/templo.webp'),
  presidencia: require('../../assets/images/nosotros/presidencia.webp'),
  kiosco: require('../../assets/images/nosotros/kiosco.webp'),
  albarelo1: require('../../assets/images/nosotros/albarelo-1.webp'),
  albarelo2: require('../../assets/images/nosotros/albarelo-2.webp'),
};

const SECTION_IDS = ['mision', 'vision', 'valores', 'objetivos', 'propuesta', 'historia'];
const pointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const STOPS: { when: string; place: string; title: string; img: ImageSourcePropType; alt: string; caption: string; text: string[] }[] = [
  {
    when: 'Antes de 2012', place: 'Farmacia Aguacatlana', title: 'Los cimientos de la experiencia', img: IMG.templo,
    alt: 'Templo y jardín del centro de Villa Hidalgo, Jalisco', caption: 'Templo y jardín del centro de Villa Hidalgo.',
    text: [
      'Todo gran proyecto nace de la vocación de servicio y el trabajo duro. Nuestro fundador dedicó aproximadamente 8 años de su vida profesional a colaborar en la Farmacia Aguacatlana.',
      'Ahí adquirió un conocimiento profundo sobre la gestión de medicamentos y el sector salud, y comprendió de primera mano las necesidades de la comunidad: la importancia de un consejo honesto, un trato humano y la disponibilidad de los tratamientos adecuados.',
    ],
  },
  {
    when: '2012', place: 'Vicente Guerrero #50, Centro', title: 'El nacimiento de un sueño', img: IMG.presidencia,
    alt: 'Fachada de la Presidencia Municipal de Villa Hidalgo, Jalisco, de noche', caption: 'Presidencia Municipal, en el Centro de Villa Hidalgo.',
    text: [
      'Impulsado por esa experiencia y con la visión de crear un espacio propio que reflejara sus valores de atención y cuidado al paciente, decidió emprender. Así, en 2012 nació oficialmente Super Farmacias Juan Pablo II.',
      'La primera sede abrió en el corazón de la ciudad, en la calle Vicente Guerrero #50, zona Centro. Ahí la farmacia forjó su reputación y se ganó poco a poco la confianza de las familias gracias a su compromiso con la salud y el trato cercano.',
    ],
  },
  {
    when: '2025', place: 'Prolongación Colón #758', title: 'Crecimiento y modernización', img: IMG.kiosco,
    alt: 'Kiosco de la plaza principal de Villa Hidalgo, Jalisco, iluminado de noche', caption: 'Kiosco de la plaza principal de Villa Hidalgo.',
    text: [
      'La lealtad de nuestros clientes y el deseo de ofrecer un mejor servicio nos impulsaron a evolucionar. Buscando más espacio para ampliar el catálogo y mejorar la atención, a finales de 2025 nos mudamos a Prolongación Colón #758.',
      'La mudanza marcó el inicio de una etapa de modernización. Hoy seguimos con la misma misión del primer día: cuidar la salud de nuestra comunidad, combinando la calidez del mostrador con la agilidad de los servicios digitales.',
    ],
  },
];

const VALUES = [
  ['Empatía', 'Entendemos que detrás de cada pedido hay una necesidad de salud o urgencia. Tratamos a cada cliente con la humanidad y urgencia que merece.'],
  ['Confianza e integridad', 'Garantizamos la procedencia legal y la calidad de cada producto que vendemos, manejando precios justos y transparentes.'],
  ['Innovación continua', 'Adoptamos nuevas tecnologías, como nuestra aplicación y la sincronización en tiempo real, para hacerle la vida más fácil a nuestros clientes.'],
  ['Compromiso', 'Con el bienestar de la comunidad, asegurando que nuestros estantes, físicos y digitales, siempre estén listos para responder a sus necesidades.'],
];

const GOALS: [string, string[]][] = [
  ['En los próximos 6 meses', [
    'Digitalizar el 100% del inventario físico en la nueva plataforma.',
    'Lograr que al menos el 20% de los clientes recurrentes hagan sus pedidos desde la aplicación.',
  ]],
  ['De 6 a 12 meses', [
    'Reducir el tiempo de atención y entrega a domicilio con notificaciones de pedidos en tiempo real para los repartidores.',
    'Cero diferencias de inventario gracias al control de entradas y salidas desde el panel de administración.',
  ]],
  ['De 1 a 3 años', [
    'Usar el historial de compras para anticipar la demanda por temporada, como los antigripales en invierno, y evitar el desabasto.',
    'Ampliar la zona de entregas a domicilio apoyados en la eficiencia de la plataforma.',
  ]],
];

const clamp = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));

export default function NosotrosPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { seccion } = useLocalSearchParams<{ seccion?: string }>();
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const offsets = useRef<Record<string, number>>({});
  const [stop, setStop] = useState(2);
  const [shutter] = useState(() => new Animated.Value(1));

  const wide = width > 960;
  const gutter = clamp(16, width * 0.03, 32);
  const tDisplay = clamp(52, width * 0.086, 144);
  const tSection = clamp(32, width * 0.042, 58);
  const tStatement = clamp(20, width * 0.019, 28);
  const sectionGap = clamp(88, width * 0.12, 176);

  // Scroll por sección (?seccion=mision), equivalente a los fragmentos #mision, #vision… del Ionic.
  useEffect(() => {
    const id = String(seccion || '').toLowerCase();
    if (!SECTION_IDS.includes(id)) return;
    const timer = setTimeout(() => {
      const y = offsets.current[id];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [seccion]);

  const choose = (i: number) => {
    setStop(i);
    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (reduce) return;
      shutter.setValue(0);
      Animated.timing(shutter, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }).start();
    }).catch(() => {});
  };

  const sectionTitle = (text: string, style?: any) => (
    <Text role="heading" aria-level={2} style={[styles.sectionTitle, { color: colors.text, fontSize: tSection, lineHeight: tSection * 1.04 }, style]}>{text}</Text>
  );
  const caption = (text: string) => <Text style={[styles.note, { color: colors.muted, marginTop: space[2] }]}>{text}</Text>;
  const P = ({ children, style }: { children: ReactNode; style?: any }) => <Text style={[styles.body, { color: colors.text }, style]}>{children}</Text>;
  const cur = STOPS[stop];

  return (
    <Screen title="Acerca de Nosotros" padding={false} scrollRef={scrollRef} siteFooter>
      <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: gutter }}>

        {/* Portada: el nombre con una foto del pueblo en el hueco entre palabras */}
        <View style={{ minHeight: wide ? Math.min(height * 0.86, 880) - 64 : undefined, paddingTop: wide ? clamp(48, height * 0.1, 120) : space[7], paddingBottom: space[6], justifyContent: 'space-between' }}>
          <Appear style={wide ? { flex: 1, justifyContent: 'center' } : null}>
            <View role="heading" aria-level={1} style={styles.heroTitle}>
              <Text style={[styles.display, { color: colors.text, fontSize: tDisplay, lineHeight: tDisplay * 0.98 }]}>Farmacia</Text>
              <View aria-hidden style={[styles.heroFrame, { height: tDisplay * 0.74, minWidth: tDisplay * 2.3, marginBottom: tDisplay * 0.13 }]}>
                <Image source={IMG.plaza} style={styles.cover} />
              </View>
              <Text style={[styles.display, { color: colors.text, fontSize: tDisplay, lineHeight: tDisplay * 0.98 }]}>Juan Pablo II</Text>
            </View>
          </Appear>
          <Appear delay={120} style={[styles.heroFoot, !wide && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <Text style={[styles.statement, { color: colors.text, fontSize: tStatement, lineHeight: tStatement * 1.35, maxWidth: 620, flexShrink: 1 }]}>
              Farmacia de barrio en Villa Hidalgo, Jalisco. Desde 2012 cuidamos la salud de nuestras familias, en el mostrador y hasta la puerta de tu casa.
            </Text>
            <View style={styles.heroActions}>
              <Button round onPress={() => router.push('/catalogo')} style={styles.cta} textStyle={{ fontSize: 17 }}>Ver catálogo</Button>
              <Pressable onPress={() => router.push('/ubicacion')} accessibilityRole="link" style={[styles.textLink, pointer]}>
                <Text style={[body(600), styles.underline, { color: colors.primary, fontSize: 16 }]}>Cómo llegar</Text>
              </Pressable>
            </View>
          </Appear>
        </View>

        {/* Historia */}
        <View onLayout={e => { offsets.current.historia = e.nativeEvent.layout.y; }} style={{ paddingTop: sectionGap }}>
          <Appear>{sectionTitle('Doce años detrás del mostrador')}</Appear>
          <View style={[styles.storyGrid, !wide && { flexDirection: 'column-reverse' }]}>
            <View role="list" style={[styles.facts, !wide && { flexDirection: 'row', width: '100%' }]}>
              {[['Dónde', 'Villa Hidalgo, Jalisco'], ['Desde', '2012'], ['Hoy', 'Prolongación Colón #758']].map(([k, v]) => (
                <View key={k} role="listitem" style={!wide ? { flex: 1 } : null}>
                  <Text style={[styles.note, { color: colors.muted }]}>{k}</Text>
                  <Text style={[body(600), { color: colors.text, fontSize: 16, marginTop: 2 }]}>{v}</Text>
                </View>
              ))}
            </View>
            <Appear delay={80} style={{ flex: 1 }}>
              <View style={styles.storyLead}>
                <Image source={IMG.albarelo1} accessibilityLabel="Albarelo mexicano de cerámica azul y blanca, siglo XVIII"
                  style={[styles.storyCap, { width: tStatement * 4.4, height: tStatement * 5.2, backgroundColor: colors.photoBg }]} />
                <Text style={[styles.statement, { color: colors.text, fontSize: tStatement, lineHeight: tStatement * 1.32, flex: 1 }]}>
                  <Text style={heading(700)}>Antes de abrir sus puertas, </Text>
                  nuestro fundador pasó cerca de ocho años en la Farmacia Aguacatlana. Ahí aprendió a manejar medicamentos y, sobre todo, lo que una familia necesita al cruzar la puerta: un consejo honesto, un trato humano y el tratamiento adecuado.
                </Text>
              </View>
              <Text style={[styles.statement, { color: colors.muted, fontSize: tStatement, lineHeight: tStatement * 1.32, marginTop: space[4] }]}>
                En 2012 decidió emprender, y así nació Super Farmacias Juan Pablo II.
              </Text>
            </Appear>
          </View>

          {/* Recorrido: la historia en tres paradas */}
          <View style={{ marginTop: sectionGap }}>
            <Text role="heading" aria-level={3} style={[heading(700), { color: colors.text, fontSize: tStatement, marginBottom: space[5] }]}>De Guerrero #50 a Colón #758</Text>
            <View role="tablist" aria-label="Etapas de nuestra historia" style={styles.routeTabs}>
              {STOPS.map((s, i) => {
                const selected = i === stop;
                return (
                  <Pressable key={s.when} onPress={() => choose(i)} accessibilityRole="tab" accessibilityState={{ selected }}
                    style={({ hovered, pressed }: any) => [styles.routeTab, pointer,
                      { backgroundColor: selected ? colors.primary : hovered ? rgba(colors.primaryRgb, 0.12) : colors.surface2 },
                      pressed && { transform: [{ scale: 0.98 }] }]}>
                    <Text style={[heading(800), { fontSize: width < 500 ? 18 : 22, letterSpacing: -0.4, color: selected ? colors.onPrimary : colors.text }]}>{s.when}</Text>
                    <Text style={[body(400), { fontSize: 15, color: selected ? colors.onPrimary : colors.muted }]} numberOfLines={2}>{s.place}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View role="tabpanel" style={[styles.routePanel, width <= 600 && { flexDirection: 'column' }]}>
              <View style={width <= 600 ? { width: '100%' } : { flex: 5 }}>
                <View style={{ aspectRatio: 4 / 3, overflow: 'hidden' }}>
                  <Animated.Image source={cur.img} accessibilityLabel={cur.alt} style={[styles.cover, {
                    opacity: shutter,
                    transform: [{ scale: shutter.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }],
                  }]} />
                </View>
                {caption(cur.caption)}
              </View>
              <View style={width <= 600 ? { width: '100%' } : { flex: 7 }}>
                <Text role="heading" aria-level={4} style={[heading(800), { color: colors.text, fontSize: clamp(24, width * 0.024, 34), lineHeight: clamp(24, width * 0.024, 34) * 1.1, marginBottom: space[4], letterSpacing: -0.5 }]}>{cur.title}</Text>
                {cur.text.map(t => <P key={t} style={{ marginBottom: space[4] }}>{t}</P>)}
              </View>
            </View>
          </View>
        </View>

        {/* Misión y visión */}
        <View onLayout={e => { offsets.current.mision = e.nativeEvent.layout.y; offsets.current.vision = e.nativeEvent.layout.y; }} style={{ paddingTop: sectionGap }}>
          <Appear>{sectionTitle('Por qué abrimos cada mañana')}</Appear>
          <View style={[styles.twoCols, !wide && { flexDirection: 'column' }]}>
            {[['Misión', 'Proveer a nuestra comunidad de acceso rápido, seguro y confiable a medicamentos y productos de bienestar. En Farmacia JP II combinamos la calidez y el consejo de la farmacia tradicional con la agilidad de la tecnología moderna, asegurando que cada cliente reciba exactamente lo que necesita para cuidar su salud y la de su familia, ya sea en nuestro mostrador o hasta la puerta de su hogar.'],
              ['Visión', 'Ser la farmacia líder y más innovadora de nuestra región, reconocida no solo por nuestro extenso y confiable catálogo, sino por nuestra capacidad de revolucionar la atención al cliente mediante plataformas digitales. Aspiramos a ser el primer referente de salud para nuestra comunidad, garantizando disponibilidad, rapidez y confianza en cada entrega.']].map(([t, d], i) => (
              <Appear key={t} delay={i * 80} style={{ flex: 1 }}>
                <Text role="heading" aria-level={3} style={[heading(800), { color: colors.primary, fontSize: clamp(22, width * 0.02, 28), marginBottom: space[3] }]}>{t}</Text>
                <P style={{ lineHeight: 29 }}>{d}</P>
              </Appear>
            ))}
          </View>
          <Appear style={{ marginTop: space[7] }}>
            <View style={{ aspectRatio: wide ? 21 / 9 : 4 / 3, overflow: 'hidden' }}>
              <Image source={IMG.plaza} accessibilityLabel="Plaza principal de Villa Hidalgo, Jalisco, con su kiosco y palmeras" style={styles.cover} />
            </View>
            {caption('Plaza principal de Villa Hidalgo.')}
          </Appear>
        </View>

        {/* Valores */}
        <View onLayout={e => { offsets.current.valores = e.nativeEvent.layout.y; }} style={{ paddingTop: sectionGap }}>
          <Appear>{sectionTitle('Lo que nos mueve, cada día', { paddingLeft: wide ? width * 0.03 : 0 })}</Appear>
          <View style={[styles.valuesGrid, !wide && { flexDirection: 'column-reverse', alignItems: 'stretch' }]}>
            <Appear style={wide ? { flex: 4 } : { width: '60%', alignSelf: 'flex-end' }}>
              <View style={{ aspectRatio: 4 / 5, overflow: 'hidden', backgroundColor: colors.photoBg }}>
                <Image source={IMG.albarelo2} accessibilityLabel="Albarelo mexicano de cerámica con decoración azul, principios del siglo XIX" style={styles.cover} />
              </View>
              {caption('Albarelo mexicano, 1800–1825. Así se guardaban los remedios en las boticas.')}
            </Appear>
            {wide ? <View style={{ flex: 1 }} /> : null}
            <View role="list" style={[{ gap: space[6] }, wide && { flex: 7 }]}>
              {VALUES.map(([name, text], i) => (
                <Appear key={name} delay={i * 70}>
                  <View role="listitem" style={[styles.valueRow, width <= 600 && { flexDirection: 'column', gap: space[1] }]}>
                    <Text style={[heading(800), { color: colors.primary, fontSize: 19, width: width <= 600 ? undefined : 190 }]}>{name}</Text>
                    <P style={{ flex: 1 }}>{text}</P>
                  </View>
                </Appear>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Objetivos: campo de color a todo lo ancho */}
      <View onLayout={e => { offsets.current.objetivos = e.nativeEvent.layout.y; }} style={{ marginTop: sectionGap, backgroundColor: colors.surface2 }}>
        <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: gutter, paddingVertical: clamp(64, width * 0.09, 128) }}>
          <Appear>{sectionTitle('Hacia dónde vamos')}</Appear>
          <View style={[styles.goalsGrid, !wide && { flexDirection: 'column' }]}>
            {GOALS.map(([title, items], i) => (
              <Appear key={title} delay={i * 80} style={{ flex: 1 }}>
                <Text role="heading" aria-level={3} style={[heading(800), { color: colors.text, fontSize: clamp(20, width * 0.017, 24), marginBottom: space[4] }]}>{title}</Text>
                <View role="list" style={{ gap: space[3] }}>
                  {items.map(it => (
                    <View role="listitem" key={it} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={[styles.marker, { backgroundColor: colors.primary }]} />
                      <P style={{ flex: 1 }}>{it}</P>
                    </View>
                  ))}
                </View>
              </Appear>
            ))}
          </View>
        </View>
      </View>

      <View onLayout={e => { offsets.current.propuesta = e.nativeEvent.layout.y; }} style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: gutter }}>
        {/* Propuesta de valor */}
        <View style={[styles.promise, { paddingTop: sectionGap }, !wide && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Appear style={wide ? { flex: 7 } : null}>
            {sectionTitle('Tu salud, sin vueltas en vano', { marginBottom: space[4] })}
            <Text style={[styles.statement, { color: colors.text, fontSize: tStatement, lineHeight: tStatement * 1.35, maxWidth: 520, marginBottom: space[5] }]}>
              Nuestro inventario se sincroniza en tiempo real: lo que ves en la tienda digital es exactamente lo que tenemos. Compra desde tu celular con la certeza de que tu medicamento llegará a tus manos de forma rápida y segura.
            </Text>
            <Button round onPress={() => router.push('/catalogo')} style={[styles.cta, { alignSelf: 'flex-start' }]} textStyle={{ fontSize: 17 }}>Ver catálogo</Button>
          </Appear>
          {wide ? <View style={{ flex: 1 }} /> : null}
          <Appear delay={100} style={wide ? { flex: 4 } : { width: '60%', alignSelf: 'flex-end', marginTop: space[6] }}>
            <View style={{ aspectRatio: 3 / 4, overflow: 'hidden', backgroundColor: colors.photoBg }}>
              <Image source={IMG.albarelo1} accessibilityLabel="Albarelo mexicano de cerámica azul y blanca, siglo XVIII" style={styles.cover} />
            </View>
            {caption('Albarelo mexicano, 1750–1800. The Metropolitan Museum of Art.')}
          </Appear>
        </View>

        <Credits />
      </View>
    </Screen>
  );
}

function Credits() {
  const { colors } = useTheme();
  const a = (label: string, url: string) => (
    <Text accessibilityRole="link" onPress={() => Linking.openURL(url)} style={[styles.underline, { color: colors.text }, pointer]}>{label}</Text>
  );
  return (
    <Text style={[styles.note, { color: colors.muted, lineHeight: 22, paddingTop: space[7] }]}>
      Fotografías: {a('“Villa Hidalgo (20221123)”', 'https://commons.wikimedia.org/wiki/File:Villa_Hidalgo_(20221123).jpg')},{' '}
      {a('“Villa Hidalgo (20221122)1”', 'https://commons.wikimedia.org/wiki/File:Villa_Hidalgo_(20221122)1.jpg')} y{' '}
      {a('“Villa Hidalgo (20221122)2”', 'https://commons.wikimedia.org/wiki/File:Villa_Hidalgo_(20221122)2.jpg')} de José González Peña;{' '}
      {a('“God’s House In Villa Hidalgo, Jalisco”', 'https://commons.wikimedia.org/wiki/File:God%E2%80%99s_House_In_Villa_Hidalgo,Jalisco.jpg')} de Ricardo Zul;
      todas {a('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0')}, vía Wikimedia Commons.
      Albarelos: The Metropolitan Museum of Art ({a('1', 'https://commons.wikimedia.org/wiki/File:Apothecary_Jar_MET_DP248967.jpg')},{' '}
      {a('2', 'https://commons.wikimedia.org/wiki/File:Apothecary_Jar_MET_DP248989.jpg')}), CC0.
    </Text>
  );
}

const styles = StyleSheet.create({
  display: { ...heading(800), letterSpacing: -2.4 },
  heroTitle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 18 },
  heroFrame: { flexGrow: 1, flexBasis: 160, overflow: 'hidden' },
  cover: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroFoot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space[5], marginTop: space[7] },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  cta: { minHeight: 52, paddingHorizontal: 28, marginVertical: 0 },
  textLink: { minHeight: 44, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  sectionTitle: { ...heading(800), letterSpacing: -1.2, marginBottom: space[6], maxWidth: 760 },
  statement: { ...body(400) },
  body: { ...body(400), fontSize: 18, lineHeight: 28, maxWidth: 680 },
  note: { ...body(400), fontSize: 14 },
  storyGrid: { flexDirection: 'row', gap: space[6], alignItems: 'flex-start' },
  facts: { width: 180, gap: space[4] },
  storyLead: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, maxWidth: 900 },
  storyCap: { resizeMode: 'cover', marginTop: 4 },
  routeTabs: { flexDirection: 'row', gap: space[2], marginBottom: space[5] },
  routeTab: { flex: 1, minHeight: 72, paddingVertical: space[3], paddingHorizontal: space[4], borderRadius: radius.md, gap: 4 },
  routePanel: { flexDirection: 'row', gap: space[6], alignItems: 'flex-start' },
  twoCols: { flexDirection: 'row', gap: 64 },
  valuesGrid: { flexDirection: 'row', alignItems: 'center', gap: space[6] },
  valueRow: { flexDirection: 'row', gap: space[4], alignItems: 'baseline' },
  goalsGrid: { flexDirection: 'row', gap: 48 },
  marker: { width: 7, height: 7, borderRadius: 4, marginTop: 11 },
  promise: { flexDirection: 'row', alignItems: 'center' },
});
