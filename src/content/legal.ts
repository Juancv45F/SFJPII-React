// Texto legal único (legal-documents.ts del frontend Ionic). Lo usan /privacidad, /terminos y el modal del registro.
// Si cambia de forma relevante, actualizar también la versión y la fecha.

export const PRIVACY_VERSION = '2026-11-01';
export const PRIVACY_UPDATED = '1 de noviembre de 2026';

export type LegalBlock = { p: string } | { ul: string[] } | { note: string };
export type LegalDocSection = { id: string; title: string; toc?: string; blocks: LegalBlock[] };

export const PRIVACY_INTRO = 'Farmacia Juan Pablo II, con operación en Villa Hidalgo, Jalisco, es responsable del tratamiento de los datos personales utilizados en su sitio web, aplicación instalable y servicios relacionados.';

export const PRIVACY_SECTIONS: LegalDocSection[] = [
  {
    id: 'datos', title: 'Datos personales que tratamos',
    blocks: [
      { p: 'Según las funciones que utilices, podemos recopilar:' },
      { ul: [
        'Nombre, apellidos, correo electrónico, teléfono y fotografía de perfil.',
        'Dirección, referencias y ubicación necesarias para la entrega de pedidos.',
        'Carrito, pedidos, encargos, productos consultados y preferencias de la aplicación.',
        'Datos técnicos y de seguridad, como sesiones, dirección IP, navegador, dispositivo, tokens de notificación y credenciales públicas de passkeys.',
        'Datos de uso del sitio web, como páginas visitadas, tiempo de navegación, interacciones, tipo de dispositivo, navegador, idioma y ubicación aproximada derivada de la dirección IP.',
        'Mensajes enviados al asistente y a los canales de atención de la farmacia.',
        'Identificadores, nombre, correo y fotografía proporcionados por Google o Microsoft cuando eliges iniciar sesión con esos servicios. Nunca recibimos la contraseña de esas cuentas.',
      ] },
      { note: 'El historial de pedidos puede revelar información relacionada con la salud. Se utiliza únicamente para prestar el servicio solicitado y no sustituye una consulta médica.' },
    ],
  },
  {
    id: 'finalidades', title: 'Finalidades del tratamiento',
    blocks: [{ ul: [
      'Crear, verificar, proteger y recuperar tu cuenta.',
      'Autenticarte mediante contraseña, código, passkey, Google o Microsoft.',
      'Preparar pedidos, apartados para recoger y entregas a domicilio.',
      'Informarte sobre el estado de tus pedidos y responder solicitudes de soporte.',
      'Enviarte notificaciones push en el navegador o en la aplicación, solo si lo autorizas.',
      'Medir el uso del sitio web y elaborar estadísticas para mejorar su funcionamiento, contenido y rendimiento.',
      'Administrar inventario, prevenir fraude, investigar fallas y proteger la plataforma.',
      'Cumplir obligaciones legales y conservar evidencia de operaciones cuando corresponda.',
    ] }],
  },
  {
    id: 'proveedores', title: 'Proveedores y transferencias',
    blocks: [
      { p: 'Podemos compartir únicamente los datos necesarios con proveedores que alojan la plataforma, almacenan información o imágenes, envían correos y notificaciones, prestan autenticación o procesan funciones del asistente. Entre ellos pueden estar Firebase (incluidos Firebase Cloud Messaging y Google Analytics), Render, Cloudinary, Google y Microsoft. Para mostrarte la ubicación aproximada de tus sesiones activas y alertarte de accesos nuevos, enviamos únicamente la dirección IP del inicio de sesión a un servicio de geolocalización (ipwho.is o ipapi.co); no le enviamos datos de tu cuenta. Estos proveedores tratan los datos para prestar sus servicios y conforme a sus propios avisos y condiciones.' },
      { note: 'No vendemos datos personales ni los compartimos con terceros para publicidad ajena. No enviamos a Google Analytics tu nombre, correo, teléfono, dirección ni el contenido de tus pedidos.' },
    ],
  },
  {
    id: 'almacenamiento', title: 'Cookies, analítica y notificaciones',
    blocks: [
      { p: 'La aplicación utiliza almacenamiento local, cookies o tecnologías equivalentes para mantener la sesión, recordar preferencias, conservar el carrito y proteger el acceso. Puedes cerrar sesiones activas desde Configuración.' },
      { p: 'En el sitio web utilizamos Google Analytics para Firebase, que coloca cookies e identificadores propios para obtener estadísticas de uso de forma agregada. Esta información nos ayuda a entender qué secciones se usan más y a detectar problemas; no la utilizamos para perfilarte con fines publicitarios ni la combinamos con datos de salud.' },
      { ul: [
        'Puedes bloquear o eliminar estas cookies desde la configuración de tu navegador o instalar el complemento de inhabilitación de Google Analytics. El sitio seguirá funcionando.',
        'Las notificaciones push solo se activan cuando concedes el permiso. Para ello se genera un identificador de tu navegador o dispositivo que guardamos asociado a tu cuenta. Puedes retirarlo en cualquier momento desde los ajustes del navegador o del teléfono.',
      ] },
      { note: 'Google trata estos datos conforme a su política de privacidad y puede procesarlos en servidores ubicados fuera de México.' },
    ],
  },
  {
    id: 'conservacion', title: 'Conservación y seguridad',
    blocks: [{ p: 'Conservamos los datos mientras tu cuenta esté activa y durante el tiempo necesario para atender pedidos, seguridad y obligaciones legales. Aplicamos controles técnicos y administrativos para reducir el riesgo de acceso, alteración, pérdida o divulgación no autorizada. Ningún sistema conectado a Internet puede garantizar riesgo cero.' }],
  },
  {
    id: 'arco', title: 'Derechos ARCO y retiro del consentimiento', toc: 'Derechos ARCO',
    blocks: [{ p: 'Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos, incluida la oposición al uso de analítica, actualizar tu información o retirar tu consentimiento mediante los canales de atención de la farmacia. También puedes eliminar tu cuenta desde **Configuración**; la eliminación puede conservar temporalmente la información que deba mantenerse por obligaciones legales o por la atención de operaciones pendientes.' }],
  },
  {
    id: 'menores', title: 'Cuentas de menores',
    blocks: [{ p: 'La plataforma no está dirigida a menores que actúen sin la supervisión de su madre, padre o tutor. Si detectamos una cuenta creada sin la autorización necesaria, podrá ser eliminada.' }],
  },
  {
    id: 'consentimiento', title: 'Consentimiento y cambios',
    blocks: [{ p: 'Al marcar la casilla de aceptación durante el registro autorizas el tratamiento descrito en esta versión. Si actualizamos de forma relevante este aviso, publicaremos la nueva versión en la aplicación y solicitaremos un nuevo consentimiento cuando resulte necesario.' }],
  },
];

export const TERMS_INTRO = 'Bienvenido a la plataforma digital de Farmacia JP II. Al acceder, navegar o utilizar nuestra aplicación, aceptas los siguientes términos y condiciones. Por favor, léelos con atención.';
export const TERMS_META = 'Aplican a la tienda en línea, la aplicación instalable y los pedidos a domicilio o para recoger.';

export const TERMS_SECTIONS: LegalDocSection[] = [
  {
    id: 'cuenta', title: 'Uso de la cuenta',
    blocks: [{ ul: [
      'Para realizar compras, el usuario debe crear una cuenta proporcionando información veraz y actualizada.',
      'El usuario es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran bajo su cuenta.',
    ] }],
  },
  {
    id: 'disponibilidad', title: 'Disponibilidad de productos y stock', toc: 'Disponibilidad y stock',
    blocks: [
      { p: 'Nuestro sistema muestra el inventario en tiempo real. Sin embargo, en casos excepcionales de alta demanda, un producto podría agotarse justo en el momento de la confirmación.' },
      { p: 'En tal caso, nos comunicaremos contigo para ofrecerte una alternativa o la cancelación del pedido sin costo.' },
      { note: 'La venta de medicamentos que requieran receta médica estará sujeta a la validación física del documento al momento de la entrega.' },
    ],
  },
  {
    id: 'precios', title: 'Precios y pagos',
    blocks: [
      { p: 'Todos los precios mostrados en la aplicación están en moneda local e incluyen los impuestos aplicables.' },
      { p: 'El pago se realizará mediante los métodos habilitados en la plataforma (por ejemplo, pago en efectivo a la entrega). Nos reservamos el derecho de modificar los precios sin previo aviso, respetando siempre el precio confirmado al momento de finalizar tu pedido.' },
    ],
  },
  {
    id: 'envios', title: 'Envíos y entregas',
    blocks: [{ ul: [
      'Las entregas a domicilio se realizan únicamente dentro de nuestra zona de cobertura establecida.',
      'Los tiempos de entrega son estimados y pueden variar por causas de fuerza mayor (clima, tráfico, etc.).',
    ] }],
  },
  {
    id: 'devoluciones', title: 'Devoluciones y cancelaciones',
    blocks: [{ ul: [
      'Por razones de salubridad e higiene, no se aceptan devoluciones de medicamentos una vez entregados si el empaque ha sido abierto o manipulado.',
      'Las cancelaciones solo podrán realizarse si el pedido aún se encuentra en estado "Pendiente" y no ha salido a ruta de entrega.',
    ] }],
  },
  {
    id: 'suspension', title: 'Suspensión del servicio',
    blocks: [{ p: 'Nos reservamos el derecho de suspender o cancelar cuentas de usuarios que realicen un uso indebido de la plataforma, proporcionen direcciones falsas o incurran en fraudes.' }],
  },
];
