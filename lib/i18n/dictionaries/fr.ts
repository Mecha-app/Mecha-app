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
    createAccount: "Créer un compte",
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
        a: "MECHA parle treize langues : l'anglais, l'espagnol, le français, le créole haïtien, le portugais, l'allemand, l'italien, le polonais, le russe, l'ukrainien, le turc, l'arabe et l'hébreu. Le diagnostic IA vous répond dans la langue de votre choix.",
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
  diagnosePage: {
    eyebrow: "MECHA Diagnose",
    heading: "Partez du symptôme. Repartez avec un plan.",
    sub: "Un voyant, un bruit étrange, un code donné par un magasin de pièces — quelle que soit la façon dont le problème se manifeste, MECHA le transforme en causes classées, en verdict de gravité clair, en juste prix et en prochaines étapes.",
    primaryCta: "Diagnostiquer ma voiture",
    scanCta: "Explorer Scan",
    accountNote:
      "Scanner un VIN, identifier un voyant et vérifier un code sont gratuits. Un diagnostic complet utilise l'un de vos 5 diagnostics gratuits, et le compteur est toujours affiché avant et après.",
    modes: {
      eyebrow: "Trois façons de commencer",
      heading: "Commencez avec ce que la voiture vous donne.",
      body: "Vous n'avez besoin ni du vocabulaire exact ni d'un outil à vous. Commencez depuis une description, une photo, un VIN ou un code défaut — chaque chemin rassemble un type de preuve différent pour le même rapport.",
      describe: {
        kicker: "01 — Décrire",
        title: "Dites-le avec vos mots",
        body: "Écrivez ce que vous voyez, entendez, ressentez ou sentez, et quand cela se produit. « Ça tremble quand je m'arrête », « ça clique quand je tourne » et « ça sent le sucre après un trajet » sont de bons points de départ.",
        detail:
          "Ajoutez la voiture et tout ce qui a changé — une réparation récente, un bruit nouveau, un voyant apparu puis disparu. Le diagnostic pèse le symptôme contre le véhicule et son historique, au lieu de traiter chaque voiture comme la même.",
        point1: "Idéal pour les bruits, vibrations, odeurs, fuites et problèmes intermittents",
        point2: "Aucun vocabulaire technique requis",
        point3: "S'exécute comme un diagnostic complet, avec le rapport entier",
        cta: "Décrire un symptôme",
      },
      photo: {
        kicker: "02 — Photographie",
        title: "Laissez le tableau de bord parler",
        body: "Photographiez le combiné d'instruments et MECHA nomme chaque voyant qu'il peut identifier, l'explique en langage clair et en note l'urgence.",
        detail:
          "Une photo identifie le voyant — pas la panne cachée dessous. Quand le voyant pointe vers quelque chose de plus profond, le parcours transmet ces éléments à un diagnostic complet au lieu de prétendre que l'image a tout répondu.",
        point1: "Nomme et explique les symboles allumés",
        point2: "Note l'urgence avec les mêmes trois verdicts de gravité",
        point3: "Peut passer à un diagnostic complet en un toucher",
        cta: "Photographier un tableau de bord",
      },
      scan: {
        kicker: "03 — Scanner ou saisir un code",
        title: "Utilisez les identifiants de la voiture",
        body: "Décodez le VIN de 17 caractères pour identifier le véhicule exact et vérifier les rappels ouverts, ou saisissez un code défaut comme P0420 pour une traduction en langage clair.",
        detail:
          "Le VIN ancre la compatibilité, les causes probables et les prix de réparation à la bonne année, marque, modèle et moteur. Un code ajoute un indice de système ; le diagnostic complet transforme cet indice en causes classées et en fourchette juste.",
        point1: "Décodage du VIN et vérification des rappels NHTSA ouverts",
        point2: "Format du code défaut vérifié instantanément",
        point3: "Enregistrez la voiture décodée dans votre Coffre Santé",
        cta: "Voir comment Scan fonctionne",
      },
    },
    report: {
      eyebrow: "Dans le rapport",
      heading: "Huit choses que chaque diagnostic complet vous donne.",
      body: "Le résumé de la page d'accueil n'est que le plan. Un rapport complet explique le raisonnement et les conséquences pratiques, pour que la réponse serve à la maison, sur la route ou au comptoir d'un atelier.",
      items: {
        explanation: {
          title: "Explication en langage clair",
          body: "Ce qui se passe probablement dans la voiture, pourquoi cela produit le symptôme que vous avez remarqué, et où subsiste l'incertitude. Les termes techniques sont traduits au lieu de vous être répétés.",
        },
        causes: {
          title: "Causes probables, classées",
          body: "Les causes probables sont ordonnées de la plus à la moins probable. Chacune nomme la pièce concernée, ce que la réparation implique et son coût estimé, pour qu'un contrôle moins cher ne soit pas enterré sous une supposition plus lourde.",
        },
        severity: {
          title: "Verdict de gravité",
          body: "L'une de trois réponses explicites — Roulez, Roulez prudemment ou Arrêtez-vous — avec sa raison. Un verdict n'est jamais porté par la couleur seule, et il est lié aux symptômes du rapport.",
        },
        cost: {
          title: "Fourchette de prix juste",
          body: "Une fourchette pour la réparation de votre voiture, pièces et main-d'œuvre comprises. Elle vous donne une comparaison avant qu'un atelier écrive un devis, et non la promesse que chaque atelier facturera le même montant.",
        },
        labor: {
          title: "Temps de main-d'œuvre juste",
          body: "Le temps de main-d'œuvre qu'un atelier juste devrait prendre pour le travail. Quand un devis dépend d'une main-d'œuvre anormalement élevée, c'est la ligne qui rend la différence visible.",
        },
        steps: {
          title: "Quoi faire ensuite, dans l'ordre",
          body: "L'action immédiate, les contrôles à demander en premier, et ce qui peut attendre. L'ordre compte : il favorise la vérification la plus probable et la moins chère avant les gros travaux.",
        },
        tip: {
          title: "Conseil du technicien",
          body: "Une note pratique sur quoi dire à l'atelier, quoi surveiller en conduisant, ou quel changement du symptôme signifie que la situation est devenue plus urgente.",
        },
        saved: {
          title: "Enregistré dans le Coffre Santé",
          body: "Le rapport rejoint l'historique de la voiture, aux côtés des vérifications de rappels et des futurs entretiens. Le prochain diagnostic, et une future conversation de réparation, peuvent commencer avec du contexte plutôt qu'une page blanche.",
        },
      },
    },
    severity: {
      eyebrow: "Guide de gravité",
      heading: "Trois verdicts. Plus besoin de deviner ce qu'un voyant veut dire.",
      body: "Chaque diagnostic utilise les mêmes mots. Ce sont des repères tirés des preuves du rapport — si la voiture semble dangereuse, perd de la puissance, surchauffe, fume, ou si un voyant se met à clignoter, l'action la plus sûre gagne.",
      drive: {
        title: "Roulez",
        body: "Le rapport ne pointe vers aucune raison de s'arrêter immédiatement. Gardez le symptôme à l'œil et programmez le contrôle recommandé dans le cours normal de l'entretien.",
        detail:
          "Roulez n'est pas une garantie que rien ne va mal. Cela signifie que les preuves permettent de continuer tout en surveillant les changements et en suivant les prochaines étapes.",
      },
      careful: {
        title: "Roulez prudemment",
        body: "Le problème mérite une attention rapide. Limitez la conduite exigeante, évitez les lourdes charges quand le rapport le dit, et réservez l'inspection bientôt.",
        detail:
          "Si le symptôme s'aggrave, si un nouveau voyant apparaît ou si la voiture commence à perdre de la puissance, traitez la situation comme plus urgente que le verdict initial.",
      },
      stop: {
        title: "Arrêtez-vous",
        body: "Ne continuez pas à rouler avec ce problème. Arrêtez-vous dans un endroit sûr, coupez le moteur quand c'est conseillé, et utilisez l'aide à proximité ou un remorquage au lieu d'essayer de rentrer.",
        detail:
          "Ce verdict existe pour les problèmes où continuer à rouler peut créer un risque de sécurité ou transformer une panne réparable en dommage bien plus important.",
      },
    },
    speed: {
      eyebrow: "Pensé pour le bord de la route",
      heading: "La réponse commence à arriver en flux.",
      body: "Un diagnostic est livré en flux : le rapport commence à apparaître pendant que le reste s'écrit encore, au lieu de vous laisser devant un écran d'attente vide jusqu'à la fin de chaque mot.",
      detail:
        "C'est la réponse directe de la reconstruction à l'ancienne expérience — un parcours moderne unique, du symptôme au rapport, avec la gravité, les causes et la fourchette juste arrivant comme une seule réponse structurée.",
      note: "Le temps réel dépend de la connexion et de la complexité du problème. MECHA ne remplit pas une attente avec un résultat inventé.",
    },
    meter: {
      title: "Cinq diagnostics complets, gratuits",
      body: "Votre compte gratuit est lié à l'identité de votre compte — e-mail et téléphone — et survit à la déconnexion. Après chaque diagnostic, MECHA indique combien il en reste. À zéro, les diagnostics se mettent en pause jusqu'à ce que vous choisissiez Pro ; rien n'est facturé automatiquement.",
    },
    final: {
      eyebrow: "Commencez gratuitement",
      heading: "Apportez à MECHA le problème que vous avez aujourd'hui.",
      body: "Créez le compte gratuit, ajoutez la voiture et lancez le premier diagnostic. Le rapport, la fourchette juste et l'historique sont à vous.",
      cta: "Créez un compte gratuit",
      secondaryCta: "Diagnostiquer maintenant",
    },
  },
  pricingPage: {
    eyebrow: "Tarifs, en entier",
    heading: "Choisissez selon le travail devant vous.",
    sub: "Les forfaits sont simples à dessein : commencez gratuitement, supprimez le compteur de diagnostics avec Pro, ou placez un établissement devant les conducteurs proches avec Ateliers. Les détails — y compris la facturation — sont sur cette page, pas enterrés après le paiement.",
    decision: {
      eyebrow: "À qui chaque forfait convient",
      heading: "La bonne taille, sans labyrinthe de niveaux.",
      body: "La différence entre les forfaits est le travail qu'ils résolvent, pas un paquet de limites artificielles.",
      free: {
        title: "Gratuit — savoir ce qui ne va pas",
        body: "Pour un conducteur face à un voyant ou un symptôme inconnu, qui a besoin d'une première réponse crédible avant de payer une réparation.",
        detail:
          "Vous recevez 5 diagnostics complets, la fourchette de prix juste sur chaque rapport et le Coffre Santé. Aucune carte n'est requise pour commencer, et le compte restant est toujours visible.",
      },
      pro: {
        title: "Pro — supprimer le compteur",
        body: "Pour les conducteurs qui diagnostiquent plus qu'un problème occasionnel, traquent une panne intermittente ou veulent le niveau d'analyse approfondie disponible quand une première réponse ne suffit pas.",
        detail:
          "Pro offre des diagnostics standard illimités et une analyse approfondie pour les problèmes résistants, tout en gardant le Coffre et la protection du juste prix de Gratuit.",
      },
      shops: {
        title: "Ateliers — être là quand ça compte",
        body: "Pour un établissement de réparation ou de remorquage qui veut apparaître dans les résultats de proximité de MECHA quand un conducteur est prêt à appeler.",
        detail:
          "Le forfait est par établissement, et non par entreprise dans l'abstrait. Le nom de votre entreprise mène l'annonce, la distance est affichée, et le numéro de téléphone est l'action d'appel en un toucher.",
      },
    },
    billing: {
      eyebrow: "Facturation, sans pièges",
      heading: "Abonnez-vous quand vous choisissez. Annulez quand vous choisissez.",
      body: "Les forfaits payants passent par le paiement web de MECHA et les outils de facturation du compte. Le forfait, le statut et la période en cours sont affichés dans le tableau de bord en mots clairs.",
      point1: "Le paiement web peut proposer les cartes, ainsi qu'Apple Pay et Google Pay, quand ces portefeuilles sont disponibles sur l'appareil et le navigateur",
      point2: "Une seule action, « Gérer ou annuler à tout moment », ouvre la facturation pour un abonné",
      point3: "Une annulation programmée s'affiche comme date de fin, au lieu d'être cachée derrière une étiquette de renouvellement",
      point4: "Gratuit ne demande aucune carte, et épuiser les 5 diagnostics gratuits ne lance jamais un forfait payant tout seul",
      note: "La disponibilité des portefeuilles est décidée par l'appareil de paiement, le navigateur et les réglages du compte Stripe. MECHA ne promet pas un bouton de portefeuille là où la plateforme ne peut pas l'offrir.",
    },
    faq: {
      eyebrow: "Questions de tarifs",
      heading: "La facturation, expliquée avant le paiement.",
      items: {
        card: {
          q: "Faut-il une carte bancaire pour le forfait gratuit ?",
          a: "Non. Gratuit commence sans carte. Vous recevez 5 diagnostics complets, et MECHA affiche le compte restant après chacun.",
        },
        cancel: {
          q: "Comment annuler un forfait payant ?",
          a: "Ouvrez la section facturation de votre tableau de bord et choisissez « Gérer ou annuler à tout moment ». Le compte affiche le statut du forfait et, quand une annulation est programmée, la date de fin de la période payée.",
        },
        payments: {
          q: "Puis-je payer avec Apple Pay ou Google Pay ?",
          a: "Au paiement web, Stripe peut proposer Apple Pay et Google Pay à côté des cartes quand le portefeuille est activé et disponible sur votre appareil et votre navigateur. Si un portefeuille n'est pas disponible, l'option carte reste là.",
        },
        freeEnd: {
          q: "Que se passe-t-il quand les diagnostics gratuits arrivent à zéro ?",
          a: "Les diagnostics se mettent en pause. Votre compte, vos voitures, vos rapports et l'historique de votre Coffre restent disponibles, et rien n'est facturé automatiquement. Vous choisissez de commencer Pro ou non.",
        },
        early: {
          q: "Que reçoivent les premiers membres ?",
          a: "L'offre permanente des premiers membres est 3 mois de Pro offerts et le tarif de lancement bloqué à vie. Elle est attachée au forfait Pro de cette page ; MECHA n'ajoute pas un niveau surprise séparé au paiement.",
        },
        business: {
          q: "Le forfait Ateliers est-il facturé par entreprise ou par établissement ?",
          a: "Par établissement — 149 $ par mois pour chaque atelier ou dépanneuse listée. Une entreprise qui veut lister un autre établissement utilise un forfait pour cet établissement.",
        },
      },
    },
    final: {
      eyebrow: "Aucune carte pour commencer",
      heading: "Utilisez d'abord les diagnostics gratuits.",
      body: "Laissez le produit faire ses preuves sur un vrai problème. Ne changez de forfait que lorsque le compteur ou l'annonce d'entreprise résout un problème que vous avez réellement.",
      cta: "Commencer gratuitement",
      businessCta: "Lister une entreprise",
    },
  },
  shopsPage: {
    eyebrow: "Pour ateliers et remorquage",
    heading: "Soyez le nom qu'un conducteur peut appeler.",
    sub: "Quand MECHA dit à un conducteur de s'arrêter ou de chercher de l'aide bientôt, les entreprises proches deviennent l'étape suivante. Une annonce est pensée pour ce moment : votre nom en premier, votre distance clairement affichée, et votre numéro prêt à toucher.",
    primaryCta: "Créez un compte entreprise",
    nearbyCta: "Voir la recherche de proximité",
    listing: {
      eyebrow: "Ce que l'annonce vous apporte",
      heading: "Un profil pensé pour un conducteur sous pression, pas une page d'annuaire.",
      body: "L'annonce porte les faits dont un conducteur a besoin pour choisir et appeler. Elle n'enterre pas le numéro de téléphone sous du texte marketing et ne fait pas concourir le nom de l'entreprise avec des notes décoratives.",
      profile: {
        title: "L'identité de l'entreprise",
        body: "Le nom de votre entreprise, votre numéro de téléphone et votre position basée sur le code postal identifient l'annonce. Le nom est l'élément principal, parce que la reconnaissance et la confiance commencent là.",
      },
      serviceArea: {
        title: "La bonne zone de service",
        body: "Les ateliers de réparation sont présentés autour de la voiture ; les dépanneuses portent en plus la zone de service qu'elles choisissent, pour diriger les conducteurs vers une aide qui peut vraiment les atteindre.",
      },
      presentation: {
        title: "Nom, distance, appel",
        body: "Les résultats sont classés par distance et s'ouvrent sur un compte clair. Chaque résultat commence par le nom de l'entreprise, indique sa distance, et fait du numéro de téléphone l'action d'appel.",
      },
      control: {
        title: "Votre compte reste le vôtre",
        body: "Le tableau de bord de l'entreprise porte le profil et l'état du forfait. Le statut de facturation est visible, et l'abonnement peut être géré ou annulé depuis le parcours de facturation du compte.",
      },
    },
    plan: {
      eyebrow: "Le forfait Ateliers",
      heading: "Un établissement. Un prix mensuel clair.",
      body: "Le forfait Ateliers place un établissement de réparation ou de remorquage dans l'expérience de proximité de MECHA, pour les conducteurs qui utilisent le parcours de diagnostic et la recherche au bord de la route.",
      priceLabel: "Par mois, par établissement",
      point1: "Une annonce de proximité pour un établissement de réparation ou de remorquage",
      point2: "Une présentation nom d'abord, avec distance et appel en un toucher",
      point3: "Des conducteurs qui peuvent arriver avec un diagnostic et la fourchette de prix juste déjà en main",
      point4: "Tableau de bord entreprise, statut du forfait et contrôles pour gérer ou annuler la facturation",
      note: "Une annonce rend l'entreprise repérable dans les résultats de proximité. Elle ne garantit ni un nombre d'appels, ni des travaux, ni des revenus — la demande des conducteurs et la distance décident qui appelle.",
      cta: "Inscrivez votre entreprise",
    },
    parts: {
      eyebrow: "Commande de pièces",
      heading: "De la pièce nommée au lien de commande.",
      body: "Quand un diagnostic terminé nomme une pièce, MECHA peut construire des liens de détaillants pour ce travail et ce véhicule exacts. Pour un atelier, cela devient un chemin de commande pratique depuis le rapport, au lieu d'une recherche fraîche tapée de mémoire.",
      point1: "Les liens portent l'année, la marque, le modèle et le moteur du véhicule quand ces détails sont connus",
      point2: "La même liste de pièces sert les conducteurs bricoleurs, les propriétaires expérimentés et les commandes d'ateliers",
      point3: "Le prix réel se vérifie chez le détaillant ; MECHA étiquette son propre chiffre comme une estimation, pas comme un prix de magasin",
      disclosure:
        "Les liens de pièces peuvent rapporter une commission à MECHA. L'avis accompagne le bloc, le lien ne change pas le prix chez le détaillant, et les liens affiliés n'influencent jamais le diagnostic — ils sont construits seulement une fois le verdict terminé. Un rabais acheteur n'est affiché que lorsque les conditions réelles du programme d'un détaillant en offrent un.",
    },
    faq: {
      eyebrow: "Questions des propriétaires",
      heading: "Pour ateliers et remorquage, répondu franchement.",
      items: {
        eligibility: {
          q: "Quelles entreprises peuvent s'inscrire ?",
          a: "Les ateliers de réparation et les dépanneuses peuvent créer un compte entreprise avec le nom de l'entreprise, le numéro de téléphone et le code postal. Le type de compte contrôle la façon dont l'entreprise est présentée dans les résultats de proximité.",
        },
        guarantee: {
          q: "MECHA garantit-il des appels ou des travaux ?",
          a: "Non. Une annonce place l'entreprise dans les résultats de proximité, classés par distance, quand les conducteurs cherchent. MECHA ne garantit ni volume d'appels, ni travaux réservés, ni revenus.",
        },
        prepared: {
          q: "Que sait un conducteur avant d'appeler ?",
          a: "Un conducteur peut arriver avec le rapport de diagnostic : les causes probables, un verdict de gravité, la fourchette de réparation juste et les prochaines étapes. La première conversation peut alors commencer par des preuves plutôt qu'un symptôme vague.",
        },
        cost: {
          q: "Combien coûte le forfait entreprise ?",
          a: "Le forfait Ateliers coûte 149 $ par mois, par établissement. Un atelier de réparation et une dépanneuse utilisent le même forfait entreprise par établissement.",
        },
        cancel: {
          q: "Une entreprise peut-elle annuler ?",
          a: "Oui. La section facturation du tableau de bord offre le parcours pour gérer ou annuler, et le statut du forfait ainsi que la fin de période sont affichés en mots clairs.",
        },
        parts: {
          q: "Comment les liens de pièces aident-ils un atelier ?",
          a: "Un rapport terminé peut transformer les pièces nommées en liens de détaillants adaptés au véhicule, ce qui évite une recherche séparée et garde les détails du véhicule attachés au chemin de commande. Le prix réel et la disponibilité se confirment chez le détaillant.",
        },
      },
    },
    final: {
      eyebrow: "Lister l'établissement",
      heading: "Placez l'entreprise là où le besoin apparaît.",
      body: "Créez le compte entreprise, ajoutez l'établissement que les conducteurs doivent trouver, et soyez prêt pour l'appel qui commence par un diagnostic.",
      cta: "Créez un compte entreprise",
      pricingCta: "Voir les tarifs complets",
    },
  },
  finalCta: {
    eyebrow: "Gratuit pour commencer",
    heading: "Vos 5 premiers diagnostics sont offerts.",
    body: "Créez un compte gratuit et MECHA vous accompagne dès le premier voyant. Décrivez le symptôme, photographiez le tableau de bord ou scannez le VIN — vous obtenez la réponse en langage clair, sa gravité et le juste prix, avant qu'un garage ne vous donne le sien.",
    cta: "Créez votre compte gratuit",
    note: "Aucune carte requise. MECHA vous dit toujours exactement combien de diagnostics gratuits il vous reste.",
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
  scan: {
    landing: {
      eyebrow: "MECHA Scan",
      heading: "Visez. Scannez. Sachez ce qui ne va pas.",
      sub: "Votre voiture vous dit déjà ce qui ne va pas — dans un code-barres, dans les voyants du tableau de bord, dans les codes défauts. Scan lit les trois et répond en langage clair, avec le juste prix à la clé.",
      startCta: "Lancer un scan",
      registerCta: "Créez un compte gratuit",
      accountNote:
        "Compte gratuit — vos 5 premiers diagnostics sont offerts, et MECHA vous dit toujours exactement combien il vous en reste.",
      vinKicker: "01 — Scan du VIN",
      vinHeading: "Le code-barres est l'acte de naissance de la voiture",
      vinBody:
        "Chaque voiture porte son identité dans un VIN de 17 caractères. Décodez-le et MECHA sait exactement quelle voiture elle regarde — le bon moteur, les bonnes pièces, les bons prix de réparation — et vérifie auprès de la NHTSA les rappels ouverts sur ce véhicule précis. Enregistrez-le, et la voiture devient un dossier permanent dans votre Health Vault.",
      vinSteps: [
        "Trouvez le code-barres — montant de la porte conducteur ou coin inférieur du pare-brise.",
        "Saisissez les 17 caractères, ou photographiez la plaque pour les vérifier.",
        "Voyez la voiture exacte — année, marque, modèle, moteur — plus les rappels ouverts.",
      ],
      photoKicker: "02 — Photo du tableau de bord",
      photoHeading: "Un voyant, expliqué en langage clair",
      photoBody:
        "Les voyants parlent en symboles, et le manuel n'est jamais dans la voiture. Photographiez le tableau de bord : MECHA nomme chaque symbole allumé, explique ce qu'il signifie et évalue l'urgence — arrêtez-vous maintenant, réparez bientôt, ou gardez un œil dessus. Quand un voyant mérite une réponse plus profonde, un geste transforme la photo en diagnostic complet.",
      photoSteps: [
        "Photographiez le combiné — contact mis, de près, sans bouger.",
        "Recevez le nom et la signification — chaque voyant allumé, en langage clair, urgence évaluée.",
        "Allez plus loin quand ça compte — passez au diagnostic complet avec les voyants déjà remplis.",
      ],
      photoHonestTitle: "Ce qu'une photo peut — et ne peut pas — faire",
      photoHonestBody:
        "Une photo montre quel voyant est allumé, pas le code défaut en dessous. MECHA identifie le voyant et l'explique ; le diagnostic complet cherche les causes. C'est du tri, pas de la magie — et nous ne le présenterons pas comme davantage.",
      codeKicker: "03 — Code défaut",
      codeHeading: "Un code comme P0420 ? Recevez la traduction",
      codeBody:
        "Un magasin de pièces scanne votre voiture gratuitement et vous remet un code — puis vous laisse deviner ce que ça coûte. Saisissez le code dans MECHA et recevez la traduction en langage clair : ce qu'il signifie sur votre voiture, les causes probables dans l'ordre, si vous pouvez continuer à rouler, et le juste prix, avant qu'un garage ne vous fasse un devis.",
      codeSteps: [
        "Faites lire le code — la plupart des magasins de pièces scannent gratuitement, ou un lecteur de codes l'affiche directement.",
        "Saisissez-le — MECHA vérifie le format instantanément.",
        "Lisez la traduction — sous forme de diagnostic complet : causes, urgence, juste prix.",
      ],
      stickerEyebrow: "L'autocollant MECHA",
      stickerHeading: "« Cette voiture est protégée par MECHA »",
      stickerBody:
        "Les propriétaires MECHA posent l'autocollant QR sur leur voiture. Il signifie que l'historique de cette voiture — diagnostics, rappels, entretien — vit dans le Health Vault de son propriétaire, là où il doit être. Si la voiture est vendue un jour, cet historique peut la suivre chez le prochain propriétaire.",
      stickerBody2:
        "Vous avez scanné l'autocollant de quelqu'un d'autre ? Vous savez maintenant ce que MECHA fait. Votre voiture peut porter la même protection — le compte est gratuit, et vos 5 premiers diagnostics aussi.",
      stickerCta: "Créez votre compte gratuit",
    },
    app: {
      title: "Scan",
      intro:
        "Partez de ce que la voiture vous montre déjà — son VIN, ses voyants ou un code défaut.",
      freeNote:
        "Décoder un VIN, identifier un voyant et vérifier un code sont gratuits. Seul un diagnostic complet compte dans vos diagnostics gratuits.",
      tabVin: "VIN",
      tabPhoto: "Photo du tableau de bord",
      tabCode: "Code défaut",
      vinLabel: "Numéro d'identification du véhicule (VIN)",
      vinHint:
        "17 caractères, sur le montant de la porte conducteur ou le coin inférieur du pare-brise. Les VIN n'utilisent jamais les lettres I, O ou Q.",
      vinPhotoLabel: "Photographiez la plaque du VIN",
      vinPhotoHint: "Pour votre référence — vérifiez le VIN saisi par rapport à la photo avant de décoder.",
      decodeCta: "Décoder ce VIN",
      decoding: "Décodage…",
      decodeFailed: "Ce VIN n'a pas pu être décodé. Vérifiez les caractères et réessayez.",
      recallsHeading: "Rappels ouverts (NHTSA)",
      recallsNone: "Aucun rappel ouvert enregistré auprès de la NHTSA pour ce véhicule.",
      recallsUnavailable:
        "La recherche de rappels est indisponible pour le moment — le décodage ci-dessus reste exact.",
      diagnoseCarCta: "Diagnostiquer cette voiture",
      saveVaultCta: "Enregistrer dans mon vault",
      savedVault: "Enregistré dans votre Health Vault.",
      viewVault: "Voir le vault",
      saveFailed: "Ce véhicule n'a pas pu être enregistré. Veuillez réessayer.",
      vaultUnwired: "Le vault n'est pas encore relié dans cet environnement — rien n'a été enregistré.",
      photoLabel: "Photo du tableau de bord",
      photoHint:
        "Contact mis, moteur en marche si c'est sans danger. Approchez-vous assez pour que les voyants soient nets. La photo est lue sur le moment et n'est jamais conservée.",
      identifyCta: "Identifier les voyants",
      identifying: "Lecture du tableau de bord…",
      photoUnwiredTitle: "L'identification par photo n'est pas encore activée ici",
      photoUnwiredBody:
        "Cet environnement n'a pas le lecteur de photos relié, donc aucun résultat ne peut être affiché — jamais un résultat inventé. Vous pouvez toujours saisir le nom du voyant sur la page de diagnostic et obtenir la réponse complète.",
      photoFailed:
        "Cette photo n'a pas pu être lue. Essayez une prise plus claire et plus proche du tableau de bord, contact mis.",
      photoNone:
        "Aucun voyant n'a été identifié sur cette photo. Si des voyants sont allumés, reprenez-la de plus près, contact mis — plusieurs voyants allumés moteur éteint sont un contrôle normal des ampoules.",
      odometerRead: "Compteur lu sur votre photo",
      runDiagnosisCta: "Lancer le diagnostic complet",
      retakeCta: "Utiliser une autre photo",
      vehicleOptionalLabel: "Votre voiture (optionnel)",
      vehicleOptionalPlaceholder: "ex. Honda Accord 2019",
      codeLabel: "Code défaut",
      codeHint:
        "D'un lecteur de codes ou d'un scan gratuit en magasin de pièces — une lettre (P, B, C ou U) plus quatre caractères, comme P0420.",
      codeInvalid: "Cela ne ressemble pas encore à un code défaut — il doit ressembler à P0420.",
      codeExplainCta: "Expliquer ce code",
      codeSystemSuffix: "système",
      codeGeneric: "code OBD-II standard",
      codeManufacturer: "code spécifique au constructeur",
      diagnosisNote:
        "L'explication se lance comme un diagnostic complet à l'écran suivant — causes, urgence et juste prix.",
    },
  },
  auth: {
    social: {
      continueWithGoogle: "Continuer avec Google",
      or: "ou",
      failed: "La connexion avec Google n'a pas fonctionné. Réessayez, ou connectez-vous avec votre e-mail et votre mot de passe ci-dessous.",
      googleOnly: "Ce compte utilise la connexion avec Google, il n'y a donc aucun mot de passe à vérifier. Utilisez « Continuer avec Google » ci-dessus.",
    },
    register: {
      confirmPassword: "Confirmer le mot de passe",
      passwordMismatch: "Les mots de passe ne correspondent pas — vérifiez-les et réessayez.",
    },
    completeProfile: {
      title: "Encore une chose : votre numéro de téléphone",
      body: "MECHA reconnaît votre compte par votre e-mail ET votre numéro de téléphone — ensemble, ils protègent vos 5 diagnostics gratuits, pour que personne ne puisse remettre votre compteur à zéro en se réinscrivant. Ajoutez votre numéro pour terminer la configuration de votre compte.",
      phoneLabel: "Numéro de téléphone",
      submit: "Enregistrer et continuer",
      saving: "Enregistrement…",
      failed: "Ce numéro de téléphone n'a pas pu être enregistré. Vérifiez le numéro et réessayez.",
      bannerTitle: "Terminez la configuration de votre compte",
      bannerBody: "Ajoutez votre numéro de téléphone pour débloquer vos diagnostics gratuits. Cela prend dix secondes et protège le compteur de diagnostics de votre compte.",
      bannerCta: "Ajouter mon numéro de téléphone",
    },
  },
};

export default fr;
