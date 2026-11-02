import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Icon } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';

export default function NotFoundPage() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Screen title="Página no encontrada" showCart={false} siteFooter>
      <View style={styles.container}>
        <Icon name="medkit-outline" size={96} color={colors.medium} />
        <Text style={[styles.title, { color: colors.text }]}>¡Ups! Medicamento no encontrado</Text>
        <Text style={[styles.message, { color: colors.text }]}>
          Parece que la página que buscas no existe o ha sido movida de estante. Verifica la URL o regresa a nuestro catálogo.
        </Text>
        <Button expand round icon="home-outline" onPress={() => router.replace('/catalogo')}>Regresar al catálogo</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 12 },
  message: { textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});
