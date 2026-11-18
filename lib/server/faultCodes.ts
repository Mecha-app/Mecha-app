/**
 * Fault-code reference pages (Pass #20, SEO engine — the TorqueBot
 * lesson: a page for every code is free traffic and makes MECHA a
 * source people and AI answers cite).
 *
 * GROUNDING RULE: this dataset carries ONLY the SAE J2012 *generic*
 * (P0xxx) definitions — the standardized meanings every code reader
 * uses — for the most commonly searched codes, plus the structural
 * facts the product itself derives in faultCodeInfo() (system from
 * the first letter, generic vs manufacturer scope from the second
 * digit). Manufacturer-specific codes (P1xxx and kin) are NOT given
 * invented definitions anywhere: their meaning varies by maker, and
 * the pages say exactly that. Causes listed are the standard,
 * textbook first checks for the code — the same short list any
 * reference gives — never presented as a diagnosis of a specific
 * car. Urgency uses the product's own three severity bands.
 *
 * Pure module: no imports beyond scan.ts, no I/O. The /codes pages,
 * the sitemap, and the test suite all read from here so they can
 * never disagree.
 */
import { faultCodeInfo, validateFaultCode } from "./scan";

export type CodeUrgency = "stop" | "soon" | "monitor";

export interface FaultCodeEntry {
  code: string;
  /** The SAE generic definition, in the standard's own short form. */
  title: string;
  /** Plain-language explanation — what the car is actually saying. */
  plain: string;
  /** The standard first checks, most common first. Generic, not a diagnosis. */
  causes: string[];
  /** The product's severity language, mapped from the code's usual risk. */
  urgency: CodeUrgency;
  /** One honest sentence on driving with this code lit. */
  driving: string;
}

export const FAULT_CODE_PAGES: FaultCodeEntry[] = [
  {
    code: "P0101",
    title: "Mass Air Flow Circuit Range/Performance",
    plain:
      "The mass air flow (MAF) sensor measures the air entering the engine so the computer can match fuel to it. This code means its reading doesn't agree with what the engine should be breathing — the mixture goes off, and the car may hesitate, surge, or drink fuel.",
    causes: [
      "A dirty or failing MAF sensor",
      "An air leak between the sensor and the engine (a cracked intake hose is common)",
      "A clogged engine air filter",
      "Wiring or connector damage at the sensor",
    ],
    urgency: "soon",
    driving:
      "Usually safe to drive gently, but fuel economy and drivability suffer — get it checked within days, not months.",
  },
  {
    code: "P0113",
    title: "Intake Air Temperature Sensor Circuit High",
    plain:
      "The intake air temperature sensor tells the computer how cold or warm the incoming air is, which fine-tunes the fuel mixture. This code means its signal is out of range — often a wiring problem rather than the sensor itself.",
    causes: [
      "A failed intake air temperature sensor (often built into the MAF sensor)",
      "A broken or corroded wire in the sensor circuit",
      "A loose or damaged connector",
    ],
    urgency: "monitor",
    driving:
      "Safe to drive. The car falls back to a default mixture, so you may notice slightly worse fuel economy until it's fixed.",
  },
  {
    code: "P0128",
    title: "Coolant Thermostat — Coolant Temperature Below Regulating Temperature",
    plain:
      "The engine is taking too long to warm up, or never fully gets there. The thermostat — the valve that controls coolant flow — is usually stuck open, so the engine runs cold: weaker cabin heat, worse fuel economy, and an emissions test it may fail.",
    causes: [
      "A thermostat stuck open (the most common cause)",
      "A coolant temperature sensor reading low",
      "Low coolant level",
    ],
    urgency: "monitor",
    driving:
      "Safe to drive, but don't ignore it for months — an engine that runs cold wears faster and uses more fuel.",
  },
  {
    code: "P0171",
    title: "System Too Lean (Bank 1)",
    plain:
      "The engine is getting too much air or too little fuel on bank 1. The computer has stretched its fuel correction to the limit and still can't balance the mixture — expect rough idle, hesitation, and worse fuel economy.",
    causes: [
      "A vacuum leak (cracked hose, intake gasket)",
      "A dirty or failing MAF sensor under-reading airflow",
      "A weak fuel pump or clogged fuel filter starving the engine",
      "A leaking or lazy oxygen sensor misleading the computer",
    ],
    urgency: "soon",
    driving:
      "Drive gently and book it soon — running lean for long can overheat exhaust components and damage the catalytic converter.",
  },
  {
    code: "P0174",
    title: "System Too Lean (Bank 2)",
    plain:
      "The same lean condition as P0171 — too much air or too little fuel — on bank 2 of the engine (the other cylinder head on a V engine). Causes and urgency mirror bank 1.",
    causes: [
      "A vacuum leak on the bank 2 side",
      "A dirty or failing MAF sensor under-reading airflow",
      "Low fuel pressure from a weak pump or clogged filter",
      "A misleading oxygen sensor",
    ],
    urgency: "soon",
    driving:
      "Drive gently and book it soon — a long-running lean condition can damage the catalytic converter.",
  },
  {
    code: "P0300",
    title: "Random/Multiple Cylinder Misfire Detected",
    plain:
      "One or more cylinders are failing to fire properly, and not always the same one. Unburned fuel passes into the exhaust, the engine shakes or hesitates, and the catalytic converter takes the heat — literally.",
    causes: [
      "Worn spark plugs or failing ignition coils",
      "A vacuum leak leaning out the mixture",
      "Low fuel pressure",
      "A clogged or failing fuel injector",
    ],
    urgency: "soon",
    driving:
      "If the check-engine light is FLASHING, stop driving — a flashing light means the misfire is severe enough to damage the catalytic converter. Steady light: drive gently to a diagnosis soon.",
  },
  {
    code: "P0301",
    title: "Cylinder 1 Misfire Detected",
    plain:
      "Cylinder 1 specifically is failing to fire on some cycles. The engine runs rough, power drops, and unburned fuel heads for the catalytic converter. A single-cylinder code is good news for diagnosis: the suspects live on that one cylinder.",
    causes: [
      "A worn or fouled spark plug on cylinder 1",
      "A failing ignition coil on cylinder 1",
      "A clogged or failing fuel injector on cylinder 1",
      "Low compression on cylinder 1 (the check that comes after the cheap ones)",
    ],
    urgency: "soon",
    driving:
      "If the check-engine light is FLASHING, stop driving — the misfire can damage the catalytic converter. Steady light: drive gently and get it diagnosed soon.",
  },
  {
    code: "P0401",
    title: "Exhaust Gas Recirculation (EGR) Flow Insufficient",
    plain:
      "The EGR system routes a little exhaust back into the engine to cut emissions and combustion temperatures. This code means not enough is flowing — usually because the passages have clogged with carbon over the years.",
    causes: [
      "Carbon-clogged EGR passages",
      "A stuck or failed EGR valve",
      "A faulty EGR pressure/position sensor",
      "A cracked or disconnected EGR vacuum hose",
    ],
    urgency: "monitor",
    driving:
      "Safe to drive — the car usually runs normally — but it will fail an emissions test and can ping under load until it's cleaned or replaced.",
  },
  {
    code: "P0420",
    title: "Catalyst System Efficiency Below Threshold (Bank 1)",
    plain:
      "The catalytic converter on bank 1 isn't cleaning exhaust as well as it should, judged by the oxygen sensors before and after it. The converter is the famous expensive guess — but sensors and exhaust leaks can tell the same lie, which is why this code deserves a real diagnosis before anyone orders parts.",
    causes: [
      "A worn-out catalytic converter (the last thing to conclude, not the first)",
      "A lazy or failed oxygen sensor giving a false reading",
      "An exhaust leak ahead of the converter",
      "An engine problem (misfire, oil burning) that poisoned the converter",
    ],
    urgency: "soon",
    driving:
      "Safe to drive in most cases, but the car will fail an emissions inspection, and whatever damaged the converter keeps damaging it — diagnose the cause, not just the code.",
  },
  {
    code: "P0430",
    title: "Catalyst System Efficiency Below Threshold (Bank 2)",
    plain:
      "The bank 2 twin of P0420: that side's catalytic converter is cleaning below threshold, per its oxygen sensors. Same rule applies — sensors and leaks can fake it, so diagnose before replacing anything.",
    causes: [
      "A worn-out catalytic converter on bank 2 (the last thing to conclude)",
      "A lazy or failed oxygen sensor on bank 2",
      "An exhaust leak ahead of the bank 2 converter",
      "An engine problem that poisoned the converter",
    ],
    urgency: "soon",
    driving:
      "Safe to drive in most cases, but it will fail an emissions inspection — and the root cause keeps working on the converter until it's found.",
  },
  {
    code: "P0442",
    title: "Evaporative Emission System Leak Detected (Small Leak)",
    plain:
      "The fuel-vapor (EVAP) system seals gasoline fumes in instead of venting them. Its self-test found a small leak. The single most common cause costs nothing to check: the gas cap.",
    causes: [
      "A loose, worn, or wrong gas cap (check this first — free)",
      "A cracked EVAP hose",
      "A failing purge or vent valve",
      "A small crack in the charcoal canister",
    ],
    urgency: "monitor",
    driving:
      "Safe to drive — this is an emissions-system leak, not a fuel spill. Tighten or replace the cap and see if the light clears over a few trips before paying for a smoke test.",
  },
  {
    code: "P0455",
    title: "Evaporative Emission System Leak Detected (Large Leak)",
    plain:
      "The EVAP self-test found a large vapor leak — most often the gas cap left loose or its seal failed, occasionally a hose off or a filler-neck problem. 'Large' describes the vapor leak the test measured, not a fuel puddle.",
    causes: [
      "A gas cap loose, missing, or with a failed seal (check first — free)",
      "A disconnected or split EVAP hose",
      "A filler-neck leak",
      "A stuck-open purge or vent valve",
    ],
    urgency: "monitor",
    driving:
      "Safe to drive. Check the cap first; if the light stays on after a few trips, the system needs a proper leak test.",
  },
  {
    code: "P0507",
    title: "Idle Air Control System RPM Higher Than Expected",
    plain:
      "The engine is idling faster than it should. On modern cars the computer runs the throttle body directly; extra air sneaking in — or a throttle body too dirty to close fully — pushes the idle up.",
    causes: [
      "A vacuum leak letting in unmetered air",
      "A dirty throttle body that can't close fully",
      "A sticking idle-control or throttle actuator",
      "A faulty PCV valve",
    ],
    urgency: "monitor",
    driving:
      "Safe to drive, though a high idle wastes fuel and can make an automatic creep harder at stops. A throttle-body cleaning is often the whole fix.",
  },
];

const BY_CODE = new Map(FAULT_CODE_PAGES.map((entry) => [entry.code, entry]));

export function faultCodePage(raw: string): FaultCodeEntry | null {
  const code = validateFaultCode(raw);
  if (!code) return null;
  return BY_CODE.get(code) ?? null;
}

/** The codes that carry full reference pages, in display order. */
export function faultCodePageCodes(): string[] {
  return FAULT_CODE_PAGES.map((entry) => entry.code);
}

/** Structural facts for ANY valid code — the product's own derivation. */
export function codeStructure(raw: string): { code: string; system: string; scope: "generic" | "manufacturer" } | null {
  const code = validateFaultCode(raw);
  if (!code) return null;
  const info = faultCodeInfo(code);
  return { code: info.code, system: info.system, scope: info.scope };
}

/* ------------------------------------------------------------------ */
/* Common-problems pages — models grounded in NHTSA complaints data    */
/* ------------------------------------------------------------------ */

export interface PopularModel {
  year: string;
  make: string;
  model: string;
  /** URL slug: /cars/<slug>/common-problems */
  slug: string;
}

export function modelSlug(year: string, make: string, model: string): string {
  return `${year}-${make}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function popular(year: string, make: string, model: string): PopularModel {
  return { year, make, model, slug: modelSlug(year, make, model) };
}

/**
 * The models with common-problems pages. Chosen from high-volume US
 * models — three are vehicles MECHA has already run live NHTSA data
 * for (2015 Corolla, 2019 Accord, 2013 F-150). A model only appears
 * here because the page's content comes from NHTSA's complaints
 * record at request time; if NHTSA has nothing or is unreachable,
 * the page says so instead of inventing problems.
 */
export const POPULAR_MODELS: PopularModel[] = [
  popular("2013", "Ford", "F-150"),
  popular("2015", "Toyota", "Corolla"),
  popular("2018", "Toyota", "Camry"),
  popular("2020", "Toyota", "RAV4"),
  popular("2019", "Honda", "Accord"),
  popular("2018", "Honda", "Civic"),
  popular("2019", "Honda", "CR-V"),
  popular("2019", "Chevrolet", "Silverado 1500"),
  popular("2018", "Ford", "Escape"),
  popular("2017", "Nissan", "Rogue"),
];

export function popularModelBySlug(slug: string): PopularModel | null {
  return POPULAR_MODELS.find((m) => m.slug === slug) ?? null;
}
