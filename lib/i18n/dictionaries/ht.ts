import type { DeepPartial } from "../types";
import type { Dictionary } from "./en";

/** HT (Kreyòl ayisyen) — full homepage catalog (WP2). App-route catalogs
 *  land in WP5/WP7; native-review pass before cutover per §2.2. */
const ht: DeepPartial<Dictionary> = {
  meta: {
    title: "MECHA — Kopilòt IA pou machin ou",
    description:
      "MECHA li limyè avètisman, kòd erè ak sentòm machin ou, li eksplike w an langaj senp sa ki pwobableman pa mache, epi li di w ki pri ki jis pou reparasyon an — anvan w peye pèsòn.",
  },
  header: {
    navDiagnose: "Dyagnostik",
    navPricing: "Pri yo",
    navShops: "Pou atelye yo",
    signIn: "Konekte",
    createAccount: "Kreye yon kont",
    themeToggleLabel: "Chanje ant tèm klè ak tèm fènwa",
    languageLabel: "Lang",
  },
  hero: {
    eyebrow: "Kopilòt IA pou machin ou",
    titleLine1: "Konnen sa ki pa mache.",
    titleLine2: "Konnen konbyen li dwe koute.",
    sub: "Vize MECHA sou yon limyè avètisman, yon kòd erè, oswa yon bri etranj. W ap jwenn yon dyagnostik an langaj senp, jan li grav, ak pri ki jis pou reparasyon an — anvan yon atelye ba w pa yo a.",
    scanCta: "Eskane machin ou",
    watchCta: "Gade kijan li mache",
    filmFairPrice: "Gade verifikasyon pri jis la",
    points: {
      noHardware: "Ou pa bezwen achte okenn aparèy — telefòn ou se eskanè a",
      plainLanguage: "Langaj senp, nan lang ou",
      freeToStart: "Gratis pou kòmanse — ou pa bezwen kat",
    },
  },
  pillars: {
    eyebrow: "Sa MECHA fè",
    heading: "Twa travay. Yon kopilòt.",
    diagnose: {
      title: "Dyagnostik",
      body: "Dekri yon sentòm, pran foto tablodbò w, oswa eskane VIN ou. MECHA li limyè avètisman ak kòd pann yo tankou yon teknisyen ekspè ta fè l — apre li eksplike w yo tankou yon zanmi ki ekspè vre.",
      point1: "Kòz yo klase, sa ki pi pwobab la an premye",
      point2: "Gravite sou chak rezilta: kontinye, kondi dousman, oswa rete kounye a",
      point3: "Pwoblèm yo konnen sou machin ou ak rapèl ki louvri yo, verifye otomatikman",
      detail:
        "Gravite a pa janm vag — kontinye, kondi dousman, oswa rete kounye a, avèk rezon an an mo senp. Chak rapò pote tou pri ki jis la ak tan men-dèv yon atelye ki jis ta dwe pran, konsa ou konnen fòm bòdwo a anvan pèsòn ekri l.",
    },
    protect: {
      title: "Pwoteje",
      body: "Pran foto nenpòt estimasyon pri epi MECHA separe l liy pa liy — pyès kont men-dèv — epi li siyal chak liy ki depase pri ki jis pou travay sa a sou machin ou. Ou apwouve liy ki jis yo. Ou kesyone rès la.",
      point1: "Vèdik liy pa liy: jis, wo, oswa abi",
      point2: "Konparezon an se resi a — montre l nan kontwa a",
      point3: "Atelye ki sou MECHA konnen estimasyon an ap verifye",
      detail:
        "Twa vèdik, toujou an mo — pa janm koulè sèlman. Jis: anndan pri ki jis pou travay sa a sou machin ou. Wo: pi wo pase l — mande poukisa. Abi: pri a depase jis la anpil — kesyone l anvan w apwouve anyen.",
    },
    remember: {
      title: "Sonje",
      body: "Chak dyagnostik, resi ak sèvis ale nan Vout Sante machin ou an — yon memwa ki suiv machin nan, pa atelye a. Rapèl antretyen, siveyans rapèl, ak yon istwa yon acheté nan lavni ka fè konfyans, nan yon kòd QR sou machin nan menm.",
      point1: "Foto resi yo tounen istwa sèvis estriktire",
      point2: "Rapèl antretyen ak anrejistreman, alè",
      point3: "Yon QR MECHA pou machin ou — istwa li, avèk pèmisyon w",
      detail:
        "Resi w pran foto yo tounen dosye sèvis ki gen dat. MECHA veye rapèl ki louvri yo epi li raple w antretyen ak anrejistreman anvan yo pase dat — epi lè w vann machin nan, kòd QR li pèmèt yon acheté wè egzakteman istwa ou chwazi pataje a.",
    },
  },
  fairPrice: {
    eyebrow: "Pri jis vs estimasyon yo a",
    heading: "Estimasyon an, verifye liy pa liy.",
    body: "Sa se verifikasyon MECHA fè sou nenpòt estimasyon reparasyon — sa atelye a mande, sa travay la koute jis sou machin ou, ak ki liy pou w kesyone anvan w di wi.",
    exampleLabel: "Egzanp — chif yo se ilistrasyon",
    jobLabel: "Ranplasman altènatè",
    theirQuote: "Estimasyon yo a",
    fairRange: "Pri ki jis",
    total: "Total",
    verdictWord: "Wo",
    verdictText:
      "De liy depase pri ki jis pou machin sa a. Kesyone maj sou pyès la ak frè atelye a anvan w apwouve.",
    lines: {
      part: { name: "Altènatè (pyès)", verdict: "Wo" },
      labor: { name: "Men-dèv", verdict: "Jis" },
      supplies: { name: "Frè materyèl atelye", verdict: "Abi" },
    },
    lineTypes: { part: "Pyès", labor: "Men-dèv", fee: "Frè" },
  },
  howItWorks: {
    eyebrow: "Kijan li mache",
    heading: "Depi limyè avètisman rive nan repons lan, an kat etap.",
    body: "Ou pa bezwen achte eskanè, ou pa bezwen pran randevou. Ou kòmanse avèk sa w ka wè ak tande — MECHA fini avèk sa ki pwobableman pa mache, jan li grav, ak konbyen reparasyon an ta dwe koute jis.",
    steps: {
      describe: {
        title: "Dekri l, pran foto l, oswa eskane l",
        body: "Ekri sentòm lan an mo pa w, pran foto limyè avètisman an sou tablodbò w, antre yon kòd pann, oswa eskane VIN ou. Telefòn ou se sèl zouti ou bezwen.",
      },
      ranked: {
        title: "Kòz ki pwobab yo, klase",
        body: "MECHA peze sentòm lan kont mak, modèl ak istwa machin ou, apre li klase kòz ki pwobab yo — sa ki pi pwobab la an premye, chak avèk pyès li montre a ak sa reparasyon an mande.",
      },
      severity: {
        title: "Yon vèdik klè sou gravite a",
        body: "Chak repons pote youn nan twa vèdik: Kontinye — ou ka kontinye an sekirite. Kondi dousman — repare l byento. Rete kounye a — pa kondi l; rele yon remòkaj. Ou pa bezwen devine sa yon limyè ap eseye di ankò.",
      },
      price: {
        title: "Pri ki jis la, anvan atelye a",
        body: "Chak dyagnostik fini avèk pri ki jis pou reparasyon an sou machin ou — pyès ak men-dèv — plis tan men-dèv yon atelye ki jis ta dwe pran. Premye estimasyon w ap tande a, se youn ou ka deja jije.",
      },
    },
    includesTitle: "Sa chak dyagnostik gen ladan l",
    includes: {
      explanation: "Yon eksplikasyon an langaj senp sou sa ki pwobableman pa mache",
      causes: "Kòz ki pwobab yo, klase — chak avèk pyès li ak pri li",
      severity: "Yon vèdik gravite: kontinye, kondi dousman, oswa rete kounye a",
      cost: "Pri ki jis pou reparasyon an, pyès ak men-dèv",
      labor: "Tan men-dèv yon atelye ki jis ta dwe pran",
      steps: "Sa pou w fè apre, nan lòd",
      tip: "Yon konsèy teknisyen — sa pou w di nan atelye a, ak sa pou w veye",
      saved: "Rapò a anrejistre nan Vout Sante machin ou an, rapèl yo verifye",
    },
  },
  reportExample: {
    eyebrow: "Anndan yon dyagnostik",
    heading: "Sa se repons ou jwenn nan.",
    body: "Se pa yon kòd pou w al chèche, se pa yon devine — se yon rapò ou ka aji sou li, epi ou ka remèt li bay yon atelye. Sa se fòm chak rapò MECHA, yo montre l avèk yon pwoblèm egzanp.",
    exampleLabel: "Dyagnostik egzanp — ilistrasyon",
    symptomLabel: "Sentòm lan",
    symptom: "« Limyè check-engine limen, epi motè a tranble lè m rete nan yon limyè ».",
    severity: "Modere — Repare l Byento",
    safeLine: "Ou ka kondi dousman",
    diagnosis:
      "Yon silenn ap rate — li sispann pran dife, konsa motè a ap mache sou rès yo. Se sa ki fè l tranble lè l ralanti, epi se pou sa limyè a limen.",
    fairRangeLabel: "Pri jis pou reparasyon",
    fairRangeValue: "$180–$320",
    partsTitle: "Kòz ki pwobab yo",
    parts: {
      coil: {
        name: "Bobin alimaj",
        likelihood: "Pi pwobab",
        cost: "$120–$190",
        desc: "Yon bobin ki mouri koupe etensèl yon silenn. Yon pann ki rive souvan, epi li repare avèk yon sèl pyès.",
      },
      plugs: {
        name: "Bouji",
        likelihood: "Posib",
        cost: "$80–$160",
        desc: "Bouji ki ize rate lè motè a ralanti ak lè l ap fòse. Yo chanje yo an seri konplè an jeneral.",
      },
      injector: {
        name: "Enjektè gaz",
        likelihood: "Mwens pwobab",
        cost: "$220–$380",
        desc: "Yon enjektè ki bouche anpeche yon silenn jwenn gaz. Yo verifye l apre bobin ak bouji yo.",
      },
    },
    stepsTitle: "Sa pou w fè apre",
    step1: "Kondi dousman — pa pran otowout, pa pote gwo chay, jouktan yo verifye l.",
    step2: "Pran randevou nan yon atelye nan kèk jou. Di yo se yon silenn ki rate — epi montre yo rapò sa a.",
    step3: "Mande yo teste bobin alimaj la an premye: kòz ki pi pwobab la, ak verifikasyon ki pi bon mache a.",
    tipLabel: "Konsèy teknisyen an",
    tip: "Si limyè check-engine lan kòmanse flache, sispann kondi. Yon limyè k ap flache vle di rate a grav ase pou l domaje konvètisè katalitik la — yon bòdwo ki pi gwo anpil.",
    disclaimer:
      "Yon egzanp, avèk detay ilistrasyon. Rapò pa w la fèt apati vrè sentòm machin ou an. Dyagnostik yo se enfòmasyon, epi yo pa janm ranplase enspeksyon pratik yon mekanisyen.",
  },
  businesses: {
    eyebrow: "Tou pre w, lè sa konte",
    heading: "Bon èd la, a kèk minit de machin nan.",
    body: "Yon dyagnostik di sa ki pa mache. Kesyon ki vin apre a, se ki moun ki ka repare l — oswa ki ka vin chèche l. Antre yon kòd postal, oswa kite MECHA itilize pozisyon w, epi repons lan se yon lis yo fè pou yon chofè ki anba presyon.",
    shops: {
      title: "Atelye reparasyon tou pre w",
      body: "Atelye ki alantou w, sa ki pi pre a an premye — yo jwenn yo pandan dyagnostik la toujou sou ekran w, konsa premye apèl la kòmanse avèk repons.",
      point1: "Yon repons senp anlè: « 6 atelye tou pre w »",
      point2: "Chak anons kòmanse avèk non atelye a, apre distans li de ou",
      point3: "Nimewo telefòn lan se bouton an — yon sèl touch epi w ap pale avèk atelye a",
    },
    towing: {
      title: "Remòkaj, lè machin nan pa ka bouje",
      body: "Lè vèdik la se Rete kounye a, menm rechèch la montre konpayi remòkaj ki sèvi plas egzak ou a — paske yon chofè ki bloke bezwen yon kamyon, pa yon anyè.",
      point1: "Klase pa distans — èd ki pi pre a vini an premye",
      point2: "Anons ki kòmanse avèk non, apèl yon sèl touch, ou ka li yo bò wout la",
      point3: "Konpayi yo endike zòn yo sèvi a, konsa ou rele sèlman kamyon ki ka rive jwenn ou",
    },
    forBusiness: {
      title: "Ou gen yon atelye, oswa yon kamyon remòkaj?",
      body: "Anrejistre biznis ou epi chofè ki tou pre w yo jwenn ou pa kòd postal nan moman yo bezwen èd — non w an premye, nimewo w a yon touch, ak yon kliyan ki deja konnen pri ki jis la.",
      cta: "Anrejistre biznis ou",
    },
    marketplace: {
      title: "Plas mache a",
      body: "Machin pou vann, anrejistre an fason onèt: foto gide — devan, dèyè, de kote yo, tablodbò a, ak machin nan antye — yon vrè deskripsyon, pri a, ak pwoblèm yo konnen yo vandè a deklare depi nan kòmansman.",
      cta: "Gade plas mache a",
    },
  },
  pricing: {
    eyebrow: "Pri yo",
    heading: "Gratis pou kòmanse. Onèt sou kontè a.",
    body: "Chak kont kòmanse avèk 5 dyagnostik gratis. Apre chak youn, MECHA di w egzakteman konbyen ki rete w — 4, apre 3, apre 2 — epi lè l rive zewo, ou chwazi: abòne, oswa rete. Yo pa janm chaje w anyen an kachèt.",
    free: {
      name: "Gratis",
      price: "$0",
      period: "Ou pa bezwen kat",
      point1: "5 dyagnostik, yo konte yo sou kont ou — pa sou yon navigatè ni yon sesyon",
      point2: "Yon kontè ou ka wè, ak dekont la apre chak dyagnostik",
      point3: "Pri ki jis la sou chak rapò",
      point4: "Vout Sante w: istwa, siveyans rapèl, ak rapèl antretyen",
      cta: "Kòmanse gratis",
    },
    pro: {
      name: "Pro",
      price: "$9.99",
      period: "Pa mwa",
      badge: "Pou chofè yo",
      point1: "Dyagnostik san limit — kontè a disparèt",
      point2: "Analiz apwofondi pou pwoblèm ki reziste yon premye repons",
      point3: "Tout sa ki nan Gratis, san dekont la",
      point4: "Manm bonè yo: 3 mwa Pro gratis, pri lansman bloke pou lavi",
      cta: "Pran Pro",
    },
    shops: {
      name: "Atelye yo",
      price: "$149",
      period: "Pa mwa, pa lokal",
      badge: "Pou atelye ak remòkaj",
      point1: "Biznis ou nan lis tou pre a chofè yo rele ladan l lan",
      point2: "Non an premye, distans la parèt, yon touch pou rele w",
      point3: "Chofè ki rive deja konnen pri ki jis la",
      point4: "Anons pou atelye reparasyon ak konpayi remòkaj tou",
      cta: "Anrejistre biznis ou",
    },
    meterTitle: "Kontè a, an plen vi",
    meterNote:
      "Kont gratis la mare avèk ou — imèl ou ak nimewo telefòn ou — pa janm avèk yon cookie navigatè ni yon sèl sesyon. Dekonekte epi reyanrejistre pa reyinisyelize l, epi li pa fèt pou sa: senk dyagnostik gratis pa moun se antant la, epi antant la se menm bagay pou tout moun.",
  },
  faq: {
    eyebrow: "Kesyon yo",
    heading: "Yo mande, epi yo reponn dwat.",
    items: {
      accuracy: {
        q: "Ki presizyon yon dyagnostik MECHA genyen?",
        a: "MECHA klase kòz ki pi pwobab pou sentòm ou yo, li eksplike chak youn, epi li ba w pri ki jis pou reparasyon an. Se pi bon pwen depa posib — ak yon vrè pwoteksyon nan kontwa a — men li pa ranplase men yon mekanisyen sou machin nan. MECHA di sa li menm, sou chak rapò.",
      },
      freeEnd: {
        q: "Kisa k ap pase lè 5 dyagnostik gratis mwen yo fini?",
        a: "W ap wè l ap vini: apre chak dyagnostik, MECHA di w konbyen ki rete w. Lè l rive zewo, dyagnostik yo pran yon poz jouktan ou chwazi Pro. Yo pa chaje w anyen otomatikman, epi kont ou, machin ou yo, ak istwa w rete egzakteman kote yo ye a.",
      },
      reset: {
        q: "Èske m ka reyinisyelize kont gratis la si m reyanrejistre?",
        a: "Non — epi se esprè. Kont la mare avèk idantite kont ou, imèl ou ak nimewo telefòn ou, konsa yon nouvo anrejistreman avèk menm detay yo repran menm kontè a. Senk dyagnostik gratis pa moun kenbe antant la jis pou tout moun.",
      },
      hardware: {
        q: "Èske m bezwen achte yon eskanè, oswa okenn aparèy?",
        a: "Non. Telefòn ou se eskanè a: dekri sentòm lan, pran foto limyè avètisman an, ekri yon kòd pann, oswa eskane VIN lan.",
      },
      languages: {
        q: "Ki lang MECHA pale?",
        a: "MECHA pale trèz lang: anglè, espanyòl, fransè, kreyòl ayisyen, pòtigè, alman, italyen, polonè, ris, ikrenyen, tik, arab ak ebre. Dyagnostik IA a reponn ou nan lang ou chwazi a.",
      },
      privacy: {
        q: "Ki moun ki ka wè istwa machin mwen an?",
        a: "Ou menm. Vout Sante w se pou kont ou li ye, epi istwa QR machin ou an pataje sèlman avèk pèmisyon w — pa egzanp, lè w vann machin nan epi ou chwazi montre yon acheté dosye li.",
      },
      business: {
        q: "Mwen gen yon atelye — oswa yon kamyon remòkaj. Kijan pou m anrejistre?",
        a: "Kreye yon kont biznis avèk non w, nimewo telefòn ou, ak kòd postal ou. Chofè ki tou pre w yo ap jwenn ou nan lis tou pre a apre sa: non w an premye, distans ou parèt, yon touch pou rele w.",
      },
    },
  },
  diagnosePage: {
    eyebrow: "MECHA Diagnose",
    heading: "Kòmanse avèk sentòm lan. Fini avèk yon plan.",
    sub: "Yon limyè avètisman, yon son etranj, yon kòd yon magazen pyès ba w — nenpòt jan pwoblèm lan anonse tèt li, MECHA transfòme l nan kòz ki klase, yon vèdik gravite ki klè, pri ki jis la, ak sa pou w fè apre.",
    primaryCta: "Dyagnostike machin mwen",
    scanCta: "Eksplore Scan",
    accountNote:
      "Eskane yon VIN, idantifye yon limyè, ak verifye yon kòd gratis. Yon dyagnostik konplè itilize youn nan 5 dyagnostik gratis ou yo, epi kontè a toujou parèt anvan ak apre.",
    modes: {
      eyebrow: "Twa fason pou antre",
      heading: "Kòmanse avèk sa machin nan ba w.",
      body: "Ou pa bezwen bon vokabilè a ni yon zouti pa w. Kòmanse apati yon deskripsyon, yon foto, yon VIN, oswa yon kòd erè — chak chemen rasanble yon kalite prèv diferan pou menm rapò a.",
      describe: {
        kicker: "01 — Dekri",
        title: "Di l nan pawòl pa w",
        body: "Ekri sa w wè, tande, santi, oswa pran sant, epi kilè sa rive. “Li vibre lè m rete”, “li fè klik lè m vire”, ak “li pran sant sikre apre m kondi” se bon pwen depa.",
        detail:
          "Ajoute machin nan ak tout sa ki chanje — yon reparasyon resan, yon nouvo son, yon limyè ki te parèt epi ki ale. Dyagnostik la peze sentòm lan kont machin nan ak istwa li, olye li trete chak machin kòm menm machin.",
        point1: "Pi bon pou son, vibrasyon, sant, fuit, ak pwoblèm ki vini epi ki ale",
        point2: "Ou pa bezwen vokabilè teknik",
        point3: "Li mache kòm yon dyagnostik konplè, avèk rapò antye a",
        cta: "Dekri yon sentòm",
      },
      photo: {
        kicker: "02 — Foto",
        title: "Kite tablodbò a pale",
        body: "Pran foto gwoup enstriman an epi MECHA nonmen chak limyè avètisman li ka idantifye, eksplike l nan langaj klè, epi ba l yon nivo ijans.",
        detail:
          "Yon foto idantifye limyè a — pa fòt kache ki anba l la. Lè limyè a lonje dwèt sou yon bagay ki pi pwofon, chemen an pase rezilta sa yo nan yon dyagnostik konplè, olye li pretann foto a te reponn tout bagay.",
        point1: "Li nonmen epi eksplike senbòl ki limen yo",
        point2: "Li bay ijans lan avèk menm twa vèdik gravite yo",
        point3: "Li ka pase nan yon dyagnostik konplè avèk yon sèl touch",
        cta: "Pran foto yon tablodbò",
      },
      scan: {
        kicker: "03 — Eskane oswa antre yon kòd",
        title: "Itilize idantifyan machin nan menm",
        body: "Dekode VIN 17 karaktè a pou idantifye machin egzak la epi verifye rapèl ki louvri, oswa antre yon kòd erè tankou P0420 pou yon tradiksyon nan langaj klè.",
        detail:
          "VIN lan mare konpatibilite, kòz pwobab yo, ak pri reparasyon yo ak bon ane, mak, modèl, ak motè a. Yon kòd ajoute yon endis sou sistèm lan; dyagnostik konplè a transfòme endis sa a nan kòz ki klase ak yon entèval pri ki jis.",
        point1: "Dekodaj VIN epi verifikasyon rapèl NHTSA ki louvri",
        point2: "Fòma kòd erè a verifye touswit",
        point3: "Anrejistre machin dekode a nan Vout Sante w",
        cta: "Gade kijan Scan mache",
      },
    },
    report: {
      eyebrow: "Anndan rapò a",
      heading: "Uit bagay chak dyagnostik konplè ba w.",
      body: "Rezime paj akèy la se plan an sèlman. Yon rapò konplè eksplike rezònman an ak konsekans pratik yo, konsa repons lan ka sèvi lakay, sou wout la, oswa devan kontwa yon atelye.",
      items: {
        explanation: {
          title: "Eksplikasyon nan langaj klè",
          body: "Sa k ap pase pwobableman anndan machin nan, pouki sa li pwodui sentòm ou remake a, ak kote ensètitid la rete. Tèm teknik yo tradui olye yo repete yo ba w.",
        },
        causes: {
          title: "Kòz pwobab yo, klase",
          body: "Kòz pwobab yo ranje soti nan sa ki pi pwobab rive nan sa ki mwens pwobab. Chak youn nonmen pyès la, sa reparasyon an mande, ak estimasyon pri pa li, konsa yon verifikasyon ki pi bon mache pa antere anba yon sipozisyon ki pi gwo.",
        },
        severity: {
          title: "Vèdik gravite",
          body: "Youn nan twa repons ki klè — Kondi, Kondi avèk prekosyon, oswa Rete kounye a — avèk rezon an. Yo pa janm kominike yon vèdik pa koulè sèlman, epi li mare ak sentòm ki nan rapò a.",
        },
        cost: {
          title: "Entèval pri ki jis",
          body: "Yon entèval pou reparasyon machin ou an, pyès ak men-dèv ladan. Li ba w yon konparezon anvan yon atelye ekri yon estimasyon, li pa yon pwomès chak atelye ap chaje menm kantite a.",
        },
        labor: {
          title: "Tan men-dèv ki jis",
          body: "Tan men-dèv yon atelye ki jis ta dwe bezwen pou travay la. Lè yon estimasyon depann sou men-dèv ki wo anpil, se liy sa a ki fè diferans lan parèt.",
        },
        steps: {
          title: "Sa pou w fè apre, nan lòd",
          body: "Aksyon touswit la, verifikasyon pou w mande an premye yo, ak sa ki ka tann. Lòd la enpòtan: li favorize verifikasyon ki pi pwobab epi ki pi bon mache a anvan gwo travay.",
        },
        tip: {
          title: "Konsèy teknisyen an",
          body: "Yon nòt pratik sou sa pou w di nan atelye a, sa pou w veye pandan w ap kondi, oswa ki chanjman nan sentòm lan ki vle di sitiyasyon an vin pi ijan.",
        },
        saved: {
          title: "Anrejistre nan Vout Sante a",
          body: "Rapò a vin fè pati istwa machin nan, ansanm ak verifikasyon rapèl yo ak dosye sèvis ki vin apre. Pwochen dyagnostik la, ak yon konvèsasyon reparasyon nan avni, ka kòmanse avèk kontèks olye yon paj vid.",
        },
      },
    },
    severity: {
      eyebrow: "Gid gravite",
      heading: "Twa vèdik. Pa gen devine sa yon limyè vle di.",
      body: "Chak dyagnostik itilize menm pawòl yo. Yo se gid apati prèv ki nan rapò a — si machin nan sanble danjere, li pèdi fòs, li chofe twòp, li fè lafimen, oswa yon avètisman kòmanse flache, aksyon ki pi an sekirite a genyen.",
      drive: {
        title: "Kondi",
        body: "Rapò a pa lonje dwèt sou yon rezon pou w rete touswit. Kenbe sentòm lan anba je w epi pwograme verifikasyon yo rekòmande a nan antretyen nòmal.",
        detail:
          "Kondi pa yon garanti anyen pa mal. Li vle di prèv yo sipòte kontinye pandan w ap veye chanjman epi swiv etap ki vin apre yo.",
      },
      careful: {
        title: "Kondi avèk prekosyon",
        body: "Pwoblèm lan merite atansyon rapid. Limite kondi ki mande anpil, evite gwo chay lè rapò a di sa, epi pran randevou enspeksyon an byento.",
        detail:
          "Si sentòm lan vin pi mal, yon nouvo avètisman parèt, oswa machin nan kòmanse pèdi fòs, trete sitiyasyon an kòm pi ijan pase vèdik orijinal la.",
      },
      stop: {
        title: "Rete kounye a",
        body: "Pa kontinye kondi avèk pwoblèm sa a. Rete yon kote ki an sekirite, etenn machin nan lè yo konseye w sa, epi itilize èd ki tou pre a oswa remòkaj olye w eseye rive lakay.",
        detail:
          "Vèdik sa a egziste pou pwoblèm kote kontinye kondi ka kreye yon risk sekirite oswa transfòme yon fòt ou ka repare nan domaj ki pi gwo anpil.",
      },
    },
    speed: {
      eyebrow: "Fèt pou bò wout la",
      heading: "Repons lan kòmanse rive an dirèk.",
      body: "Yo livre yon dyagnostik kòm yon kouran: rapò a kòmanse parèt pandan rès la ap ekri toujou, olye li kite w devan yon ekran atant vid jouktan chak mo fini.",
      detail:
        "Sa se repons dirèk rekonstriksyon an bay ansyen eksperyans lan — yon sèl chemen modèn, depi sentòm rive rapò, avèk gravite, kòz, ak entèval pri ki jis la k ap rive kòm yon sèl repons estriktire.",
      note: "Tan reyèl la depann de koneksyon an ak konpleksite pwoblèm lan. MECHA pa ranpli yon atant avèk yon rezilta envante.",
    },
    meter: {
      title: "Senk dyagnostik konplè, gratis",
      body: "Kont gratis ou a mare ak idantite kont ou — imèl ak telefòn — epi li rete apre w dekonekte. Apre chak dyagnostik, MECHA di w konbyen ki rete. Lè l rive zewo, dyagnostik yo pran yon poz jouktan ou chwazi Pro; yo pa chaje w anyen otomatikman.",
    },
    final: {
      eyebrow: "Kòmanse gratis",
      heading: "Pote bay MECHA pwoblèm ou gen jodi a.",
      body: "Kreye kont gratis la, ajoute machin nan, epi lanse premye dyagnostik la. Rapò a, entèval pri ki jis la, ak istwa a se pou w konsève.",
      cta: "Kreye yon kont gratis",
      secondaryCta: "Dyagnostike kounye a",
    },
  },
  pricingPage: {
    eyebrow: "Pri yo, an antye",
    heading: "Chwazi dapre travay ou gen devan w lan.",
    sub: "Plan yo senp esprè: kòmanse gratis, retire kontè dyagnostik la avèk Pro, oswa mete yon lokal biznis devan chofè ki tou pre yo avèk Atelye yo. Detay yo — faktirasyon ladan — sou paj sa a, yo pa antere apre peman.",
    decision: {
      eyebrow: "Pou ki moun chak plan ye",
      heading: "Bon gwosè a, san yon labirent nivo.",
      body: "Diferans ant plan yo se travay yo rezoud la, pa yon pakè limit atifisyèl.",
      free: {
        title: "Gratis — konnen sa ki pa mache",
        body: "Pou yon chofè ki devan yon limyè avètisman oswa yon sentòm li pa konnen, ki bezwen yon premye repons kredib anvan li peye yon reparasyon.",
        detail:
          "Ou jwenn 5 dyagnostik konplè, entèval pri ki jis la sou chak rapò, ak Vout Sante a. Ou pa bezwen kat pou kòmanse, epi kantite ki rete a toujou parèt.",
      },
      pro: {
        title: "Pro — retire kontè a",
        body: "Pou chofè ki dyagnostike plis pase yon pwoblèm okazyonèl, k ap kouri dèyè yon fòt ki vini epi ki ale, oswa ki vle nivo analiz apwofondi a disponib lè yon premye repons pa ase.",
        detail:
          "Pro bay dyagnostik estanda san limit ak analiz apwofondi pou pwoblèm ki reziste, pandan li kenbe Vout la ak pwoteksyon pri ki jis la ki nan Gratis.",
      },
      shops: {
        title: "Atelye yo — rete tou pre lè sa konte",
        body: "Pou yon lokal atelye reparasyon oswa remòkaj ki vle parèt nan rezilta tou pre MECHA yo lè yon chofè pare pou rele.",
        detail:
          "Plan an se pa lokal, pa pa konpayi nan abstrè. Non biznis ou an mennen anons lan, distans la parèt, epi nimewo telefòn lan se aksyon apèl yon sèl touch la.",
      },
    },
    billing: {
      eyebrow: "Faktirasyon, san pyèj",
      heading: "Abòne lè w chwazi. Anile lè w chwazi.",
      body: "Plan peye yo pase nan peman entènèt MECHA ak zouti faktirasyon kont la. Plan an, estati a, ak peryòd aktyèl la parèt nan tablodbò a nan pawòl klè.",
      point1: "Peman entènèt ka montre kat, ansanm ak Apple Pay ak Google Pay, lè bous sa yo disponib sou aparèy la ak navigatè a",
      point2: "Yon sèl aksyon, “Jere oswa anile nenpòt ki lè”, louvri faktirasyon pou yon abòne",
      point3: "Yon anilasyon ki pwograme parèt kòm yon dat fen, olye li kache dèyè yon etikèt renouvèlman",
      point4: "Gratis pa mande kat, epi fini 5 dyagnostik gratis yo pa janm kòmanse yon plan peye pou kont li",
      note: "Se aparèy peman an, navigatè a, ak reglaj kont Stripe la ki deside si bous yo disponib. MECHA pa pwomèt yon bouton bous kote platfòm lan pa ka ofri l.",
    },
    faq: {
      eyebrow: "Kesyon sou pri yo",
      heading: "Faktirasyon, yo reponn anvan peman.",
      items: {
        card: {
          q: "Èske m bezwen yon kat kredi pou plan gratis la?",
          a: "Non. Gratis kòmanse san kat. Ou resevwa 5 dyagnostik konplè, epi MECHA montre kantite ki rete a apre chak youn.",
        },
        cancel: {
          q: "Kijan pou m anile yon plan peye?",
          a: "Louvri seksyon faktirasyon an nan tablodbò w epi chwazi “Jere oswa anile nenpòt ki lè”. Kont la montre estati plan an epi, lè yon anilasyon pwograme, dat peryòd peye a fini.",
        },
        payments: {
          q: "Èske m ka peye avèk Apple Pay oswa Google Pay?",
          a: "Nan peman entènèt, Stripe ka ofri Apple Pay ak Google Pay ansanm ak kat yo lè bous la aktive epi li disponib sou aparèy ou ak navigatè w. Si yon bous pa disponib, opsyon kat la rete la.",
        },
        freeEnd: {
          q: "Kisa k ap pase lè dyagnostik gratis yo rive zewo?",
          a: "Dyagnostik yo pran yon poz. Kont ou, machin ou yo, rapò w yo, ak istwa Vout ou a rete disponib, epi yo pa chaje w anyen otomatikman. Ou chwazi si w ap kòmanse Pro.",
        },
        early: {
          q: "Kisa premye manm yo resevwa?",
          a: "Òf premye manm ki an plas la se 3 mwa Pro gratis ak pri lansman bloke pou lavi. Li mare ak plan Pro ki sou paj sa a; MECHA pa ajoute yon nivo sipriz apa nan peman.",
        },
        business: {
          q: "Èske plan Atelye yo chaje pa konpayi oswa pa lokal?",
          a: "Pa lokal — $149 pa mwa pou chak lokal atelye oswa remòkaj ki anrejistre. Yon biznis ki vle anrejistre yon lòt lokal itilize yon plan pou lokal sa a.",
        },
      },
    },
    final: {
      eyebrow: "Pa bezwen kat pou kòmanse",
      heading: "Itilize dyagnostik gratis yo an premye.",
      body: "Kite pwodui a pwouve tèt li sou yon vrè pwoblèm. Chanje plan sèlman lè kontè a oswa anons biznis la rezoud yon pwoblèm ou vrèman genyen.",
      cta: "Kòmanse gratis",
      businessCta: "Anrejistre yon biznis",
    },
  },
  shopsPage: {
    eyebrow: "Pou atelye ak remòkaj",
    heading: "Se non yon chofè ka rele.",
    sub: "Lè MECHA di yon chofè rete kounye a oswa chèche èd byento, biznis ki tou pre yo vin pwochen etap la. Yon anons fèt pou moman sa a: non w an premye, distans ou parèt klè, epi nimewo telefòn ou pare pou touch.",
    primaryCta: "Kreye yon kont biznis",
    nearbyCta: "Gade rechèch tou pre a",
    listing: {
      eyebrow: "Sa anons lan ba w",
      heading: "Yon pwofil yo fè pou yon chofè anba presyon, pa yon paj anyè.",
      body: "Anons lan pote enfòmasyon yon chofè bezwen pou chwazi epi rele. Li pa antere nimewo telefòn lan anba tèks maketing epi li pa fè non biznis la fè konpetisyon avèk evalyasyon dekoratif.",
      profile: {
        title: "Idantite biznis la",
        body: "Non biznis ou, nimewo telefòn ou, ak pozisyon w ki baze sou kòd postal idantifye anons lan. Non an se eleman prensipal la, paske rekonesans ak konfyans kòmanse la.",
      },
      serviceArea: {
        title: "Bon zòn sèvis la",
        body: "Yo prezante atelye reparasyon yo alantou machin nan; konpayi remòkaj yo pote tou zòn sèvis yo chwazi a, konsa yo dirije chofè yo vè èd ki vrèman ka rive jwenn yo.",
      },
      presentation: {
        title: "Non, distans, apèl",
        body: "Rezilta yo klase pa distans epi yo louvri avèk yon kantite ki klè. Chak rezilta kòmanse avèk non biznis la, montre ki distans li ye, epi fè nimewo telefòn lan tounen aksyon apèl la.",
      },
      control: {
        title: "Kont ou rete pou ou",
        body: "Tablodbò biznis la pote pwofil la ak estati plan an. Estati faktirasyon an parèt, epi yo ka jere oswa anile abònman an apati chemen faktirasyon kont la.",
      },
    },
    plan: {
      eyebrow: "Plan Atelye yo",
      heading: "Yon lokal. Yon pri mansyèl ki klè.",
      body: "Plan Atelye yo mete yon lokal reparasyon oswa remòkaj nan eksperyans tou pre MECHA a pou chofè k ap itilize chemen dyagnostik la ak rechèch bò wout la.",
      priceLabel: "Pa mwa, pa lokal",
      point1: "Yon anons tou pre pou yon lokal atelye reparasyon oswa remòkaj",
      point2: "Prezantasyon ki kòmanse avèk non, avèk distans ak apèl yon sèl touch",
      point3: "Chofè ki ka rive avèk yon dyagnostik ak entèval pri ki jis la deja nan men yo",
      point4: "Tablodbò biznis, estati plan, ak kontwòl pou jere oswa anile faktirasyon",
      note: "Yon anons fè biznis la ka dekouvri nan rezilta tou pre yo. Li pa garanti yon kantite apèl, travay, oswa revni patikilye — demann chofè yo ak distans deside ki moun ki rele.",
      cta: "Anrejistre biznis ou",
    },
    parts: {
      eyebrow: "Kòmand pyès",
      heading: "Apati pyès yo nonmen an rive nan lyen kòmand lan.",
      body: "Lè yon dyagnostik ki fini nonmen yon pyès, MECHA ka konstwi lyen detayan pou travay ak machin egzak sa a. Pou yon atelye, sa vin yon chemen kòmand pratik apati rapò a, olye yon nouvo rechèch ou tape apati memwa.",
      point1: "Lyen yo pote ane, mak, modèl, ak motè machin nan lè yo konnen detay sa yo",
      point2: "Menm lis pyès la sèvi chofè ki fè l yo menm, pwopriyetè ki gen eksperyans, ak kòmand atelye yo",
      point3: "Yo verifye pri aktyèl la nan detayan an; MECHA make pwòp chif li kòm yon estimasyon, pa yon pri magazen",
      disclosure:
        "Lyen pyès yo ka fè MECHA touche yon komisyon. Avètisman an vwayaje avèk blòk la, lyen an pa chanje pri a nan detayan an, epi lyen afilye yo pa janm enfliyanse dyagnostik la — yo konstwi sèlman apre vèdik la fini. Yo montre yon rabè pou achtè sèlman lè kondisyon reyèl pwogram yon detayan ofri youn.",
    },
    faq: {
      eyebrow: "Kesyon pwopriyetè yo",
      heading: "Pou atelye ak remòkaj, yo reponn dwat.",
      items: {
        eligibility: {
          q: "Ki biznis ki ka anrejistre?",
          a: "Atelye reparasyon ak konpayi remòkaj ka kreye yon kont biznis avèk non biznis la, nimewo telefòn lan, ak kòd postal la. Kalite kont la kontwole jan yo prezante biznis la nan rezilta tou pre yo.",
        },
        guarantee: {
          q: "Èske MECHA garanti apèl oswa travay?",
          a: "Non. Yon anons mete biznis la nan rezilta tou pre yo, klase pa distans, lè chofè yo chèche. MECHA pa garanti volim apèl, travay rezève, oswa revni.",
        },
        prepared: {
          q: "Kisa yon chofè konnen anvan li rele?",
          a: "Yon chofè ka rive avèk rapò dyagnostik la: kòz pwobab yo, yon vèdik gravite, entèval reparasyon ki jis la, ak etap ki vin apre yo. Sa ka fè premye konvèsasyon an kòmanse apati prèv olye yon sentòm vag.",
        },
        cost: {
          q: "Konbyen plan biznis la koute?",
          a: "Plan Atelye yo koute $149 pa mwa, pa lokal. Yon atelye reparasyon ak yon konpayi remòkaj itilize menm plan biznis pa lokal la.",
        },
        cancel: {
          q: "Èske yon biznis ka anile?",
          a: "Wi. Seksyon faktirasyon tablodbò a bay chemen pou jere oswa anile, epi estati plan an ak fen peryòd la parèt nan pawòl klè.",
        },
        parts: {
          q: "Kijan lyen pyès yo ede yon atelye?",
          a: "Yon rapò ki fini ka transfòme pyès yo nonmen yo nan lyen detayan ki adapte ak machin nan, sa ekonomize yon rechèch apa epi kenbe detay machin nan mare ak chemen kòmand lan. Yo konfime pri aktyèl la ak disponiblite a nan detayan an.",
        },
      },
    },
    final: {
      eyebrow: "Anrejistre lokal la",
      heading: "Mete biznis la kote bezwen an parèt.",
      body: "Kreye kont biznis la, ajoute lokal chofè yo dwe jwenn lan, epi pare pou apèl ki kòmanse avèk yon dyagnostik la.",
      cta: "Kreye yon kont biznis",
      pricingCta: "Gade pri konplè yo",
    },
  },
  finalCta: {
    eyebrow: "Gratis pou kòmanse",
    heading: "5 premye dyagnostik ou yo se kado nou.",
    body: "Kreye yon kont gratis epi MECHA ap woule avèk ou depi premye limyè avètisman an. Dekri sentòm nan, pran foto tablo a, oswa eskane VIN nan — ou jwenn repons lan an lang klè, jan li grav, ak pri jis la, anvan yon atelye ba ou pri pa yo.",
    cta: "Kreye kont gratis ou a",
    note: "Ou pa bezwen kat. MECHA toujou di w egzakteman konbyen dyagnostik gratis ki rete w.",
  },
  footer: {
    tagline: "Kopilòt IA pou machin ou — dyagnostik, pwoteksyon pri jis, ak yon memwa pou machin ou.",
    support: "Sipò",
    privacy: "Konfidansyalite",
    terms: "Kondisyon",
    contact: "Kontak",
    rights: "Tout dwa rezève.",
    operator: "MECHA Technologies, Inc.",
    disclaimer:
      "Dyagnostik MECHA yo se enfòmasyon sèlman epi yo pa ranplase enspeksyon yon mekanisyen sètifye.",
  },
  scan: {
    landing: {
      eyebrow: "MECHA Scan",
      heading: "Lonje. Eskane. Konnen sa ki pa mache.",
      sub: "Machin ou deja ap di ou sa ki pa mache — nan yon kòd bar, nan limyè avètisman yo, nan kòd erè yo. Scan li tout twa epi li reponn nan langaj klè, ak pri jis la ladan.",
      startCta: "Kòmanse yon scan",
      registerCta: "Kreye yon kont gratis",
      accountNote:
        "Kont gratis — 5 premye dyagnostik ou yo gratis, epi MECHA toujou di ou egzakteman konbyen ki rete ou.",
      vinKicker: "01 — Scan VIN",
      vinHeading: "Kòd bar la se batistè machin nan",
      vinBody:
        "Chak machin pote idantite li nan yon VIN 17 karaktè. Dekode li epi MECHA konnen egzakteman ki machin lap gade — bon motè a, bon pyès yo, bon pri reparasyon yo — epi li tcheke NHTSA pou recall ki louvri sou machin presi sa a. Anrejistre li, epi machin nan vin yon dosye pèmanan nan Health Vault ou.",
      vinSteps: [
        "Jwenn kòd bar la — sou poto pòt chofè a, oswa nan kwen anba vit devan an.",
        "Tape 17 karaktè yo, oswa pran foto plak la pou verifye yo.",
        "Wè machin presi a — ane, mak, modèl, motè — ansanm ak recall ki louvri yo.",
      ],
      photoKicker: "02 — Foto tablodbò",
      photoHeading: "Yon limyè avètisman, esplike nan langaj klè",
      photoBody:
        "Limyè avètisman yo pale an senbòl, epi manyèl la pa janm nan machin nan. Pran foto tablodbò a epi MECHA bay chak senbòl ki limen non li, esplike sa li vle di, epi klase ijans la — kanpe kounye a, repare byento, oswa veye li. Lè yon limyè bezwen yon repons ki pi pwofon, yon sèl tape transfòme foto a an yon dyagnostik konplè.",
      photoSteps: [
        "Pran foto tablodbò a — kontak limen, pre, san bouje.",
        "Resevwa non ak siyifikasyon an — chak limyè ki limen, nan langaj klè, ak ijans li klase.",
        "Ale pi lwen lè sa enpòtan — pase nan yon dyagnostik konplè ak limyè yo deja ranpli.",
      ],
      photoHonestTitle: "Sa yon foto ka fè — ak sa li pa ka fè",
      photoHonestBody:
        "Yon foto montre ki limyè ki limen, pa kòd erè ki anba li a. MECHA idantifye limyè a epi li esplike li; dyagnostik konplè a fouye koz yo. Sa se triyaj, pa majik — epi nou pap prezante li kòm plis pase sa.",
      codeKicker: "03 — Kòd erè",
      codeHeading: "Ou gen yon kòd tankou P0420? Resevwa tradiksyon an",
      codeBody:
        "Yon magazen pyès ap scan machin ou gratis epi li ba ou yon kòd — apre sa li kite ou devine konbyen sa koute. Tape kòd la nan MECHA epi resevwa tradiksyon an nan langaj klè: sa li vle di sou machin ou, koz ki pi pwobab yo nan lòd, si ou ka kontinye kondwi, ak pri jis la, anvan nenpòt atelye ba ou yon pri.",
      codeSteps: [
        "Fè yo li kòd la — pifò magazen pyès scan gratis, oswa yon lektè kòd montre li dirèkteman.",
        "Tape li — MECHA verifye fòma a imedyatman.",
        "Li tradiksyon an — kòm yon dyagnostik konplè: koz, ijans, pri jis.",
      ],
      stickerEyebrow: "Otokolan MECHA a",
      stickerHeading: "“Machin sa a pwoteje pa MECHA”",
      stickerBody:
        "Mèt MECHA yo mete otokolan QR la sou machin yo. Li vle di istwa machin sa a — dyagnostik, recall, sèvis — rete nan Health Vault mèt li, kote li dwe ye. Si machin nan vann yon jou, istwa sa a ka vwayaje ak li bay nouvo mèt la.",
      stickerBody2:
        "Ou scan otokolan yon lòt moun? Kounye a ou konnen sa MECHA fè. Machin ou ka pote menm pwoteksyon an — kont la gratis, epi 5 premye dyagnostik ou yo gratis tou.",
      stickerCta: "Kreye kont gratis ou",
    },
    app: {
      title: "Scan",
      intro:
        "Kòmanse ak sa machin nan deja ap montre ou — VIN li, limyè avètisman li yo, oswa yon kòd erè.",
      freeNote:
        "Dekode yon VIN, idantifye yon limyè, ak verifye yon kòd gratis. Se sèlman yon dyagnostik konplè ki konte nan dyagnostik gratis ou yo.",
      tabVin: "VIN",
      tabPhoto: "Foto tablodbò",
      tabCode: "Kòd erè",
      vinLabel: "Nimewo idantifikasyon machin nan (VIN)",
      vinHint:
        "17 karaktè, sou poto pòt chofè a oswa nan kwen anba vit devan an. VIN yo pa janm itilize lèt I, O, oswa Q.",
      vinPhotoLabel: "Pran foto plak VIN nan",
      vinPhotoHint: "Pou referans ou — verifye VIN ou tape a ak foto a anvan ou dekode.",
      decodeCta: "Dekode VIN sa a",
      decoding: "Ap dekode…",
      decodeFailed: "VIN sa a pa t ka dekode. Verifye karaktè yo epi eseye ankò.",
      recallsHeading: "Recall ki louvri (NHTSA)",
      recallsNone: "Pa gen recall ki louvri anrejistre nan NHTSA pou machin sa a.",
      recallsUnavailable:
        "Rechèch recall la pa disponib kounye a — dekodaj ki anwo a rete egzak.",
      diagnoseCarCta: "Dyagnostike machin sa a",
      saveVaultCta: "Anrejistre nan vault mwen",
      savedVault: "Anrejistre nan Health Vault ou.",
      viewVault: "Wè vault",
      saveFailed: "Machin sa a pa t ka anrejistre. Tanpri eseye ankò.",
      vaultUnwired: "Vault la poko konekte nan anviwònman sa a — anyen pa anrejistre.",
      photoLabel: "Foto tablodbò",
      photoHint:
        "Kontak limen, motè ap mache si sa san danje. Pwoche ase pou limyè yo parèt nèt. Foto a li nan moman an epi li pa janm estoke.",
      identifyCta: "Idantifye limyè yo",
      identifying: "Ap li tablodbò a…",
      photoUnwiredTitle: "Idantifikasyon pa foto poko aktive isit la",
      photoUnwiredBody:
        "Anviwònman sa a pa gen lektè foto a konekte, kidonk okenn rezilta pa ka parèt — janm yon rezilta envante. Ou ka toujou tape non limyè a nan paj dyagnostik la epi resevwa repons konplè a.",
      photoFailed:
        "Foto sa a pa t ka li. Eseye yon foto ki pi klè, pi pre tablodbò a, ak kontak la limen.",
      photoNone:
        "Pa gen limyè avètisman ki te idantifye nan foto sa a. Si limyè yo limen, repran li pi pre ak kontak la limen — plizyè limyè ki limen ak motè a etenn se yon verifikasyon ampoul nòmal.",
      odometerRead: "Odomèt yo li nan foto ou a",
      runDiagnosisCta: "Lanse dyagnostik konplè a",
      retakeCta: "Itilize yon lòt foto",
      vehicleOptionalLabel: "Machin ou (opsyonèl)",
      vehicleOptionalPlaceholder: "egz. Honda Accord 2019",
      codeLabel: "Kòd erè",
      codeHint:
        "Soti nan yon lektè kòd oswa yon scan gratis nan magazen pyès — yon lèt (P, B, C, oswa U) plis kat karaktè, tankou P0420.",
      codeInvalid: "Sa poko sanble yon kòd erè — li dwe sanble ak P0420.",
      codeExplainCta: "Esplike kòd sa a",
      codeSystemSuffix: "sistèm",
      codeGeneric: "kòd OBD-II estanda",
      codeManufacturer: "kòd espesifik fabrikan an",
      diagnosisNote:
        "Esplikasyon an lanse kòm yon dyagnostik konplè nan ekran apre a — koz, ijans, ak pri jis la.",
    },
  },
  auth: {
    social: {
      continueWithGoogle: "Kontinye ak Google",
      or: "oubyen",
      failed: "Koneksyon ak Google la pa t mache. Tanpri eseye ankò — oubyen konekte ak imèl ou ak modpas ou anba a.",
      googleOnly: "Kont sa a sèvi ak koneksyon Google, kidonk pa gen modpas pou tcheke. Sèvi ak « Kontinye ak Google » anwo a.",
    },
    register: {
      confirmPassword: "Konfime modpas la",
      passwordMismatch: "Modpas yo pa matche — verifye yo epi eseye ankò.",
    },
    completeProfile: {
      title: "Yon dènye bagay — nimewo telefòn ou",
      body: "MECHA rekonèt kont ou a pa imèl ou AK nimewo telefòn ou — ansanm yo pwoteje 5 dyagnostik gratis ou yo, konsa pèsòn pa ka reyentè kontè ou a lè yo enskri ankò. Ajoute nimewo ou pou fini konfigirasyon kont ou a.",
      phoneLabel: "Nimewo telefòn",
      submit: "Anrejistre epi kontinye",
      saving: "N ap anrejistre…",
      failed: "Nou pa t ka anrejistre nimewo telefòn sa a. Tcheke nimewo a epi eseye ankò.",
      bannerTitle: "Fini konfigirasyon kont ou a",
      bannerBody: "Ajoute nimewo telefòn ou pou debloke dyagnostik gratis ou yo. Sa pran dis segonn, epi li pwoteje kontè dyagnostik kont ou a.",
      bannerCta: "Ajoute nimewo telefòn mwen",
    },
  },
};

export default ht;
