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
    },
    protect: {
      title: "Pwoteje",
      body: "Pran foto nenpòt estimasyon pri epi MECHA separe l liy pa liy — pyès kont men-dèv — epi li siyal chak liy ki depase pri ki jis pou travay sa a sou machin ou. Ou apwouve liy ki jis yo. Ou kesyone rès la.",
      point1: "Vèdik liy pa liy: jis, wo, oswa abi",
      point2: "Konparezon an se resi a — montre l nan kontwa a",
      point3: "Atelye ki sou MECHA konnen estimasyon an ap verifye",
    },
    remember: {
      title: "Sonje",
      body: "Chak dyagnostik, resi ak sèvis ale nan Vout Sante machin ou an — yon memwa ki suiv machin nan, pa atelye a. Rapèl antretyen, siveyans rapèl, ak yon istwa yon acheté nan lavni ka fè konfyans, nan yon kòd QR sou machin nan menm.",
      point1: "Foto resi yo tounen istwa sèvis estriktire",
      point2: "Rapèl antretyen ak anrejistreman, alè",
      point3: "Yon QR MECHA pou machin ou — istwa li, avèk pèmisyon w",
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
};

export default ht;
