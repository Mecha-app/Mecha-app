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
    joinWaitlist: "Antre nan lis atant la",
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
        a: "Sit la ak app la pale anglè, espanyòl, fransè ak kreyòl ayisyen jodi a, epi yo reponn dyagnostik ou a nan lang ou. Plis lang ap ajoute — MECHA fèt pou chofè tout kote, pa sèlman pou moun ki pale anglè.",
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
  waitlist: {
    eyebrow: "Beta prive",
    heading: "Antre anvan pòt yo louvri.",
    body: "MECHA nan beta prive. Antre nan lis atant la avèk imèl ou — premye manm yo jwenn 3 mwa Pro gratis ak pri lansman yo bloke pou lavi.",
    placeholder: "ou@egzanp.com",
    button: "Antre nan lis atant la",
    note: "Yon sèl imèl lè envitasyon w pare. Anyen lòt, janm.",
    success: "Ou sou lis la. Veye bwat imèl ou pou envitasyon an.",
    errorInvalid: "Imèl sa a sanble pa konplè — verifye l epi eseye ankò.",
    errorStub:
      "Lis atant la ap louvri avèk nouvo sit la — imèl ou poko anrejistre. (Vèsyon baz WP2.)",
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
};

export default ht;
