import { useRef } from 'react';
import { ScrollViewInstance } from 'react-native';
import { LegalPage } from '../components/Legal';
import { Screen } from '../components/Screen';
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED, PRIVACY_VERSION } from '../content/legal';

export default function PrivacidadPage() {
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  return (
    <Screen title="Aviso de Privacidad" padding={false} scrollRef={scrollRef} siteFooter>
      <LegalPage
        title="Aviso de privacidad"
        lead={PRIVACY_INTRO}
        meta={`Versión ${PRIVACY_VERSION} · Última actualización: ${PRIVACY_UPDATED}`}
        sections={PRIVACY_SECTIONS}
        scrollRef={scrollRef}
        help={{ title: '¿Quieres ejercer tus derechos?', text: 'Llámanos o escríbenos y te ayudamos con tu solicitud de acceso, corrección o eliminación de datos.' }}
      />
    </Screen>
  );
}
