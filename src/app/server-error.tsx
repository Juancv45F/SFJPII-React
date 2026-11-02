import { Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Icon } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';

export default function ServerErrorPage() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Screen title="Servicio no disponible" showCart={false} siteFooter>
      <View style={styles.container}>
        <Icon name="cloud-offline-outline" size={96} color={colors.danger} />
        <Text style={[styles.title, { color: colors.text }]}>Error en el Sistema</Text>
        <Text style={[styles.message, { color: colors.text }]}>
          Nuestro sistema central está experimentando problemas técnicos. El equipo de soporte ya ha sido notificado. Por favor, intenta más tarde.
        </Text>
        <Button fill="clear" color="medium" onPress={() => router.replace('/catalogo')}>Intentar nuevamente</Button>
        <Button round color="success" icon="logo-whatsapp" onPress={() => Linking.openURL('https://wa.me/521234567890')} style={{ marginTop: 8 }}>
          Contactar por WhatsApp
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 12 },
  message: { textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});
