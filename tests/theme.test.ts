/**
 * Theme atomicity tests — regression guard for the owner-caught
 * production defect of 2026-11-03 (mechatech.io, light theme):
 * the homepage rendered a LIGHT page background with the DARK theme's
 * near-white text — headline white-on-white, logo and header pills
 * ghosted — while /register rendered correctly.
 *
 * Root cause pinned here: the design-elevation "cinematic scopes"
 * (.hero-scope / .header-overlay in app/globals.css) ASSIGNED the dark
 * theme's --color-ink-* / --color-line / --color-inset values
 * unconditionally for copy that once sat on the full-bleed hero film.
 * After the hero restructure (film = framed player, copy on the plain
 * page background), a light-theme render resolved its background from
 * the light token set and its foregrounds from those forced dark
 * values — two theme sets in one render.
 *
 * The structural rules these tests enforce:
 *   1. Each theme block defines the COMPLETE semantic token family —
 *      background and foreground tokens always ship together.
 *   2. NO rule outside the two theme blocks may assign a --color-*
 *      token. Scoped token overrides are the desync mechanism; they
 *      are banned, not merely audited.
 *   3. In each theme, the page background and the primary ink sit on
 *      opposite ends of the luminance range (the pairing a reader
 *      actually depends on).
 *   4. Theme selection has exactly ONE mechanism: the pre-paint script
 *      sets [data-theme] from the stored preference, defaulting to
 *      dark. No prefers-color-scheme input, no scope classes in the
 *      hero/header components.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cssRaw = readFileSync(join(root, "app/globals.css"), "utf8");
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");

/** The complete semantic family every theme block must define. */
const THEME_TOKENS = [
  "--color-bg",
  "--color-surface",
  "--color-surface-raised",
  "--color-inset",
  "--color-line",
  "--color-ink-1",
  "--color-ink-2",
  "--color-ink-3",
  "--color-accent",
  "--color-accent-bright",
  "--color-accent-deep",
  "--color-accent-ink",
];

type Rule = { selector: string; body: string };

/** Minimal brace-matching rule parser (recurses into @media). */
function parseRules(text: string): Rule[] {
  const rules: Rule[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) break;
    const selector = text.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
      j++;
    }
    const body = text.slice(open + 1, j - 1);
    if (selector.startsWith("@media")) {
      rules.push(...parseRules(body));
    } else if (selector && !selector.startsWith("@keyframes")) {
      rules.push({ selector, body });
    }
    i = j;
  }
  return rules;
}

const rules = parseRules(css);

function themeBlock(theme: "dark" | "light"): Rule {
  const rule = rules.find((r) => r.selector.includes(`[data-theme="${theme}"]`));
  assert.ok(rule, `globals.css must define a [data-theme="${theme}"] block`);
  return rule;
}

function assignments(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  assert.ok(m, `expected a #rrggbb color, got "${hex}"`);
  const [r, g, b] = [0, 2, 4].map((o) => {
    const c = parseInt(m[1].slice(o, o + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function stripTsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

test("each theme block defines the complete token family (bg + fg together)", () => {
  for (const theme of ["dark", "light"] as const) {
    const tokens = assignments(themeBlock(theme).body);
    for (const token of THEME_TOKENS) {
      assert.ok(
        tokens.has(token),
        `[data-theme="${theme}"] must define ${token} — background and foreground tokens ship as one set`,
      );
    }
  }
});

test("no rule outside the two theme blocks assigns a --color-* token", () => {
  for (const rule of rules) {
    if (rule.selector.includes("[data-theme=")) continue;
    const assigned = [...assignments(rule.body).keys()];
    assert.deepEqual(
      assigned,
      [],
      `rule "${rule.selector}" assigns ${assigned.join(", ")} — scoped token overrides desync the theme (see the atomicity rule in globals.css)`,
    );
  }
});

/** WCAG contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test("background and primary ink are luminance-opposed in each theme", () => {
  const dark = assignments(themeBlock("dark").body);
  const light = assignments(themeBlock("light").body);
  assert.ok(luminance(dark.get("--color-bg")!) < 0.05, "dark theme bg must be near-black");
  assert.ok(luminance(dark.get("--color-ink-1")!) > 0.6, "dark theme ink-1 must be near-white");
  assert.ok(luminance(light.get("--color-bg")!) > 0.6, "light theme bg must be near-white");
  assert.ok(luminance(light.get("--color-ink-1")!) < 0.05, "light theme ink-1 must be near-black");
});

test("foreground contrast floors hold in both themes (owner readability rule)", () => {
  // Owner add-on, 2026-11-03: light-mode text must be bold and clearly
  // readable — near-black headlines, genuinely dark body copy, no
  // pale-gray text, labels/links with real contrast. Dark mode already
  // reads fine and must not degrade, so the same floors pin both.
  const dark = assignments(themeBlock("dark").body);
  const light = assignments(themeBlock("light").body);
  for (const [name, tokens] of [
    ["dark", dark],
    ["light", light],
  ] as const) {
    const bg = tokens.get("--color-bg")!;
    assert.ok(contrast(tokens.get("--color-ink-1")!, bg) >= 12, `${name}: ink-1 (headlines) must reach 12:1 on bg`);
    assert.ok(contrast(tokens.get("--color-ink-2")!, bg) >= 7, `${name}: ink-2 (body copy) must reach 7:1 on bg`);
    assert.ok(contrast(tokens.get("--color-ink-3")!, bg) >= 4.5, `${name}: ink-3 (captions/labels) must reach 4.5:1 on bg — no pale gray`);
    assert.ok(contrast(tokens.get("--color-accent")!, bg) >= 3, `${name}: accent must stay visible on bg`);
    // The CTA pairing: text ON the accent must be readable in both the
    // resting and hover (accent-bright) states.
    assert.ok(
      contrast(tokens.get("--color-accent-ink")!, tokens.get("--color-accent")!) >= 4.5,
      `${name}: accent-ink on accent must reach 4.5:1`,
    );
    assert.ok(
      contrast(tokens.get("--color-accent-ink")!, tokens.get("--color-accent-bright")!) >= 4.5,
      `${name}: accent-ink on accent-bright (hover) must reach 4.5:1`,
    );
  }
  // Light theme carries the owner's explicit bar: labels/links in the
  // accent color itself also meet the text floor on paper + surface.
  for (const ground of ["--color-bg", "--color-surface"] as const) {
    assert.ok(
      contrast(light.get("--color-accent")!, light.get(ground)!) >= 4.5,
      `light: accent labels must reach 4.5:1 on ${ground}`,
    );
    assert.ok(
      contrast(light.get("--color-ink-3")!, light.get(ground)!) >= 4.5,
      `light: ink-3 must reach 4.5:1 on ${ground}`,
    );
  }
});

test("one theme mechanism: stored preference + dark default, no scope classes", () => {
  const script = stripTsComments(
    readFileSync(join(root, "components/ThemeScript.tsx"), "utf8"),
  );
  assert.ok(
    !script.includes("prefers-color-scheme"),
    "ThemeScript must not consult prefers-color-scheme — [data-theme] has one input: the stored preference",
  );
  assert.ok(script.includes('localStorage.getItem("mecha-theme")'));
  assert.ok(script.includes('dataset.theme="dark"') || script.includes('"dark"'));

  for (const [file, banned] of [
    ["components/Hero.tsx", "hero-scope"],
    ["components/Header.tsx", "header-overlay"],
  ] as const) {
    const src = readFileSync(join(root, file), "utf8");
    assert.ok(!src.includes(banned), `${file} must not use the .${banned} scope — it desyncs the theme`);
  }
  for (const rule of rules) {
    assert.ok(
      !rule.selector.includes("hero-scope") && !rule.selector.includes("header-overlay"),
      `globals.css must not define scope overrides, found "${rule.selector}"`,
    );
  }
});
