import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Icon } from '../components/ui';
import { HtmlFrame } from '../components/HtmlFrame';
import { useTheme } from '../theme/ThemeProvider';
import { showAlert } from '../ui/overlays';

const CARTO_KEY = 'cb1_461i_1_53267d521842c287a7b12428';
const SUCURSAL: [number, number] = [21.6864695, -102.5857519];
const [LAT, LNG] = SUCURSAL;
const GOOGLE_MAPS = `https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`;
const WAZE = `https://waze.com/ul?ll=${LAT},${LNG}&navigate=yes`;

// Mapa Leaflet + CARTO (igual que en Ionic) dentro de un WebView.
function mapHtml(dark: boolean, c: { primary: string; card: string; text: string; onPrimary: string }) {
  const tile = (t: string) => `https://{s}.basemaps.cartocdn.com/${t}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{margin:0;height:100%;background:${dark ? '#0B1220' : '#F3F7FB'};font-family:-apple-system,Roboto,sans-serif}
.custom-marker{background:${c.primary};border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.3)}
.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:${c.card}!important;color:${c.text}!important}
.leaflet-popup-content-wrapper{border-radius:12px!important;padding:0!important;overflow:hidden}
.leaflet-popup-content{margin:15px!important;width:auto!important}
${dark ? '.leaflet-control-zoom a,.leaflet-control-attribution{background:#202124!important;color:#e8eaed!important}.leaflet-control-zoom a{border-bottom-color:#3c4043!important}.leaflet-control-attribution a{color:#8ab4f8!important}' : ''}
.row{display:flex;align-items:center;font-size:14px;gap:10px}
.btn{width:100%;background:${c.primary};color:${c.onPrimary};border-radius:20px;padding:10px 0;margin-top:15px;font-weight:bold;display:flex;align-items:center;justify-content:center;border:0;font-size:14px}
</style></head><body><div id="map"></div><script>
var pin='<svg width="22" height="22" viewBox="0 0 512 512" fill="#fff"><path d="M256 32C167.67 32 96 96.51 96 176c0 128 160 304 160 304s160-176 160-304c0-79.49-71.67-144-160-144zm0 224a64 64 0 1164-64 64.07 64.07 0 01-64 64z"/></svg>';
var map=L.map('map').setView([${LAT},${LNG}],15);
L.tileLayer('${tile(dark ? 'dark_all' : 'light_all')}',{attribution:'&copy; OpenStreetMap &copy; CARTO',subdomains:'abcd',maxZoom:20}).addTo(map);
var icon=L.divIcon({className:'custom-marker',html:pin,iconSize:[40,40],iconAnchor:[20,40],popupAnchor:[0,-40]});
L.marker([${LAT},${LNG}],{icon:icon,title:'Nuestra Sucursal'}).addTo(map).bindPopup(
'<div style="width:250px"><div style="display:flex;align-items:center;margin-bottom:12px;border-bottom:1px solid rgba(128,128,128,.2);padding-bottom:8px">'+
'<h2 style="margin:0;font-size:16px;font-weight:600">Farmacia Juan Pablo II</h2></div>'+
'<div style="display:flex;flex-direction:column;gap:8px"><div class="row"><span>📍</span><span>Prolongación Cristobal Colón</span></div>'+
'<div class="row"><span style="color:#25D366">●</span><span><strong>WhatsApp:</strong> 495-127-8814</span></div>'+
'<div class="row"><span>📞</span><span><strong>Teléfono:</strong> 495-968-1331</span></div></div>'+
'<button class="btn" onclick="window.ReactNativeWebView.postMessage(\\'maps\\')">CÓMO LLEGAR</button></div>');
L.circle([${LAT},${LNG}],{color:'#3880ff',fillColor:'#3880ff',fillOpacity:.1,radius:500}).addTo(map);
setTimeout(function(){map.invalidateSize()},100);
</script></body></html>`;
}

export default function UbicacionPage() {
  const { colors, isDark } = useTheme();
  const [isCardVisible, setCardVisible] = useState(true);
  const [anim] = useState(() => new Animated.Value(1));
  const html = useMemo(() => mapHtml(isDark, colors), [isDark, colors]);

  useEffect(() => {
    Animated.timing(anim, { toValue: isCardVisible ? 1 : 0, duration: 400, useNativeDriver: true }).start();
  }, [isCardVisible, anim]);

  const onMapMessage = useCallback((data: string) => { if (data === 'maps') Linking.openURL(GOOGLE_MAPS); }, []);

  const openDirections = () => showAlert({
    header: '¿Cómo quieres llegar?',
    buttons: [
      { text: 'Abrir en Google Maps', handler: () => { Linking.openURL(GOOGLE_MAPS); } },
      { text: 'Abrir en Waze', handler: () => { Linking.openURL(WAZE); } },
      { text: 'Cancelar', role: 'cancel' },
    ],
  });

  const accent = colors.primary;
  const row = (icon: string, iconColor: string, label: string, value: string) => (
    <Text style={[styles.p, { color: colors.text }]}>
      <Icon name={icon} size={15} color={iconColor} /> <Text style={{ fontWeight: '700' }}>{label}</Text> {value}
    </Text>
  );

  return (
    <Screen title="Ubicación" scroll={false} padding={false}>
      <View style={{ flex: 1 }}>
        <HtmlFrame
          html={html}
          style={{ flex: 1, backgroundColor: colors.background }}
          onMessage={onMapMessage}
        />
        <Animated.View pointerEvents={isCardVisible ? 'auto' : 'none'} style={[styles.card, {
          backgroundColor: colors.card, opacity: anim,
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-500, 0] }) }],
        }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.title, { color: colors.text }]}><Icon name="business" size={22} color={accent} /> Nuestra Sucursal</Text>
            <Pressable onPress={() => setCardVisible(false)} hitSlop={8} style={{ padding: 6 }} accessibilityLabel="Cerrar">
              <Icon name="close" size={22} color={colors.medium} />
            </Pressable>
          </View>
          {row('location', accent, 'Dirección:', 'Prolongación Cristobal Colón')}
          {row('logo-whatsapp', '#25D366', 'WhatsApp:', '(52) 495-127-8814')}
          {row('call', accent, 'Teléfono:', '(52) 495-968-1331')}
          {row('time', accent, 'Horario:', '9:00 AM - 9:00 PM')}
          <Button expand icon="navigate" onPress={openDirections} style={{ marginTop: 10 }}>Cómo llegar</Button>
        </Animated.View>
        {!isCardVisible ? (
          <Pressable onPress={() => setCardVisible(true)} accessibilityLabel="Información de la sucursal"
            style={[styles.fab, { backgroundColor: colors.primary }]}>
            <Icon name="information-circle" size={26} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute', bottom: 20, left: 20, right: 20, borderRadius: 15, padding: 16, zIndex: 1000,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
  },
  title: { fontSize: 20, fontWeight: '600' },
  p: { fontSize: 14.5, marginTop: 8, lineHeight: 20 },
  fab: { position: 'absolute', left: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
