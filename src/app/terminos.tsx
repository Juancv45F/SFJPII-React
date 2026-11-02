import { useRef } from 'react';
import { ScrollViewInstance } from 'react-native';
import { LegalPage } from '../components/Legal';
import { Screen } from '../components/Screen';
import { TERMS_INTRO, TERMS_META, TERMS_SECTIONS } from '../content/legal';

export default function TerminosPage() {
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  return (
    <Screen title="Términos y Condiciones" padding={false} scrollRef={scrollRef} siteFooter>
      <LegalPage
        title="Términos y condiciones"
        lead={TERMS_INTRO}
        meta={TERMS_META}
        sections={TERMS_SECTIONS}
        scrollRef={scrollRef}
        help={{ title: '¿Tienes dudas sobre un pedido?', text: 'Te atendemos de lunes a sábado, de 9:00 a 21:00, por teléfono o WhatsApp.' }}
      />
    </Screen>
  );
}
