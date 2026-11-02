import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// Sustituye formatMessage(): negritas, cursivas, encabezados, listas y enlaces en texto nativo.
function inline(text: string, color: string, linkColor: string, keyBase: string) {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|\*([^*\n]+?)\*|(https?:\/\/[^\s<"]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1]) parts.push(<Text key={key} style={{ color: linkColor, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(m![2])}>{m[1]}</Text>);
    else if (m[3]) parts.push(<Text key={key} style={{ fontWeight: '700', color }}>{m[3]}</Text>);
    else if (m[4]) parts.push(<Text key={key} style={{ fontStyle: 'italic', color }}>{m[4]}</Text>);
    else if (m[5]) parts.push(<Text key={key} style={{ color: linkColor, textDecorationLine: 'underline' }} onPress={() => Linking.openURL(m![5])}>{m[5]}</Text>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text, color }: { text: string; color?: string }) {
  const { colors } = useTheme();
  const fg = color || colors.text;
  const link = colors.primary;
  const lines = String(text || '').split(/\r?\n/);
  return (
    <View>
      {lines.map((line, idx) => {
        const t = line.trim();
        if (!t) return <View key={idx} style={{ height: 6 }} />;
        const heading = /^(#{1,3}) (.+)$/.exec(t);
        if (heading) {
          const size = heading[1].length === 1 ? 20 : heading[1].length === 2 ? 18 : 16;
          return <Text key={idx} style={[styles.line, { color: fg, fontSize: size, fontWeight: '700' }]}>{inline(heading[2], fg, link, `h${idx}`)}</Text>;
        }
        if (t.startsWith('- ')) {
          return (
            <View key={idx} style={styles.li}>
              <Text style={{ color: fg, fontSize: 15 }}>•</Text>
              <Text style={[styles.line, { color: fg, flex: 1 }]}>{inline(t.slice(2), fg, link, `l${idx}`)}</Text>
            </View>
          );
        }
        return <Text key={idx} style={[styles.line, { color: fg }]}>{inline(t, fg, link, `p${idx}`)}</Text>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { fontSize: 15, lineHeight: 21, marginVertical: 2 },
  li: { flexDirection: 'row', gap: 6, paddingLeft: 6 },
});
