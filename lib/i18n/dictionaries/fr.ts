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
      detail:
        "La gravité n'est jamais vague — roulez, roulez prudemment, ou arrêtez-vous, avec la raison en mots simples. Chaque rapport indique aussi la fourchette de prix juste et le temps de main-d'œuvre qu'un atelier honnête devrait prendre, pour que vous connaissiez la forme de la facture avant qu'on l'écrive.",
    },
    protect: {
      title: "Protéger",
      body: "Photographiez n'importe quel devis et MECHA le décompose ligne par ligne — pièces contre main-d'œuvre — et signale chaque ligne au-dessus de la fourchette juste pour ce travail sur votre voiture. Vous approuvez les lignes justes. Vous contestez le reste.",
      point1: "Verdicts ligne par ligne : juste, élevé, ou abusif",
      point2: "La comparaison est le reçu — montrez-la au comptoir",
      point3: "Les ateliers sur MECHA savent que le devis sera vérifié",
      detail:
        "Trois verdicts, toujours en mots — jamais la couleur seule. Juste : dans la fourchette pour ce travail sur votre voiture. Élevé : au-dessus — demandez pourquoi. Abusif : tarifé bien au-delà du juste — contestez-le avant d'approuver quoi que ce soit.",
    },
    remember: {
      title: "Se souvenir",
      body: "Chaque diagnostic, reçu et entretien atterrit dans le Coffre Santé de votre voiture — une mémoire qui suit la voiture, pas l'atelier. Rappels d'entretien, surveillance des rappels constructeur, et un historique auquel un futur acheteur peut se fier, porté par un QR code sur la voiture elle-même.",
      point1: "Les photos de reçus deviennent un historique d'entretien structuré",
      point2: "Rappels d'entretien et d'immatriculation, à temps",
      point3: "Un QR MECHA pour votre voiture — son historique, avec votre permission",
      detail:
        "Les reçus photographiés deviennent des lignes d'entretien datées. MECHA surveille les rappels constructeur ouverts et vous rappelle l'entretien et l'immatriculation avant leur échéance — et quand vous vendez la voiture, son QR code permet à un acheteur de voir exactement l'historique que vous choisissez de partager.",
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
  howItWorks: {
    eyebrow: "Comment ça marche",
    heading: "Du voyant allumé à la réponse, en quatre étapes.",
    body: "Aucun scanner à acheter, aucun rendez-vous à prendre. Vous partez de ce que vous voyez et entendez — MECHA finit avec ce qui ne va probablement pas, sa gravité, et ce que la réparation devrait justement coûter.",
    steps: {
      describe: {
        title: "Décrivez-la, photographiez-la, ou scannez-la",
        body: "Tapez le symptôme avec vos mots, photographiez le voyant sur votre tableau de bord, saisissez un code de panne, ou scannez votre VIN. Votre téléphone est le seul outil qu'il vous faut.",
      },
      ranked: {
        title: "Les causes probables, classées",
        body: "MECHA compare le symptôme à la marque, au modèle et à l'historique de votre voiture, puis classe les causes probables — la plus probable en premier, chacune avec la pièce qu'elle désigne et ce que la réparation implique.",
      },
      severity: {
        title: "Un verdict clair sur la gravité",
        body: "Chaque réponse porte l'un de trois verdicts : Roulez — vous pouvez continuer en sécurité. Roulez prudemment — à réparer bientôt. Arrêtez-vous — ne conduisez plus ; appelez une dépanneuse. Fini de deviner ce qu'un voyant essaie de dire.",
      },
      price: {
        title: "Le juste prix, avant l'atelier",
        body: "Chaque diagnostic se termine par la fourchette de prix juste pour la réparation sur votre voiture — pièces et main-d'œuvre — plus le temps de main-d'œuvre qu'un atelier honnête devrait prendre. Le premier devis que vous entendrez sera un devis que vous pouvez déjà juger.",
      },
    },
    includesTitle: "Ce que contient chaque diagnostic",
    includes: {
      explanation: "Une explication en langage simple de ce qui ne va probablement pas",
      causes: "Les causes probables, classées — chacune avec sa pièce et son prix",
      severity: "Un verdict de gravité : roulez, roulez prudemment, ou arrêtez-vous",
      cost: "La fourchette de prix juste de la réparation, pièces et main-d'œuvre",
      labor: "Le temps de main-d'œuvre qu'un atelier honnête devrait prendre",
      steps: "Quoi faire ensuite, dans l'ordre",
      tip: "Un conseil de technicien — quoi dire à l'atelier, et quoi surveiller",
      saved: "Le rapport enregistré dans le Coffre Santé de votre voiture, rappels vérifiés",
    },
  },
  reportExample: {
    eyebrow: "Dans un diagnostic",
    heading: "Voici la réponse que vous recevez.",
    body: "Ni un code à chercher, ni une devinette — un rapport sur lequel vous pouvez agir, et à remettre à un atelier. Voici la forme de chaque rapport MECHA, montrée avec un problème d'exemple.",
    exampleLabel: "Diagnostic d'exemple — illustratif",
    symptomLabel: "Le symptôme",
    symptom: "« Voyant moteur allumé, et le moteur tremble quand je m'arrête à un feu. »",
    severity: "Modéré — À réparer bientôt",
    safeLine: "Vous pouvez rouler prudemment",
    diagnosis:
      "Un cylindre a des ratés — il ne s'allume plus, donc le moteur tourne sur les autres. C'est le tremblement au ralenti, et c'est pour cela que le voyant est allumé.",
    fairRangeLabel: "Fourchette juste de réparation",
    fairRangeValue: "$180–$320",
    partsTitle: "Causes probables",
    parts: {
      coil: {
        name: "Bobine d'allumage",
        likelihood: "La plus probable",
        cost: "$120–$190",
        desc: "Une bobine en panne coupe l'étincelle d'un cylindre. Une panne courante, qui se répare avec une seule pièce.",
      },
      plugs: {
        name: "Bougies d'allumage",
        likelihood: "Possible",
        cost: "$80–$160",
        desc: "Des bougies usées ratent au ralenti et en charge. On les remplace en général par jeu complet.",
      },
      injector: {
        name: "Injecteur de carburant",
        likelihood: "Moins probable",
        cost: "$220–$380",
        desc: "Un injecteur encrassé affame un cylindre en carburant. Vérifié après les bobines et les bougies.",
      },
    },
    stepsTitle: "Quoi faire ensuite",
    step1: "Roulez doucement — pas d'autoroute ni de lourdes charges avant le contrôle.",
    step2: "Prenez rendez-vous dans les prochains jours. Dites-leur que c'est un raté d'allumage — et montrez-leur ce rapport.",
    step3: "Demandez à tester la bobine d'allumage en premier : cause la plus probable, contrôle le moins cher.",
    tipLabel: "Conseil du technicien",
    tip: "Si le voyant moteur se met à clignoter, arrêtez de conduire. Un voyant qui clignote signifie que le raté est assez grave pour endommager le convertisseur catalytique — une facture bien plus lourde.",
    disclaimer:
      "Un exemple, avec des détails illustratifs. Votre propre rapport est généré à partir des symptômes réels de votre voiture. Les diagnostics sont informatifs et ne remplacent jamais l'inspection pratique d'un mécanicien.",
  },
  businesses: {
    eyebrow: "Près de vous, quand ça compte",
    heading: "La bonne aide, à quelques minutes de la voiture.",
    body: "Un diagnostic dit ce qui ne va pas. La question suivante est qui peut le réparer — ou venir la chercher. Saisissez un code postal, ou laissez MECHA utiliser votre position, et la réponse est une liste pensée pour un conducteur sous stress.",
    shops: {
      title: "Ateliers de réparation près de vous",
      body: "Les ateliers autour de vous, le plus proche en premier — trouvés pendant que le diagnostic est encore sur votre écran, pour que le premier appel commence avec des réponses.",
      point1: "Une réponse simple en haut : « 6 ateliers près de vous »",
      point2: "Chaque annonce commence par le nom de l'atelier, puis sa distance jusqu'à vous",
      point3: "Le numéro de téléphone est le bouton — un toucher et vous parlez à l'atelier",
    },
    towing: {
      title: "Le remorquage, quand la voiture ne peut plus bouger",
      body: "Quand le verdict est Arrêtez-vous, la même recherche liste les dépanneuses qui desservent votre endroit exact — parce qu'un conducteur en panne a besoin d'un camion, pas d'un annuaire.",
      point1: "Classées par distance — l'aide la plus proche en premier",
      point2: "Des annonces nom d'abord, appel en un toucher, lisibles au bord de la route",
      point3: "Les entreprises indiquent la zone qu'elles desservent, pour n'appeler que des camions qui peuvent vous atteindre",
    },
    forBusiness: {
      title: "Vous tenez un atelier, ou une dépanneuse ?",
      body: "Inscrivez votre entreprise et les conducteurs près de vous vous trouvent par code postal au moment où ils ont besoin d'aide — votre nom en premier, votre numéro à un toucher, et un client qui connaît déjà le juste prix.",
      cta: "Inscrivez votre entreprise",
    },
    marketplace: {
      title: "La place de marché",
      body: "Des véhicules à vendre, annoncés honnêtement : photos guidées — avant, arrière, les deux côtés, le tableau de bord et le véhicule entier — une vraie description, le prix, et les problèmes connus déclarés par le vendeur dès le départ.",
      cta: "Parcourir la place de marché",
    },
  },
  pricing: {
    eyebrow: "Tarifs",
    heading: "Gratuit pour commencer. Honnête sur le compteur.",
    body: "Chaque compte commence avec 5 diagnostics gratuits. Après chacun, MECHA vous dit exactement combien il vous en reste — 4, puis 3, puis 2 — et à zéro, vous choisissez : vous abonner, ou arrêter. Rien n'est jamais facturé dans votre dos.",
    free: {
      name: "Gratuit",
      price: "$0",
      period: "Aucune carte requise",
      point1: "5 diagnostics, comptés sur votre compte — pas sur un navigateur ni une session",
      point2: "Un compteur visible, et le décompte après chaque diagnostic",
      point3: "La fourchette de prix juste sur chaque rapport",
      point4: "Votre Coffre Santé : historique, surveillance des rappels et rappels d'entretien",
      cta: "Commencer gratuitement",
    },
    pro: {
      name: "Pro",
      price: "$9.99",
      period: "Par mois",
      badge: "Pour les conducteurs",
      point1: "Diagnostics illimités — le compteur disparaît",
      point2: "Analyse approfondie pour les problèmes qui résistent à une première réponse",
      point3: "Tout Gratuit, sans le décompte",
      point4: "Premiers membres : 3 mois de Pro offerts, tarif de lancement bloqué à vie",
      cta: "Passer Pro",
    },
    shops: {
      name: "Ateliers",
      price: "$149",
      period: "Par mois, par établissement",
      badge: "Pour ateliers et remorquage",
      point1: "Votre entreprise dans la liste de proximité que les conducteurs appellent",
      point2: "Le nom en premier, la distance affichée, un toucher pour vous appeler",
      point3: "Des conducteurs qui arrivent en connaissant déjà le juste prix",
      point4: "Annonces pour ateliers de réparation comme pour dépanneuses",
      cta: "Inscrivez votre entreprise",
    },
    meterTitle: "Le compteur, en pleine vue",
    meterNote:
      "Le compte gratuit est lié à vous — votre e-mail et votre numéro de téléphone — jamais à un cookie de navigateur ni à une seule session. Se déconnecter et se réinscrire ne le réinitialise pas, et ce n'est pas fait pour : cinq diagnostics gratuits par personne, c'est l'offre, et elle est la même pour tout le monde.",
  },
  faq: {
    eyebrow: "Questions",
    heading: "Posées, et répondues franchement.",
    items: {
      accuracy: {
        q: "Quelle est la précision d'un diagnostic MECHA ?",
        a: "MECHA classe les causes les plus probables de vos symptômes, explique chacune, et vous donne le juste prix de la réparation. C'est le meilleur point de départ possible — et une vraie protection au comptoir — mais cela ne remplace pas les mains d'un mécanicien sur la voiture. MECHA le dit lui-même, sur chaque rapport.",
      },
      freeEnd: {
        q: "Que se passe-t-il quand mes 5 diagnostics gratuits sont épuisés ?",
        a: "Vous le verrez venir : après chaque diagnostic, MECHA vous dit combien il vous en reste. À zéro, les diagnostics se mettent en pause jusqu'à ce que vous choisissiez Pro. Rien n'est facturé automatiquement, et votre compte, vos voitures et votre historique restent exactement où ils sont.",
      },
      reset: {
        q: "Puis-je réinitialiser le compteur gratuit en me réinscrivant ?",
        a: "Non — et c'est délibéré. Le compteur est lié à l'identité de votre compte, votre e-mail et votre numéro de téléphone, donc une nouvelle inscription avec les mêmes coordonnées retrouve le même compteur. Cinq diagnostics gratuits par personne, c'est ce qui rend l'offre juste pour tout le monde.",
      },
      hardware: {
        q: "Dois-je acheter un scanner, ou du matériel ?",
        a: "Non. Votre téléphone est le scanner : décrivez le symptôme, photographiez le voyant, tapez un code de panne, ou scannez le VIN.",
      },
      languages: {
        q: "Quelles langues MECHA parle-t-il ?",
        a: "Le site et l'application parlent aujourd'hui l'anglais, l'espagnol, le français et le créole haïtien, et votre diagnostic vous est répondu dans votre langue. D'autres langues sont en cours d'ajout — MECHA est fait pour les conducteurs du monde entier, pas seulement pour les anglophones.",
      },
      privacy: {
        q: "Qui peut voir l'historique de ma voiture ?",
        a: "Vous. Votre Coffre Santé appartient à votre compte, et l'historique QR de votre voiture n'est partagé qu'avec votre permission — par exemple quand vous vendez la voiture et choisissez de montrer son dossier à un acheteur.",
      },
      business: {
        q: "Je tiens un atelier — ou une dépanneuse. Comment être listé ?",
        a: "Créez un compte entreprise avec votre nom, votre numéro de téléphone et votre code postal. Les conducteurs près de vous vous trouvent alors dans la liste de proximité : votre nom en premier, votre distance affichée, un toucher pour appeler.",
      },
    },
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
