import type { DeepPartial } from "../types";
import type { Dictionary } from "./en";

/** FR — full homepage catalog (WP2). Native-review pass is a WP7 checklist
 *  item (Frantz is a native French speaker). App catalogs land in WP5/WP7. */
const fr: DeepPartial<Dictionary> = {
  meta: {
    title: "MECHA — Le copilote IA de votre voiture",
    description:
      "MECHA lit les voyants, les codes d'erreur et les symptômes de votre voiture, explique en langage simple ce qui ne va probablement pas et vous dit quel est le juste prix d'une réparation — avant de payer qui que ce soit.",
  },
  header: {
    navDiagnose: "Diagnostiquer",
    navPricing: "Tarifs",
    navShops: "Pour les ateliers",
    signIn: "Se connecter",
    joinWaitlist: "Rejoindre la liste d'attente",
    themeToggleLabel: "Basculer entre le thème clair et le thème sombre",
    languageLabel: "Langue",
  },
  hero: {
    eyebrow: "Le copilote IA de votre voiture",
    titleLine1: "Sachez ce qui ne va pas.",
    titleLine2: "Sachez ce que ça devrait coûter.",
    sub: "Pointez MECHA vers un voyant, un code d'erreur ou un bruit bizarre. Vous obtenez un diagnostic en langage simple, sa gravité, et le juste prix de la réparation — avant qu'un atelier vous donne le sien.",
    scanCta: "Scanner votre voiture",
    watchCta: "Voir comment ça marche",
    filmFairPrice: "Voir le contrôle du juste prix",
    points: {
      noHardware: "Aucun matériel à acheter — votre téléphone est le scanner",
      plainLanguage: "En langage simple, dans votre langue",
      freeToStart: "Gratuit pour commencer — aucune carte requise",
    },
  },
  pillars: {
    eyebrow: "Ce que fait MECHA",
    heading: "Trois missions. Un copilote.",
    diagnose: {
      title: "Diagnostiquer",
      body: "Décrivez un symptôme, photographiez votre tableau de bord ou scannez votre VIN. MECHA lit les voyants et les codes de panne comme le ferait un technicien chevronné — puis vous les explique comme un ami qui en est un.",
      point1: "Causes classées, la plus probable en premier",
      point2: "Gravité sur chaque résultat : roulez, roulez prudemment, ou arrêtez-vous",
      point3: "Problèmes connus de votre voiture et rappels ouverts, vérifiés automatiquement",
    },
    protect: {
      title: "Protéger",
      body: "Photographiez n'importe quel devis et MECHA le décompose ligne par ligne — pièces contre main-d'œuvre — et signale chaque ligne au-dessus de la fourchette juste pour ce travail sur votre voiture. Vous approuvez les lignes justes. Vous contestez le reste.",
      point1: "Verdicts ligne par ligne : juste, élevé, ou abusif",
      point2: "La comparaison est le reçu — montrez-la au comptoir",
      point3: "Les ateliers sur MECHA savent que le devis sera vérifié",
    },
    remember: {
      title: "Se souvenir",
      body: "Chaque diagnostic, reçu et entretien atterrit dans le Coffre Santé de votre voiture — une mémoire qui suit la voiture, pas l'atelier. Rappels d'entretien, surveillance des rappels constructeur, et un historique auquel un futur acheteur peut se fier, porté par un QR code sur la voiture elle-même.",
      point1: "Les photos de reçus deviennent un historique d'entretien structuré",
      point2: "Rappels d'entretien et d'immatriculation, à temps",
      point3: "Un QR MECHA pour votre voiture — son historique, avec votre permission",
    },
  },
  fairPrice: {
    eyebrow: "Juste prix contre leur devis",
    heading: "Le devis, vérifié ligne par ligne.",
    body: "Voici le contrôle que MECHA effectue sur tout devis de réparation — ce que l'atelier a demandé, ce que le travail coûte justement sur votre voiture, et les lignes à contester avant de dire oui.",
    exampleLabel: "Exemple — chiffres illustratifs",
    jobLabel: "Remplacement de l'alternateur",
    theirQuote: "Leur devis",
    fairRange: "Fourchette juste",
    total: "Total",
    verdictWord: "Élevé",
    verdictText:
      "Deux lignes dépassent la fourchette juste pour cette voiture. Contestez la marge sur la pièce et les frais d'atelier avant d'approuver.",
    lines: {
      part: { name: "Alternateur (pièce)", verdict: "Élevé" },
      labor: { name: "Main-d'œuvre", verdict: "Juste" },
      supplies: { name: "Frais d'atelier", verdict: "Abusif" },
    },
    lineTypes: { part: "Pièce", labor: "Main-d'œuvre", fee: "Frais" },
  },
  waitlist: {
    eyebrow: "Bêta privée",
    heading: "Entrez avant l'ouverture des portes.",
    body: "MECHA est en bêta privée. Rejoignez la liste d'attente avec votre e-mail — les premiers membres reçoivent 3 mois de Pro gratuits et leur tarif de lancement bloqué à vie.",
    placeholder: "vous@exemple.com",
    button: "Rejoindre la liste d'attente",
    note: "Un seul e-mail quand votre invitation est prête. Rien d'autre, jamais.",
    success: "Vous êtes sur la liste. Surveillez votre boîte pour l'invitation.",
    errorInvalid: "Cet e-mail semble incomplet — vérifiez-le et réessayez.",
    errorStub:
      "La liste d'attente ouvre avec le nouveau site — votre e-mail n'a pas encore été enregistré. (Version de base WP2.)",
  },
  footer: {
    tagline: "Le copilote IA de votre voiture — diagnostic, protection du juste prix, et une mémoire pour votre voiture.",
    support: "Assistance",
    privacy: "Confidentialité",
    terms: "Conditions",
    contact: "Contact",
    rights: "Tous droits réservés.",
    operator: "MECHA Technologies, Inc.",
    disclaimer:
      "Les diagnostics de MECHA sont fournis à titre informatif uniquement et ne remplacent pas l'inspection d'un mécanicien certifié.",
  },
};

export default fr;
