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
    createAccount: "Crear cuenta",
    themeToggleLabel: "Cambiar entre tema claro y oscuro",
    languageLabel: "Idioma",
    logoHomeLabel: "MECHA — inicio",
    logoAppLabel: "MECHA — inicio de la app",
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
        a: "MECHA habla trece idiomas: inglés, español, francés, criollo haitiano, portugués, alemán, italiano, polaco, ruso, ucraniano, turco, árabe y hebreo. El diagnóstico con IA responde en el idioma que elijas.",
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
  diagnosePage: {
    eyebrow: "MECHA Diagnose",
    heading: "Empieza por el síntoma. Termina con un plan.",
    sub: "Una luz de advertencia, un sonido extraño, un código de una tienda de repuestos — como sea que se anuncie el problema, MECHA lo convierte en causas ordenadas, un veredicto claro de gravedad, el precio justo y qué hacer después.",
    primaryCta: "Diagnosticar mi coche",
    scanCta: "Explorar Scan",
    accountNote:
      "Escanear un VIN, identificar una luz y comprobar un código son gratis. Un diagnóstico completo usa uno de tus 5 diagnósticos gratis, y el medidor siempre se muestra antes y después.",
    modes: {
      eyebrow: "Tres formas de entrar",
      heading: "Empieza con lo que sea que te dé el coche.",
      body: "No necesitas el vocabulario correcto ni una herramienta propia. Empieza desde una descripción, una fotografía, un VIN o un código de falla — cada camino reúne un tipo distinto de evidencia para el mismo informe.",
      describe: {
        kicker: "01 — Describir",
        title: "Dilo con tus propias palabras",
        body: "Escribe lo que ves, oyes, sientes o hueles, y cuándo ocurre. “Vibra cuando me detengo”, “hace clic cuando giro” y “huele dulce después de conducir” son buenos puntos de partida.",
        detail:
          "Agrega el coche y todo lo que haya cambiado — una reparación reciente, un sonido nuevo, una luz que apareció y desapareció. El diagnóstico pesa el síntoma contra el vehículo y su historial, en lugar de tratar a todos los coches como si fueran el mismo.",
        point1: "Ideal para sonidos, vibraciones, olores, fugas y problemas intermitentes",
        point2: "No se requiere vocabulario técnico",
        point3: "Se ejecuta como un diagnóstico completo, con el informe entero",
        cta: "Describir un síntoma",
      },
      photo: {
        kicker: "02 — Fotografía",
        title: "Deja que el tablero hable",
        body: "Fotografía el panel de instrumentos y MECHA nombra cada luz de advertencia que pueda identificar, la explica en lenguaje claro y califica la urgencia.",
        detail:
          "Una foto identifica la luz — no la falla oculta debajo de ella. Cuando la luz apunta a algo más profundo, el flujo pasa esos hallazgos a un diagnóstico completo, en lugar de fingir que la imagen respondió todo.",
        point1: "Nombra y explica los símbolos encendidos",
        point2: "Califica la urgencia con los mismos tres veredictos de gravedad",
        point3: "Puede pasar a un diagnóstico completo con un toque",
        cta: "Fotografiar un tablero",
      },
      scan: {
        kicker: "03 — Escanear o ingresar un código",
        title: "Usa los identificadores del propio coche",
        body: "Decodifica el VIN de 17 caracteres para identificar el vehículo exacto y consultar retiros abiertos, o ingresa un código de falla como P0420 para obtener una traducción en lenguaje claro.",
        detail:
          "El VIN ancla la compatibilidad, las causas probables y los precios de reparación al año, la marca, el modelo y el motor correctos. Un código agrega una pista del sistema; el diagnóstico completo convierte esa pista en causas ordenadas y un rango justo.",
        point1: "Decodificación de VIN más consulta de retiros abiertos de NHTSA",
        point2: "Formato del código de falla comprobado al instante",
        point3: "Guarda el coche decodificado en tu Bóveda de Salud",
        cta: "Ver cómo funciona Scan",
      },
    },
    report: {
      eyebrow: "Dentro del informe",
      heading: "Ocho cosas que te da cada diagnóstico completo.",
      body: "El resumen de la página principal es solo el esquema. Un informe completo explica el razonamiento y las consecuencias prácticas, para que la respuesta pueda usarse en casa, en la carretera o frente al mostrador de un taller.",
      items: {
        explanation: {
          title: "Explicación en lenguaje claro",
          body: "Lo que probablemente está pasando dentro del coche, por qué produce el síntoma que notaste y dónde permanece la incertidumbre. Los términos técnicos se traducen en lugar de repetírtelos.",
        },
        causes: {
          title: "Causas probables, ordenadas",
          body: "Las causas probables se ordenan de la más a la menos probable. Cada una nombra la pieza, lo que implica la reparación y su costo estimado, para que una revisión más barata no quede enterrada bajo una suposición mayor.",
        },
        severity: {
          title: "Veredicto de gravedad",
          body: "Una de tres respuestas explícitas — Conduce, Conduce con cuidado o Detente ahora — con su razón. El veredicto nunca se comunica solo por color, y está vinculado a los síntomas del informe.",
        },
        cost: {
          title: "Rango de precio justo",
          body: "Un rango para la reparación de tu coche, incluyendo piezas y mano de obra. Te da una comparación antes de que un taller escriba una cotización, no una promesa de que todos los talleres cobrarán lo mismo.",
        },
        labor: {
          title: "Tiempo justo de mano de obra",
          body: "El tiempo de mano de obra que un taller justo debería necesitar para el trabajo. Cuando una cotización depende de una mano de obra inusualmente alta, esta es la línea que hace visible la diferencia.",
        },
        steps: {
          title: "Qué hacer después, en orden",
          body: "La acción inmediata, las revisiones que conviene pedir primero y lo que puede esperar. El orden importa: favorece la verificación más probable y menos costosa antes del trabajo mayor.",
        },
        tip: {
          title: "Consejo del técnico",
          body: "Una nota práctica sobre qué decir en el taller, qué vigilar mientras conduces o qué cambio en el síntoma significa que la situación se volvió más urgente.",
        },
        saved: {
          title: "Guardado en la Bóveda de Salud",
          body: "El informe pasa a formar parte del historial del coche, junto con las consultas de retiros y los registros de servicio posteriores. El próximo diagnóstico, y una futura conversación de reparación, pueden empezar con contexto en lugar de una página en blanco.",
        },
      },
    },
    severity: {
      eyebrow: "Guía de gravedad",
      heading: "Tres veredictos. Nada de adivinar qué significa una luz.",
      body: "Cada diagnóstico usa las mismas palabras. Son una guía a partir de la evidencia del informe — si el coche se siente inseguro, pierde potencia, se sobrecalienta, echa humo o una advertencia empieza a parpadear, gana la acción más segura.",
      drive: {
        title: "Conduce",
        body: "El informe no señala una razón para detenerte de inmediato. Mantén el síntoma en observación y programa la revisión recomendada dentro del mantenimiento normal.",
        detail:
          "Conducir no es una garantía de que no pasa nada. Significa que la evidencia respalda continuar mientras vigilas los cambios y sigues los pasos siguientes.",
      },
      careful: {
        title: "Conduce con cuidado",
        body: "El problema merece atención pronta. Limita la conducción exigente, evita las cargas pesadas cuando el informe lo indique y reserva la inspección pronto.",
        detail:
          "Si el síntoma empeora, aparece una nueva advertencia o el coche empieza a perder potencia, trata la situación como más urgente que el veredicto original.",
      },
      stop: {
        title: "Detente ahora",
        body: "No sigas conduciendo con este problema. Detente en un lugar seguro, apaga el coche cuando se te aconseje y usa la ayuda cercana o una grúa, en lugar de tratar de llegar a casa.",
        detail:
          "Este veredicto existe para problemas en los que seguir conduciendo puede crear un riesgo de seguridad o convertir una falla reparable en un daño mucho mayor.",
      },
    },
    speed: {
      eyebrow: "Hecho para la carretera",
      heading: "La respuesta empieza a llegar en vivo.",
      body: "Un diagnóstico se entrega como un flujo: el informe empieza a aparecer mientras el resto aún se está escribiendo, en lugar de dejarte ante una pantalla de espera en blanco hasta que termine cada palabra.",
      detail:
        "Esa es la respuesta directa de la reconstrucción a la experiencia anterior — un flujo moderno, del síntoma al informe, con la gravedad, las causas y el rango justo llegando como una sola respuesta estructurada.",
      note: "El tiempo real depende de la conexión y de la complejidad del problema. MECHA no rellena una espera con un resultado inventado.",
    },
    meter: {
      title: "Cinco diagnósticos completos, gratis",
      body: "Tu cuenta gratuita pertenece a la identidad de tu cuenta — correo y teléfono — y sobrevive al cierre de sesión. Después de cada diagnóstico, MECHA indica cuántos quedan. Al llegar a cero, los diagnósticos se pausan hasta que elijas Pro; no se cobra nada automáticamente.",
    },
    final: {
      eyebrow: "Empieza gratis",
      heading: "Tráele a MECHA el problema que tienes hoy.",
      body: "Crea la cuenta gratuita, agrega el coche y ejecuta el primer diagnóstico. El informe, el rango justo y el historial son tuyos para conservarlos.",
      cta: "Crea una cuenta gratuita",
      secondaryCta: "Diagnosticar ahora",
    },
  },
  pricingPage: {
    eyebrow: "Precios, por completo",
    heading: "Elige según el trabajo que tienes enfrente.",
    sub: "Los planes son sencillos a propósito: empieza gratis, elimina el medidor de diagnósticos con Pro, o coloca una ubicación de negocio frente a conductores cercanos con Talleres. Los detalles — incluida la facturación — están en esta página, no enterrados después del pago.",
    decision: {
      eyebrow: "Para quién es cada plan",
      heading: "El tamaño correcto, sin un laberinto de niveles.",
      body: "La diferencia entre los planes es el trabajo que resuelven, no un paquete de límites artificiales.",
      free: {
        title: "Gratis — descubre qué está mal",
        body: "Para un conductor frente a una luz de advertencia o un síntoma desconocido que necesita una primera respuesta creíble antes de pagar una reparación.",
        detail:
          "Recibes 5 diagnósticos completos, el rango de precio justo en cada informe y la Bóveda de Salud. No se requiere tarjeta para empezar, y la cuenta restante siempre es visible.",
      },
      pro: {
        title: "Pro — elimina el medidor",
        body: "Para conductores que diagnostican más que un problema ocasional, persiguen una falla intermitente o quieren el nivel de análisis profundo disponible cuando una primera respuesta no basta.",
        detail:
          "Pro ofrece diagnósticos estándar ilimitados y análisis profundo para problemas resistentes, manteniendo la Bóveda y la protección de precio justo de Gratis.",
      },
      shops: {
        title: "Talleres — estar cerca cuando importa",
        body: "Para una ubicación de taller de reparación o de grúa que quiere aparecer en los resultados cercanos de MECHA cuando un conductor está listo para llamar.",
        detail:
          "El plan es por ubicación, no por empresa en abstracto. El nombre de tu negocio encabeza el anuncio, la distancia se muestra y el número de teléfono es la acción de llamada con un toque.",
      },
    },
    billing: {
      eyebrow: "Facturación, sin trampas",
      heading: "Suscríbete cuando quieras. Cancela cuando quieras.",
      body: "Los planes pagados se gestionan mediante el pago web y las herramientas de facturación de la cuenta de MECHA. El plan, el estado y el período actual se muestran en el panel con palabras claras.",
      point1: "El pago web puede mostrar tarjetas, además de Apple Pay y Google Pay, cuando esas billeteras estén disponibles en el dispositivo y el navegador",
      point2: "Una sola acción, “Administrar o cancelar en cualquier momento”, abre la facturación para un suscriptor",
      point3: "Una cancelación programada se muestra como fecha de finalización, en lugar de ocultarse detrás de una etiqueta de renovación",
      point4: "Gratis no requiere tarjeta, y agotar los 5 diagnósticos gratis nunca inicia un plan pagado por sí solo",
      note: "La disponibilidad de las billeteras la decide el dispositivo de pago, el navegador y la configuración de la cuenta de Stripe. MECHA no promete un botón de billetera donde la plataforma no pueda ofrecerlo.",
    },
    faq: {
      eyebrow: "Preguntas de precios",
      heading: "Facturación, respondida antes del pago.",
      items: {
        card: {
          q: "¿Necesito una tarjeta de crédito para el plan gratuito?",
          a: "No. Gratis empieza sin tarjeta. Recibes 5 diagnósticos completos, y MECHA muestra la cuenta restante después de cada uno.",
        },
        cancel: {
          q: "¿Cómo cancelo un plan pagado?",
          a: "Abre la sección de facturación en tu panel y elige “Administrar o cancelar en cualquier momento”. La cuenta muestra el estado del plan y, cuando una cancelación está programada, la fecha en que termina el período pagado.",
        },
        payments: {
          q: "¿Puedo pagar con Apple Pay o Google Pay?",
          a: "En el pago web, Stripe puede ofrecer Apple Pay y Google Pay junto a las tarjetas cuando la billetera esté activada y disponible en tu dispositivo y navegador. Si una billetera no está disponible, la opción de tarjeta permanece.",
        },
        freeEnd: {
          q: "¿Qué pasa cuando los diagnósticos gratis llegan a cero?",
          a: "Los diagnósticos se pausan. Tu cuenta, tus coches, tus informes y tu historial de la Bóveda siguen disponibles, y no se cobra nada automáticamente. Tú eliges si quieres empezar Pro.",
        },
        early: {
          q: "¿Qué reciben los miembros tempranos?",
          a: "La oferta vigente para miembros tempranos es 3 meses de Pro gratis y el precio de lanzamiento bloqueado de por vida. Está vinculada al plan Pro de esta página; MECHA no agrega un nivel sorpresa por separado al pagar.",
        },
        business: {
          q: "¿El plan Talleres se cobra por empresa o por ubicación?",
          a: "Por ubicación — $149 al mes por cada ubicación anunciada de taller o grúa. Un negocio que quiere anunciar otra ubicación usa un plan para esa ubicación.",
        },
      },
    },
    final: {
      eyebrow: "Sin tarjeta para empezar",
      heading: "Usa primero los diagnósticos gratis.",
      body: "Deja que el producto se pruebe con un problema real. Mejora tu plan solo cuando el medidor o el anuncio de negocio resuelvan un problema que de verdad tienes.",
      cta: "Empieza gratis",
      businessCta: "Anuncia un negocio",
    },
  },
  shopsPage: {
    eyebrow: "Para talleres y grúas",
    heading: "Sé el nombre al que un conductor puede llamar.",
    sub: "Cuando MECHA le dice a un conductor que se detenga ahora o que busque ayuda pronto, los negocios cercanos pasan a ser el siguiente paso. Un anuncio está hecho para ese momento: tu nombre primero, tu distancia claramente mostrada y tu número de teléfono listo para tocar.",
    primaryCta: "Crea una cuenta de negocio",
    nearbyCta: "Ver la búsqueda cercana",
    listing: {
      eyebrow: "Qué te da el anuncio",
      heading: "Un perfil hecho para un conductor bajo presión, no una página de directorio.",
      body: "El anuncio lleva los datos que un conductor necesita para elegir y llamar. No entierra el número de teléfono bajo texto de marketing ni hace que el nombre del negocio compita con calificaciones decorativas.",
      profile: {
        title: "La identidad del negocio",
        body: "El nombre de tu negocio, tu número de teléfono y tu ubicación basada en el código postal identifican el anuncio. El nombre es el elemento principal, porque el reconocimiento y la confianza empiezan ahí.",
      },
      serviceArea: {
        title: "El área de servicio correcta",
        body: "Los talleres de reparación se presentan alrededor del coche; las compañías de grúa además llevan el área de servicio que eligen, para que los conductores sean dirigidos a una ayuda que realmente puede llegar hasta ellos.",
      },
      presentation: {
        title: "Nombre, distancia, llamada",
        body: "Los resultados se ordenan por distancia y se abren con una cuenta clara. Cada resultado encabeza con el nombre del negocio, muestra a qué distancia está y convierte el número de teléfono en la acción de llamada.",
      },
      control: {
        title: "Tu cuenta sigue siendo tuya",
        body: "El panel del negocio lleva el perfil y el estado del plan. El estado de facturación es visible, y la suscripción puede administrarse o cancelarse desde el camino de facturación de la cuenta.",
      },
    },
    plan: {
      eyebrow: "El plan Talleres",
      heading: "Una ubicación. Un precio mensual claro.",
      body: "El plan Talleres coloca una ubicación de reparación o grúa dentro de la experiencia cercana de MECHA para conductores que usan el flujo de diagnóstico y la búsqueda de carretera.",
      priceLabel: "Por mes, por ubicación",
      point1: "Un anuncio cercano para una ubicación de taller de reparación o de grúa",
      point2: "Presentación con el nombre primero, distancia y llamada con un toque",
      point3: "Conductores que pueden llegar con un diagnóstico y el rango de precio justo ya en mano",
      point4: "Panel del negocio, estado del plan y controles para administrar o cancelar la facturación",
      note: "Un anuncio hace que el negocio se pueda descubrir en los resultados cercanos. No garantiza una cantidad particular de llamadas, trabajos o ingresos — la demanda de los conductores y la distancia deciden quién llama.",
      cta: "Anuncia tu negocio",
    },
    parts: {
      eyebrow: "Pedido de piezas",
      heading: "De la pieza nombrada al enlace de pedido.",
      body: "Cuando un diagnóstico terminado nombra una pieza, MECHA puede construir enlaces de minoristas para ese trabajo y vehículo exactos. Para un taller, eso se convierte en un camino práctico de pedido desde el informe, en lugar de una búsqueda nueva escrita de memoria.",
      point1: "Los enlaces llevan el año, la marca, el modelo y el motor del vehículo cuando esos datos se conocen",
      point2: "La misma lista de piezas sirve a conductores que lo hacen ellos mismos, propietarios con experiencia y pedidos de talleres",
      point3: "El precio en vivo se comprueba en el minorista; MECHA etiqueta su propia cifra como una estimación, no como un precio de tienda",
      disclosure:
        "Los enlaces de piezas pueden hacer que MECHA gane una comisión. El aviso acompaña al bloque, el enlace no cambia el precio en el minorista, y los enlaces de afiliados nunca influyen en el diagnóstico — se construyen solo después de que el veredicto está completo. Un descuento para el comprador se muestra solo cuando los términos reales del programa de un minorista lo ofrecen.",
    },
    faq: {
      eyebrow: "Preguntas de propietarios",
      heading: "Para talleres y grúas, respondido sin rodeos.",
      items: {
        eligibility: {
          q: "¿Qué negocios pueden anunciarse?",
          a: "Los talleres de reparación y las compañías de grúa pueden crear una cuenta de negocio con el nombre del negocio, el número de teléfono y el código postal. El tipo de cuenta controla cómo se presenta el negocio en los resultados cercanos.",
        },
        guarantee: {
          q: "¿MECHA garantiza llamadas o trabajos?",
          a: "No. Un anuncio coloca el negocio en los resultados cercanos, ordenados por distancia, cuando los conductores buscan. MECHA no garantiza volumen de llamadas, trabajo reservado ni ingresos.",
        },
        prepared: {
          q: "¿Qué sabe un conductor antes de llamar?",
          a: "Un conductor puede llegar con el informe de diagnóstico: las causas probables, un veredicto de gravedad, el rango justo de reparación y los pasos siguientes. Eso puede hacer que la primera conversación empiece desde la evidencia, en lugar de un síntoma vago.",
        },
        cost: {
          q: "¿Cuánto cuesta el plan para negocios?",
          a: "El plan Talleres cuesta $149 al mes, por ubicación. Un taller de reparación y una compañía de grúa usan el mismo plan de negocio por ubicación.",
        },
        cancel: {
          q: "¿Un negocio puede cancelar?",
          a: "Sí. La sección de facturación del panel ofrece el camino para administrar o cancelar, y el estado del plan y el fin del período se muestran con palabras claras.",
        },
        parts: {
          q: "¿Cómo ayudan los enlaces de piezas a un taller?",
          a: "Un informe terminado puede convertir las piezas nombradas en enlaces de minoristas ajustados al vehículo, lo que ahorra una búsqueda por separado y mantiene los datos del vehículo vinculados al camino de pedido. El precio en vivo y la disponibilidad se confirman en el minorista.",
        },
      },
    },
    final: {
      eyebrow: "Anuncia la ubicación",
      heading: "Pon el negocio donde aparece la necesidad.",
      body: "Crea la cuenta de negocio, agrega la ubicación que los conductores deben encontrar y prepárate para la llamada que empieza con un diagnóstico.",
      cta: "Crea una cuenta de negocio",
      pricingCta: "Ver precios completos",
    },
  },
  finalCta: {
    eyebrow: "Gratis para empezar",
    heading: "Tus primeros 5 diagnósticos corren por nuestra cuenta.",
    body: "Crea una cuenta gratuita y MECHA viaja contigo desde la primera luz de advertencia. Describe el síntoma, fotografía el tablero o escanea el VIN — recibes la respuesta en lenguaje sencillo, qué tan grave es y el precio justo, antes de que un taller te dé el suyo.",
    cta: "Crea tu cuenta gratuita",
    note: "No se requiere tarjeta. MECHA siempre te dice exactamente cuántos diagnósticos gratuitos te quedan.",
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
  scan: {
    landing: {
      eyebrow: "MECHA Scan",
      heading: "Apunta. Escanea. Descubre qué está mal.",
      sub: "Tu auto ya te está diciendo qué está mal: en un código de barras, en las luces del tablero, en los códigos de falla. Scan lee los tres y responde en lenguaje claro, con el precio justo incluido.",
      startCta: "Iniciar un escaneo",
      registerCta: "Crea una cuenta gratuita",
      accountNote:
        "Cuenta gratuita: tus primeros 5 diagnósticos son gratis, y MECHA siempre te dice exactamente cuántos te quedan.",
      vinKicker: "01 — Escaneo de VIN",
      vinHeading: "El código de barras es el acta de nacimiento del auto",
      vinBody:
        "Cada auto lleva su identidad en un VIN de 17 caracteres. Decodifícalo y MECHA sabe exactamente qué auto está mirando: el motor correcto, las piezas correctas, los precios de reparación correctos, y consulta NHTSA para ver si ese vehículo exacto tiene recalls abiertos. Guárdalo y el auto se convierte en un registro permanente en tu Health Vault.",
      vinSteps: [
        "Encuentra el código de barras: en el marco de la puerta del conductor o en la esquina inferior del parabrisas.",
        "Escribe los 17 caracteres, o fotografía la placa para verificarlos.",
        "Ve el auto exacto: año, marca, modelo, motor, además de los recalls abiertos.",
      ],
      photoKicker: "02 — Foto del tablero",
      photoHeading: "Una luz de advertencia, explicada en lenguaje claro",
      photoBody:
        "Las luces de advertencia hablan en símbolos, y el manual nunca está en el auto. Fotografía el tablero y MECHA nombra cada símbolo encendido, explica lo que significa y califica la urgencia: detente ahora, repáralo pronto, o mantente atento. Cuando una luz merece una respuesta más profunda, un toque convierte la foto en un diagnóstico completo.",
      photoSteps: [
        "Fotografía el tablero: encendido puesto, cerca y sin moverte.",
        "Recibe el nombre y el significado: cada luz encendida, en lenguaje claro, con su urgencia.",
        "Profundiza cuando importa: pasa a un diagnóstico completo con las luces ya incluidas.",
      ],
      photoHonestTitle: "Lo que una foto puede — y no puede — hacer",
      photoHonestBody:
        "Una foto muestra qué luz está encendida, no el código de falla que hay debajo. MECHA identifica la luz y la explica; el diagnóstico completo investiga las causas. Eso es una evaluación inicial, no magia, y no lo disfrazaremos de otra cosa.",
      codeKicker: "03 — Código de falla",
      codeHeading: "¿Tienes un código como P0420? Recibe la traducción",
      codeBody:
        "Una tienda de repuestos escanea tu auto gratis y te entrega un código, y luego te deja adivinando cuánto cuesta. Escribe el código en MECHA y recibe la traducción en lenguaje claro: qué significa en tu auto, las causas probables en orden, si puedes seguir conduciendo y el precio justo, antes de que cualquier taller te cotice.",
      codeSteps: [
        "Haz que lean el código: la mayoría de las tiendas de repuestos escanean gratis, o un lector de códigos lo muestra directamente.",
        "Escríbelo: MECHA verifica el formato al instante.",
        "Lee la traducción: como un diagnóstico completo, con causas, urgencia y precio justo.",
      ],
      stickerEyebrow: "La calcomanía MECHA",
      stickerHeading: "“Este auto está protegido por MECHA”",
      stickerBody:
        "Los propietarios de MECHA ponen la calcomanía QR en su auto. Significa que el historial de este auto — diagnósticos, recalls, servicio — vive en el Health Vault de su propietario, donde pertenece. Si el auto se vende algún día, ese historial puede viajar con él al próximo dueño.",
      stickerBody2:
        "¿Escaneaste la calcomanía de otra persona? Ya sabes lo que MECHA hace. Tu auto puede llevar la misma protección: la cuenta es gratis, y tus primeros 5 diagnósticos también.",
      stickerCta: "Crea tu cuenta gratuita",
    },
    app: {
      title: "Escanear",
      intro:
        "Empieza por lo que el auto ya te está mostrando: su VIN, sus luces de advertencia o un código de falla.",
      freeNote:
        "Decodificar un VIN, identificar una luz y verificar un código es gratis. Solo un diagnóstico completo cuenta contra tus diagnósticos gratuitos.",
      tabVin: "VIN",
      tabPhoto: "Foto del tablero",
      tabCode: "Código de falla",
      vinLabel: "Número de identificación del vehículo (VIN)",
      vinHint:
        "17 caracteres, en el marco de la puerta del conductor o en la esquina inferior del parabrisas. Los VIN nunca usan las letras I, O ni Q.",
      vinPhotoLabel: "Fotografía la placa del VIN",
      vinPhotoHint: "Para tu referencia: verifica el VIN escrito contra la foto antes de decodificar.",
      decodeCta: "Decodificar este VIN",
      decoding: "Decodificando…",
      decodeFailed: "Ese VIN no pudo decodificarse. Revisa los caracteres e inténtalo de nuevo.",
      recallsHeading: "Recalls abiertos (NHTSA)",
      recallsNone: "No hay recalls abiertos registrados en NHTSA para este vehículo.",
      recallsUnavailable:
        "La consulta de recalls no está disponible ahora; la decodificación anterior sigue siendo exacta.",
      diagnoseCarCta: "Diagnosticar este auto",
      saveVaultCta: "Guardar en mi vault",
      savedVault: "Guardado en tu Health Vault.",
      viewVault: "Ver vault",
      saveFailed: "Ese vehículo no pudo guardarse. Inténtalo de nuevo.",
      vaultUnwired: "El vault aún no está conectado en este entorno: no se guardó nada.",
      photoLabel: "Foto del tablero",
      photoHint:
        "Encendido puesto, motor en marcha si es seguro. Acércate lo suficiente para que las luces se vean nítidas. La foto se lee en el momento y nunca se guarda.",
      identifyCta: "Identificar las luces",
      identifying: "Leyendo el tablero…",
      photoUnwiredTitle: "La identificación por foto aún no está activada aquí",
      photoUnwiredBody:
        "Este entorno no tiene el lector de fotos conectado, así que no se puede mostrar ningún resultado, nunca uno inventado. Aun así puedes escribir el nombre de la luz en la página de diagnóstico y obtener la respuesta completa.",
      photoFailed:
        "Esa foto no pudo leerse. Prueba con una toma más clara y cercana del tablero, con el encendido puesto.",
      photoNone:
        "No se identificaron luces de advertencia en esa foto. Si hay luces encendidas, tómala más cerca con el encendido puesto: varias luces encendidas con el motor apagado son una comprobación normal de bombillas.",
      odometerRead: "Odómetro leído de tu foto",
      runDiagnosisCta: "Ejecutar el diagnóstico completo",
      retakeCta: "Usar otra foto",
      vehicleOptionalLabel: "Tu auto (opcional)",
      vehicleOptionalPlaceholder: "Año, marca y modelo",
      codeLabel: "Código de falla",
      codeHint:
        "De un lector de códigos o de un escaneo gratuito en una tienda de repuestos: una letra (P, B, C o U) más cuatro caracteres, como P0420.",
      codeInvalid: "Eso aún no parece un código de falla: debería verse como P0420.",
      codeExplainCta: "Explicar este código",
      codeSystemSuffix: "sistema",
      codeGeneric: "código OBD-II estándar",
      codeManufacturer: "código específico del fabricante",
      diagnosisNote:
        "La explicación se ejecuta como un diagnóstico completo en la siguiente pantalla: causas, urgencia y el precio justo.",
    },
  },
  auth: {
    social: {
      continueWithGoogle: "Continuar con Google",
      or: "o",
      failed: "El inicio de sesión con Google no funcionó. Inténtalo de nuevo, o inicia sesión con tu correo y contraseña abajo.",
      googleOnly: "Esta cuenta usa el inicio de sesión con Google, así que no hay contraseña que comprobar. Usa «Continuar con Google» arriba.",
    },
    register: {
      confirmPassword: "Confirmar contraseña",
      passwordMismatch: "Las contraseñas no coinciden — revísalas e inténtalo de nuevo.",
      phoneOptional: "Teléfono (opcional)",
      phoneOptionalHint: "Opcional: si lo omites ahora, lo agregarás antes de tu primer diagnóstico.",
      passwordInstead: "Regístrate con una contraseña",
      codeInstead: "Continuar con un código por correo",
    },
    code: {
      emailLabel: "Correo electrónico",
      continueCta: "Continuar",
      sending: "Enviando…",
      codeSent: "Si ese correo puede recibir un código, ya va uno en camino. Dura 15 minutos.",
      codeLabel: "Código de 6 dígitos",
      verifyCta: "Verificar y continuar",
      verifying: "Comprobando…",
      invalid: "Ese código no coincide o ya caducó. Pide un código nuevo e inténtalo de nuevo.",
      resend: "Enviar un código nuevo",
      resent: "Un código nuevo va en camino.",
      differentEmail: "Usar otro correo",
      loginIntro: "Te enviaremos un código de 6 dígitos por correo — no necesitas contraseña.",
      registerIntro: "Te enviaremos un código de 6 dígitos por correo para confirmar que eres tú — luego crearás una contraseña.",
      newHereTitle: "Termina de crear tu cuenta",
      newHereBody: "Tu correo está confirmado. Agrega tu nombre y crea una contraseña — escríbela dos veces — y tu cuenta estará lista, ya verificada.",
      createCta: "Crear cuenta",
      creating: "Creando cuenta…",
    },
    completeProfile: {
      title: "Una cosa más: tu número de teléfono",
      body: "MECHA reconoce tu cuenta por tu correo Y tu número de teléfono: juntos protegen tus 5 diagnósticos gratuitos, para que nadie pueda reiniciar tu contador registrándose otra vez. Agrega tu número para terminar de configurar tu cuenta.",
      phoneLabel: "Número de teléfono",
      submit: "Guardar y continuar",
      saving: "Guardando…",
      failed: "Ese número de teléfono no se pudo guardar. Revisa el número e inténtalo de nuevo.",
      bannerTitle: "Termina de configurar tu cuenta",
      bannerBody: "Agrega tu número de teléfono para desbloquear tus diagnósticos gratuitos. Toma diez segundos y protege el contador de diagnósticos de tu cuenta.",
      bannerCta: "Agregar mi número de teléfono",
    },
  },
};

export default es;
