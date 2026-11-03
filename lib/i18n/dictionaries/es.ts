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
    },
    protect: {
      title: "Proteger",
      body: "Fotografía cualquier cotización y MECHA la divide línea por línea — piezas contra mano de obra — y marca cada línea con precio por encima del rango justo para ese trabajo en tu coche. Apruebas las líneas justas. Cuestionas el resto.",
      point1: "Veredictos por línea: justo, alto o un abuso",
      point2: "La comparación es el recibo — muéstrala en el mostrador",
      point3: "Los talleres en MECHA saben que la cotización será revisada",
    },
    remember: {
      title: "Recordar",
      body: "Cada diagnóstico, recibo y servicio llega a la Bóveda de Salud de tu coche — una memoria que sigue al coche, no al taller. Recordatorios de mantenimiento, vigilancia de retiros y un historial en el que un futuro comprador puede confiar, en un código QR en el propio coche.",
      point1: "Las fotos de recibos se convierten en historial de servicio estructurado",
      point2: "Recordatorios de mantenimiento y registro, a tiempo",
      point3: "Un QR de MECHA para tu coche — su historial, con tu permiso",
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
