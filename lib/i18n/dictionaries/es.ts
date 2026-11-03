import type { DeepPartial } from "../types";
import type { Dictionary } from "./en";

/** ES — full homepage catalog (WP2). App-route catalogs land in WP5/WP7. */
const es: DeepPartial<Dictionary> = {
  meta: {
    title: "MECHA — El copiloto de IA de tu coche",
    description:
      "MECHA lee las luces de advertencia, los códigos de error y los síntomas de tu coche, explica en lenguaje sencillo qué puede estar mal y te dice cuál es un precio justo de reparación — antes de que pagues a nadie.",
  },
  header: {
    navDiagnose: "Diagnosticar",
    navPricing: "Precios",
    navShops: "Para talleres",
    signIn: "Iniciar sesión",
    joinWaitlist: "Únete a la lista de espera",
    themeToggleLabel: "Cambiar entre tema claro y oscuro",
    languageLabel: "Idioma",
  },
  hero: {
    eyebrow: "El copiloto de IA de tu coche",
    titleLine1: "Sabe qué está mal.",
    titleLine2: "Sabe cuánto debería costar.",
    sub: "Apunta MECHA a una luz de advertencia, un código de error o un ruido extraño. Recibes un diagnóstico en lenguaje sencillo, qué tan grave es y el precio justo de la reparación — antes de que un taller te dé el suyo.",
    scanCta: "Escanea tu coche",
    watchCta: "Mira cómo funciona",
    filmFairPrice: "Mira la verificación de precio justo",
    points: {
      noHardware: "Sin hardware que comprar — tu teléfono es el escáner",
      plainLanguage: "Lenguaje sencillo, en tu idioma",
      freeToStart: "Gratis para empezar — sin tarjeta",
    },
  },
  pillars: {
    eyebrow: "Qué hace MECHA",
    heading: "Tres trabajos. Un copiloto.",
    diagnose: {
      title: "Diagnosticar",
      body: "Describe un síntoma, fotografía tu tablero o escanea tu VIN. MECHA lee las luces de advertencia y los códigos de falla como lo haría un técnico maestro — y te los explica como un amigo que resulta ser uno.",
      point1: "Causas ordenadas, la más probable primero",
      point2: "Gravedad en cada resultado: sigue, conduce con cuidado o detente ahora",
      point3: "Los problemas conocidos de tu coche y los retiros abiertos, revisados automáticamente",
      detail:
        "La gravedad nunca es vaga — sigue, conduce con cuidado o detente ahora, con el motivo en palabras sencillas. Cada informe trae además el rango de precio justo y el tiempo de mano de obra que un taller justo debería necesitar, para que sepas la forma de la cuenta antes de que alguien la escriba.",
    },
    protect: {
      title: "Proteger",
      body: "Fotografía cualquier cotización y MECHA la divide línea por línea — piezas contra mano de obra — y marca cada línea con precio por encima del rango justo para ese trabajo en tu coche. Apruebas las líneas justas. Cuestionas el resto.",
      point1: "Veredictos por línea: justo, alto o un abuso",
      point2: "La comparación es el recibo — muéstrala en el mostrador",
      point3: "Los talleres en MECHA saben que la cotización será revisada",
      detail:
        "Tres veredictos, siempre en palabras — nunca solo con colores. Justo: dentro del rango para ese trabajo en tu coche. Alto: por encima — pregunta por qué. Un abuso: con precio muy por encima de lo justo — cuestiónalo antes de aprobar cualquier cosa.",
    },
    remember: {
      title: "Recordar",
      body: "Cada diagnóstico, recibo y servicio llega a la Bóveda de Salud de tu coche — una memoria que sigue al coche, no al taller. Recordatorios de mantenimiento, vigilancia de retiros y un historial en el que un futuro comprador puede confiar, en un código QR en el propio coche.",
      point1: "Las fotos de recibos se convierten en historial de servicio estructurado",
      point2: "Recordatorios de mantenimiento y registro, a tiempo",
      point3: "Un QR de MECHA para tu coche — su historial, con tu permiso",
      detail:
        "Los recibos que fotografías se convierten en registros de servicio con fecha. MECHA vigila los retiros abiertos y te recuerda el mantenimiento y el registro antes de que venzan — y cuando vendes el coche, su código QR permite que un comprador vea exactamente el historial que tú elijas compartir.",
    },
  },
  fairPrice: {
    eyebrow: "Precio justo vs su cotización",
    heading: "La cotización, revisada línea por línea.",
    body: "Esta es la revisión que MECHA hace de cualquier cotización de reparación — lo que pidió el taller, lo que el trabajo cuesta justamente en tu coche y qué líneas cuestionar antes de decir que sí.",
    exampleLabel: "Ejemplo — cifras ilustrativas",
    jobLabel: "Reemplazo del alternador",
    theirQuote: "Su cotización",
    fairRange: "Rango justo",
    total: "Total",
    verdictWord: "Alto",
    verdictText:
      "Dos líneas tienen precio por encima del rango justo para este coche. Cuestiona el margen de la pieza y el cargo por insumos antes de aprobar.",
    lines: {
      part: { name: "Alternador (pieza)", verdict: "Alto" },
      labor: { name: "Mano de obra", verdict: "Justo" },
      supplies: { name: "Cargo por insumos del taller", verdict: "Abuso" },
    },
    lineTypes: { part: "Pieza", labor: "Mano de obra", fee: "Cargo" },
  },
  howItWorks: {
    eyebrow: "Cómo funciona",
    heading: "De la luz de advertencia a la respuesta, en cuatro pasos.",
    body: "Sin escáner que comprar y sin cita que reservar. Tú empiezas con lo que puedes ver y oír — MECHA termina con lo que probablemente está mal, qué tan grave es y cuánto debería costar justamente la reparación.",
    steps: {
      describe: {
        title: "Descríbelo, fotografíalo o escanéalo",
        body: "Escribe el síntoma con tus propias palabras, fotografía la luz de advertencia de tu tablero, ingresa un código de falla o escanea tu VIN. Tu teléfono es la única herramienta que necesitas.",
      },
      ranked: {
        title: "Las causas probables, en orden",
        body: "MECHA compara el síntoma con la marca, el modelo y el historial de tu coche, y ordena las causas probables — la más probable primero, cada una con la pieza a la que apunta y lo que implica la reparación.",
      },
      severity: {
        title: "Un veredicto claro sobre la gravedad",
        body: "Cada respuesta trae uno de tres veredictos: Sigue — es seguro continuar. Conduce con cuidado — repáralo pronto. Detente ahora — no lo conduzcas; pide una grúa. Se acabó adivinar qué intenta decir una luz.",
      },
      price: {
        title: "El precio justo, antes que el taller",
        body: "Cada diagnóstico termina con el rango de precio justo de la reparación en tu coche — piezas y mano de obra — además del tiempo de mano de obra que un taller justo debería necesitar. La primera cotización que escuches será una que ya puedes juzgar.",
      },
    },
    includesTitle: "Lo que incluye cada diagnóstico",
    includes: {
      explanation: "Una explicación en lenguaje sencillo de lo que probablemente está mal",
      causes: "Las causas probables, en orden — cada una con su pieza y su precio",
      severity: "Un veredicto de gravedad: sigue, conduce con cuidado o detente ahora",
      cost: "El rango de precio justo de la reparación, piezas y mano de obra",
      labor: "El tiempo de mano de obra que un taller justo debería necesitar",
      steps: "Qué hacer a continuación, en orden",
      tip: "Un consejo de técnico — qué decir en el taller y a qué prestar atención",
      saved: "El informe guardado en la Bóveda de Salud de tu coche, con los retiros revisados",
    },
  },
  reportExample: {
    eyebrow: "Dentro de un diagnóstico",
    heading: "Esta es la respuesta que recibes.",
    body: "No es un código para buscar ni una adivinanza — es un informe sobre el que puedes actuar, y que puedes entregarle a un taller. Esta es la forma de cada informe de MECHA, mostrada con un problema de ejemplo.",
    exampleLabel: "Diagnóstico de ejemplo — ilustrativo",
    symptomLabel: "El síntoma",
    symptom: "«La luz de check-engine está encendida y el motor tiembla cuando me detengo en un semáforo».",
    severity: "Moderado — Reparar pronto",
    safeLine: "Es seguro conducir con cuidado",
    diagnosis:
      "Un cilindro está fallando — dejó de encender, así que el motor funciona con los demás. Eso es la vibración al ralentí, y es por eso que la luz está encendida.",
    fairRangeLabel: "Rango justo de reparación",
    fairRangeValue: "$180–$320",
    partsTitle: "Causas probables",
    parts: {
      coil: {
        name: "Bobina de encendido",
        likelihood: "La más probable",
        cost: "$120–$190",
        desc: "Una bobina dañada elimina la chispa de un cilindro. Una falla común, y se arregla con una sola pieza.",
      },
      plugs: {
        name: "Bujías",
        likelihood: "Posible",
        cost: "$80–$160",
        desc: "Las bujías gastadas fallan al ralentí y bajo carga. Normalmente se reemplaza el juego completo.",
      },
      injector: {
        name: "Inyector de combustible",
        likelihood: "Menos probable",
        cost: "$220–$380",
        desc: "Un inyector tapado deja a un cilindro sin combustible. Se revisa después de las bobinas y las bujías.",
      },
    },
    stepsTitle: "Qué hacer a continuación",
    step1: "Conduce con suavidad — sin autopistas ni cargas pesadas hasta que lo revisen.",
    step2: "Reserva un taller en los próximos días. Diles que es una falla de encendido — y muéstrales este informe.",
    step3: "Pide que prueben primero la bobina de encendido: la causa más probable y la revisión más barata.",
    tipLabel: "Consejo del técnico",
    tip: "Si la luz de check-engine empieza a parpadear, deja de conducir. Una luz que parpadea significa que la falla es tan grave que puede dañar el convertidor catalítico — una cuenta mucho mayor.",
    disclaimer:
      "Un ejemplo, con detalles ilustrativos. Tu propio informe se genera a partir de los síntomas reales de tu coche. Los diagnósticos son informativos y nunca sustituyen la inspección práctica de un mecánico.",
  },
  businesses: {
    eyebrow: "Cerca de ti, cuando importa",
    heading: "La ayuda correcta, a minutos del coche.",
    body: "Un diagnóstico dice qué está mal. La siguiente pregunta es quién puede arreglarlo — o venir por él. Ingresa un código postal, o deja que MECHA use tu ubicación, y la respuesta es una lista pensada para un conductor bajo presión.",
    shops: {
      title: "Talleres de reparación cerca de ti",
      body: "Talleres a tu alrededor, el más cercano primero — encontrados mientras el diagnóstico sigue en tu pantalla, para que la primera llamada empiece con respuestas.",
      point1: "Una respuesta sencilla arriba: «6 talleres cerca de ti»",
      point2: "Cada anuncio empieza con el nombre del taller, luego su distancia hasta ti",
      point3: "El número de teléfono es el botón — un toque y ya estás hablando con el taller",
    },
    towing: {
      title: "Grúa, cuando el coche no puede moverse",
      body: "Cuando el veredicto es Detente ahora, la misma búsqueda muestra las compañías de grúa que atienden tu punto exacto — porque un conductor varado necesita un camión, no un directorio.",
      point1: "Ordenados por distancia — la ayuda más cercana va primero",
      point2: "Anuncios con el nombre primero y llamada con un toque, legibles al borde de la carretera",
      point3: "Las compañías indican el área que atienden, así solo llamas a grúas que sí pueden llegar a ti",
    },
    forBusiness: {
      title: "¿Tienes un taller, o una grúa?",
      body: "Anuncia tu negocio y los conductores cerca de ti te encuentran por código postal en el momento en que necesitan ayuda — tu nombre primero, tu número a un toque, y un cliente que ya conoce el precio justo.",
      cta: "Anuncia tu negocio",
    },
    marketplace: {
      title: "El mercado",
      body: "Vehículos en venta, anunciados de la manera honesta: fotos guiadas — frente, parte trasera, ambos lados, el tablero y el vehículo completo — una descripción real, el precio y los problemas conocidos declarados por el vendedor desde el inicio.",
      cta: "Explorar el mercado",
    },
  },
  pricing: {
    eyebrow: "Precios",
    heading: "Gratis para empezar. Honesto con el medidor.",
    body: "Cada cuenta empieza con 5 diagnósticos gratis. Después de cada uno, MECHA te dice exactamente cuántos te quedan — 4, luego 3, luego 2 — y al llegar a cero, tú eliges: suscribirte, o parar. Nunca se te cobra nada a escondidas.",
    free: {
      name: "Gratis",
      price: "$0",
      period: "Sin tarjeta",
      point1: "5 diagnósticos, contados en tu cuenta — no en un navegador ni en una sesión",
      point2: "Un medidor visible, y la cuenta regresiva después de cada diagnóstico",
      point3: "El rango de precio justo en cada informe",
      point4: "Tu Bóveda de Salud: historial, vigilancia de retiros y recordatorios",
      cta: "Empieza gratis",
    },
    pro: {
      name: "Pro",
      price: "$9.99",
      period: "Por mes",
      badge: "Para conductores",
      point1: "Diagnósticos ilimitados — el medidor desaparece",
      point2: "Análisis profundo para los problemas que se resisten a una primera respuesta",
      point3: "Todo lo de Gratis, sin la cuenta regresiva",
      point4: "Miembros tempranos: 3 meses de Pro gratis, precio de lanzamiento bloqueado de por vida",
      cta: "Hazte Pro",
    },
    shops: {
      name: "Talleres",
      price: "$149",
      period: "Por mes, por ubicación",
      badge: "Para talleres y grúas",
      point1: "Tu negocio en la lista cercana desde la que llaman los conductores",
      point2: "Nombre primero, distancia visible, un toque para llamarte",
      point3: "Conductores que llegan ya conociendo el precio justo",
      point4: "Anuncios para talleres de reparación y compañías de grúa por igual",
      cta: "Anuncia tu negocio",
    },
    meterTitle: "El medidor, a plena vista",
    meterNote:
      "La cuenta gratuita está ligada a ti — tu correo y tu número de teléfono — nunca a una cookie del navegador ni a una sola sesión. Cerrar sesión y volver a registrarte no la reinicia, y no está pensada para eso: cinco diagnósticos gratis por persona es el trato, y el trato es el mismo para todos.",
  },
  faq: {
    eyebrow: "Preguntas",
    heading: "Preguntado, y respondido sin rodeos.",
    items: {
      accuracy: {
        q: "¿Qué tan preciso es un diagnóstico de MECHA?",
        a: "MECHA ordena las causas más probables de tus síntomas, explica cada una y te da el precio justo de la reparación. Es el mejor punto de partida posible — y una protección real en el mostrador — pero no sustituye las manos de un mecánico sobre el coche. MECHA lo dice él mismo, en cada informe.",
      },
      freeEnd: {
        q: "¿Qué pasa cuando se acaban mis 5 diagnósticos gratis?",
        a: "Lo verás venir: después de cada diagnóstico, MECHA te dice cuántos te quedan. Al llegar a cero, los diagnósticos se pausan hasta que elijas Pro. No se cobra nada automáticamente, y tu cuenta, tus coches y tu historial quedan exactamente donde están.",
      },
      reset: {
        q: "¿Puedo reiniciar la cuenta gratuita registrándome de nuevo?",
        a: "No — y es a propósito. La cuenta está ligada a la identidad de tu cuenta, tu correo y tu número de teléfono, así que un registro nuevo con los mismos datos retoma el mismo medidor. Cinco diagnósticos gratis por persona mantiene el trato justo para todos.",
      },
      hardware: {
        q: "¿Necesito comprar un escáner o algún hardware?",
        a: "No. Tu teléfono es el escáner: describe el síntoma, fotografía la luz de advertencia, escribe un código de falla o escanea el VIN.",
      },
      languages: {
        q: "¿Qué idiomas habla MECHA?",
        a: "El sitio y la app hablan hoy inglés, español, francés y criollo haitiano, y tu diagnóstico se responde en tu idioma. Se están agregando más idiomas — MECHA está hecho para conductores en todas partes, no solo para quienes hablan inglés.",
      },
      privacy: {
        q: "¿Quién puede ver el historial de mi coche?",
        a: "Tú. Tu Bóveda de Salud pertenece a tu cuenta, y el historial QR de tu coche se comparte solo con tu permiso — por ejemplo, cuando vendes el coche y decides mostrarle su registro a un comprador.",
      },
      business: {
        q: "Tengo un taller — o una grúa. ¿Cómo me anuncio?",
        a: "Crea una cuenta de negocio con tu nombre, tu número de teléfono y tu código postal. Los conductores cerca de ti te encuentran entonces en la lista cercana: tu nombre primero, tu distancia visible, un toque para llamar.",
      },
    },
  },
  waitlist: {
    eyebrow: "Beta privada",
    heading: "Entra antes de que se abran las puertas.",
    body: "MECHA está en beta privada. Únete a la lista de espera con tu correo — los primeros miembros reciben 3 meses de Pro gratis y su precio de lanzamiento bloqueado de por vida.",
    placeholder: "tu@ejemplo.com",
    button: "Únete a la lista de espera",
    note: "Un solo correo cuando tu invitación esté lista. Nada más, nunca.",
    success: "Ya estás en la lista. Revisa tu bandeja para la invitación.",
    errorInvalid: "Ese correo parece incompleto — revísalo e inténtalo de nuevo.",
    errorStub:
      "La lista de espera abre con el sitio nuevo — tu correo aún no se guardó. (Versión base WP2.)",
  },
  footer: {
    tagline: "El copiloto de IA de tu coche — diagnóstico, protección de precio justo y una memoria para tu coche.",
    support: "Soporte",
    privacy: "Privacidad",
    terms: "Términos",
    contact: "Contacto",
    rights: "Todos los derechos reservados.",
    operator: "MECHA Technologies, Inc.",
    disclaimer:
      "Los diagnósticos de MECHA son solo informativos y no sustituyen la inspección de un mecánico certificado.",
  },
};

export default es;
