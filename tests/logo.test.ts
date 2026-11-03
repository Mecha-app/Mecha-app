/**
 * Logo-on-every-page tests — owner directive (2026-11-03): the MECHA
 * logo is on EVERY page, and one click on it always returns to the
 * main page. The big-brand pattern, pinned as a route-inventory guard
 * in the same style as scan.test.ts's dead-link sweep:
 *
 *   - marketing/public pages render <Header> (or <LegalShell>, which
 *     renders <Header>): logo lockup → "/" with a ≥48px tap target;
 *   - auth + standalone flow pages render <MinimalTopBar>:
 *     logo lockup → "/";
 *   - the business auth pages borrow <AppNav> but pass logoHref="/"
 *     (pre-sign-in: home is the public main page);
 *   - signed-in app pages render <AppNav>: logo → "/app", the
 *     signed-in user's main page.
 *
 * The audit this guard was born from (2026-11-03, head 9311fa8):
 * /login, /register, /forgot-password, /reset-password,
 * /auth/google/complete, /app/complete-profile and /app/diagnose
 * rendered a bare <main> — no logo, no way home but the back button —
 * and the business auth pages' logo pointed at /app, an area a
 * logged-out visitor cannot enter.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, suffix: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path, suffix));
    else if (entry.name.endsWith(suffix)) out.push(path);
  }
  return out;
}

type ShellKind = "header" | "appNav" | "minimalBar" | "businessAuth";

function classify(route: string): ShellKind {
  // /app/complete-profile is an auth-flow page (the Google sign-in
  // completion step) despite living under /app — the owner's spec
  // lists it with the auth pages: its logo returns to "/".
  if (route === "/app/complete-profile") return "minimalBar";
  if (route === "/app" || route.startsWith("/app/")) return "appNav";
  if (route === "/marketplace" || route === "/listing/:param" || route === "/sell")
    return "appNav";
  if (
    route === "/login" ||
    route === "/register" ||
    route === "/forgot-password" ||
    route === "/reset-password" ||
    route === "/auth/google/complete"
  )
    return "minimalBar";
  if (route === "/business/login" || route === "/business/register") return "businessAuth";
  return "header";
}

test("logo inventory: every route renders a shell whose logo links to its main page", () => {
  const root = process.cwd();
  const appRoot = join(root, "app");

  const pages = walk(appRoot, "page.tsx");
  assert.ok(pages.length > 0, "route inventory must not be empty");

  let checked = 0;
  for (const page of pages) {
    const rel = page.slice(appRoot.length).replace(/\\/g, "/");
    const segments = rel
      .split("/")
      .filter(Boolean)
      .slice(0, -1) // drop page.tsx
      .map((seg) => (seg.startsWith("[") ? ":param" : seg));
    const route = "/" + segments.join("/");
    const source = readFileSync(page, "utf8");
    const kind = classify(route);

    if (kind === "header") {
      assert.ok(
        source.includes("<Header") || source.includes("<LegalShell"),
        `${route} must render <Header> (or <LegalShell>, which renders it) — the logo home link`,
      );
    } else if (kind === "appNav") {
      assert.ok(source.includes("<AppNav"), `${route} must render <AppNav> — the logo home link`);
      assert.ok(
        !source.includes('logoHref="/"'),
        `${route} is a signed-in surface: its logo must keep the /app target, not "/"`,
      );
    } else if (kind === "minimalBar") {
      assert.ok(
        source.includes("<MinimalTopBar"),
        `${route} must render <MinimalTopBar> — the logo home link`,
      );
    } else {
      assert.ok(source.includes("<AppNav"), `${route} must render <AppNav>`);
      assert.ok(
        source.includes('logoHref="/"'),
        `${route} is a pre-sign-in page borrowing <AppNav>: its logo must target "/" via logoHref`,
      );
    }
    checked += 1;
  }
  assert.equal(checked, pages.length, "every page in the inventory was classified and checked");

  // The pages the owner caught bare, pinned explicitly so the class of
  // bug can never quietly return:
  for (const pinned of [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/google/complete",
    "/app/complete-profile",
    "/app/diagnose",
  ]) {
    const file = join(appRoot, ...pinned.split("/").filter(Boolean), "page.tsx");
    const source = readFileSync(file, "utf8");
    assert.ok(
      source.includes("<MinimalTopBar") || source.includes("<AppNav"),
      `${pinned} must carry a logo shell (it shipped bare in the 2026-11-03 audit)`,
    );
  }
});

test("logo link contracts: target, tap size, accessible name, theme-token mark", () => {
  const root = process.cwd();
  const header = readFileSync(join(root, "components/Header.tsx"), "utf8");
  const appNav = readFileSync(join(root, "components/AppNav.tsx"), "utf8");
  const bar = readFileSync(join(root, "components/MinimalTopBar.tsx"), "utf8");
  const legal = readFileSync(join(root, "components/Legal.tsx"), "utf8");
  const logo = readFileSync(join(root, "components/Logo.tsx"), "utf8");

  // Header (marketing shell): logo → "/", at least a 48px tap target,
  // lockup present, accessible name from the dictionary.
  assert.ok(header.includes('href="/"'), "Header logo must link to /");
  assert.ok(header.includes("min-h-[48px]"), "Header logo link must be a ≥48px tap target");
  assert.ok(header.includes("<LogoLockup"), "Header must render the logo lockup");
  assert.ok(
    header.includes("t.header.logoHomeLabel"),
    "Header logo accessible name comes from the dictionary",
  );

  // AppNav (app shell): logo targets the logoHref prop, defaulting to
  // the signed-in main page /app, with the app-home accessible name.
  assert.ok(appNav.includes('logoHref = "/app"'), "AppNav logo must default to /app");
  assert.ok(appNav.includes("href={logoHref}"), "AppNav logo link must use the logoHref prop");
  assert.ok(
    appNav.includes("t.header.logoAppLabel"),
    "AppNav logo accessible name comes from the dictionary",
  );
  assert.ok(appNav.includes("<GaugeMMark"), "AppNav must render the Gauge M mark");

  // MinimalTopBar (auth/standalone shell): logo → "/", ≥48px target,
  // lockup present, dictionary accessible name.
  assert.ok(bar.includes('href="/"'), "MinimalTopBar logo must link to /");
  assert.ok(bar.includes("min-h-[48px]"), "MinimalTopBar logo link must be a ≥48px tap target");
  assert.ok(bar.includes("<LogoLockup"), "MinimalTopBar must render the logo lockup");
  assert.ok(
    bar.includes("t.header.logoHomeLabel"),
    "MinimalTopBar logo accessible name comes from the dictionary",
  );

  // Legal pages inherit the header (and its logo) through LegalShell.
  assert.ok(legal.includes("<Header"), "LegalShell must render <Header>");

  // The mark itself renders from the active theme's tokens
  // (currentColor for the M, the accent token for the arc) — visible in
  // BOTH themes with no forked variants (theme atomicity rule).
  assert.ok(logo.includes('stroke="currentColor"'), "Gauge M body must use currentColor");
  assert.ok(logo.includes("text-ink-1"), "the lockup must ink from the theme token");
});

test("logo accessible names exist in every locale's own dictionary", () => {
  const root = process.cwd();
  const dictDir = join(root, "lib/i18n/dictionaries");
  const files = readdirSync(dictDir).filter((f) => f.endsWith(".ts"));
  assert.equal(files.length, 13, "the owner's 13 v1 locales");
  for (const file of files) {
    const source = readFileSync(join(dictDir, file), "utf8");
    const home = source.match(/logoHomeLabel:\s*"([^"]+)"/);
    const app = source.match(/logoAppLabel:\s*"([^"]+)"/);
    assert.ok(home && home[1].trim().length > 0, `${file} must define a non-empty logoHomeLabel`);
    assert.ok(app && app[1].trim().length > 0, `${file} must define a non-empty logoAppLabel`);
  }
});
