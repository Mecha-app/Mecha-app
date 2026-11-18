"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Logo-on-every-page tests — owner directive (2026-11-03): the MECHA
 * logo is on EVERY page, and one click on it always returns to the
 * main page. The big-brand pattern, pinned as a route-inventory guard
 * in the same style as scan.test.ts's dead-link sweep:
 *
 *   - marketing/public pages render <Header> (or <LegalShell>, which
 *     renders <Header>): logo lockup → "/" with a ≥48px tap target;
 *   - the homepage renders its own slim <HomeHeader> (design pass
 *     "One Screen", 2026-11-16): same logo contract — lockup → "/"
 *     with a ≥48px tap target and the dictionary accessible name;
 *   - auth + standalone flow pages render <MinimalTopBar>:
 *     logo lockup → "/";
 *   - the business auth pages borrow <AppNav> and pass logoHref="/";
 *   - signed-in app pages render <AppNav>: logo → "/" too.
 *   - the footers (<Footer> on public pages, <HomeFooter> on the
 *     homepage) close their pages with the same lockup, and it is a
 *     home link too → "/" (2026-11-16: the owner re-asked for the
 *     logo-to-main-page rule on EVERY page; the two footer lockups
 *     were the last logo renders that were not links at all).
 *
 * Pass #17 (2026-11-17) — THE RULE IS UNIFORM AGAIN: "/" for
 * everyone, signed in or out, on every shell. History: Pass #12
 * (2026-11-16) made the five public/auth shells session-aware
 * (signed in → "/app") after a tap-probe proved the anchors sound
 * and the owner's complaint was read as "the logo lands on the
 * marketing homepage instead of my dashboard." The owner then
 * tested on /app itself and reported the logo "does not work… to
 * take me to the main page": under the session-aware rule the
 * /app logo was a self-link, so the tap visibly did nothing. His
 * standing words, repeated Nov 16–17, settle it: "if you click on
 * the logo, it should take you back to the main page" — the main
 * page is "/", everywhere, for everyone. These pins keep the rule
 * from drifting back to a session-aware target.
 *
 * The audit this guard was born from (2026-11-03, head 9311fa8):
 * /login, /register, /forgot-password, /reset-password,
 * /auth/google/complete, /app/complete-profile and /app/diagnose
 * rendered a bare <main> — no logo, no way home but the back button —
 * and the business auth pages' logo pointed at /app, an area a
 * logged-out visitor cannot enter.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function walk(dir, suffix) {
    const out = [];
    for (const entry of (0, node_fs_1.readdirSync)(dir, { withFileTypes: true })) {
        const path = (0, node_path_1.join)(dir, entry.name);
        if (entry.isDirectory())
            out.push(...walk(path, suffix));
        else if (entry.name.endsWith(suffix))
            out.push(path);
    }
    return out;
}
function classify(route) {
    // The homepage carries its own slim header (design pass "One
    // Screen", 2026-11-16) — same logo contract, different shell.
    if (route === "/")
        return "homeHeader";
    // /app/complete-profile is an auth-flow page (the Google sign-in
    // completion step) despite living under /app — the owner's spec
    // lists it with the auth pages: its logo returns to "/".
    if (route === "/app/complete-profile")
        return "minimalBar";
    if (route === "/app" || route.startsWith("/app/"))
        return "appNav";
    if (route === "/marketplace" || route === "/listing/:param" || route === "/sell")
        return "appNav";
    if (route === "/login" ||
        route === "/register" ||
        route === "/forgot-password" ||
        route === "/reset-password" ||
        route === "/auth/google/complete")
        return "minimalBar";
    if (route === "/business/login" || route === "/business/register")
        return "businessAuth";
    return "header";
}
(0, node_test_1.test)("logo inventory: every route renders a shell whose logo links to the main page", () => {
    const root = process.cwd();
    const appRoot = (0, node_path_1.join)(root, "app");
    const pages = walk(appRoot, "page.tsx");
    strict_1.default.ok(pages.length > 0, "route inventory must not be empty");
    let checked = 0;
    for (const page of pages) {
        const rel = page.slice(appRoot.length).replace(/\\/g, "/");
        const segments = rel
            .split("/")
            .filter(Boolean)
            .slice(0, -1) // drop page.tsx
            .map((seg) => (seg.startsWith("[") ? ":param" : seg));
        const route = "/" + segments.join("/");
        const source = (0, node_fs_1.readFileSync)(page, "utf8");
        const kind = classify(route);
        if (kind === "header") {
            strict_1.default.ok(source.includes("<Header") || source.includes("<LegalShell"), `${route} must render <Header> (or <LegalShell>, which renders it) — the logo home link`);
        }
        else if (kind === "homeHeader") {
            strict_1.default.ok(source.includes("<HomeHeader"), `${route} must render <HomeHeader> — the logo home link`);
        }
        else if (kind === "appNav") {
            strict_1.default.ok(source.includes("<AppNav"), `${route} must render <AppNav> — the logo home link`);
            strict_1.default.ok(!source.includes('logoHref="/app"'), `${route}: no page may point the logo at /app — the rule is "/" everywhere (Pass #17)`);
        }
        else if (kind === "minimalBar") {
            strict_1.default.ok(source.includes("<MinimalTopBar"), `${route} must render <MinimalTopBar> — the logo home link`);
        }
        else {
            strict_1.default.ok(source.includes("<AppNav"), `${route} must render <AppNav>`);
            strict_1.default.ok(source.includes('logoHref="/"'), `${route} is a pre-sign-in page borrowing <AppNav>: its logo must target "/" via logoHref`);
        }
        checked += 1;
    }
    strict_1.default.equal(checked, pages.length, "every page in the inventory was classified and checked");
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
        const file = (0, node_path_1.join)(appRoot, ...pinned.split("/").filter(Boolean), "page.tsx");
        const source = (0, node_fs_1.readFileSync)(file, "utf8");
        strict_1.default.ok(source.includes("<MinimalTopBar") || source.includes("<AppNav"), `${pinned} must carry a logo shell (it shipped bare in the 2026-11-03 audit)`);
    }
});
(0, node_test_1.test)("logo link contracts: target, tap size, accessible name, theme-token mark", () => {
    const root = process.cwd();
    const header = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/Header.tsx"), "utf8");
    const homeHeader = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/HomeHeader.tsx"), "utf8");
    const appNav = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/AppNav.tsx"), "utf8");
    const bar = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/MinimalTopBar.tsx"), "utf8");
    const legal = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/Legal.tsx"), "utf8");
    const logo = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/Logo.tsx"), "utf8");
    const footer = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/Footer.tsx"), "utf8");
    const homeFooter = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, "components/HomeFooter.tsx"), "utf8");
    // The Pass #17 uniform target, shared by every public/auth shell:
    // the logo anchor is a plain href="/" with the dictionary home
    // label — no session read, no computed target, no app label.
    // (Pass #12's session-aware rule — getToken + logoHref +
    // logoAppLabel — must not come back.)
    for (const [name, src] of [
        ["Header", header],
        ["HomeHeader", homeHeader],
        ["MinimalTopBar", bar],
        ["Footer", footer],
        ["HomeFooter", homeFooter],
    ]) {
        strict_1.default.ok(src.includes('href="/"'), `${name} logo anchor must target "/"`);
        strict_1.default.ok(src.includes("t.header.logoHomeLabel"), `${name} logo accessible name must be the dictionary home label`);
        strict_1.default.ok(!src.includes("logoHref"), `${name} must not compute a logo target (Pass #17)`);
        strict_1.default.ok(!src.includes("logoAppLabel"), `${name} must not use the app-home label — the logo goes to the main page`);
        strict_1.default.ok(src.includes("<LogoLockup"), `${name} must render the logo lockup`);
    }
    // Header (marketing shell): at least a 48px tap target in BOTH
    // dimensions — below 480px the wordmark collapses to the mark
    // alone, and the pre-#12 anchor was only 36px wide.
    strict_1.default.ok(header.includes("min-h-[48px]"), "Header logo link must be a ≥48px-tall tap target");
    strict_1.default.ok(header.includes("min-w-[48px]"), "Header logo link must be a ≥48px-wide tap target");
    // HomeHeader (homepage shell): the same tap-target contract.
    strict_1.default.ok(homeHeader.includes("min-h-[48px]"), "HomeHeader logo link must be a ≥48px-tall tap target");
    strict_1.default.ok(homeHeader.includes("min-w-[48px]"), "HomeHeader logo link must be a ≥48px-wide tap target");
    // AppNav (app shell): the logo follows the same rule — the
    // logoHref prop now defaults to "/" and the accessible name is
    // the home label (the business auth pages pass "/" explicitly).
    strict_1.default.ok(appNav.includes('logoHref = "/"'), "AppNav logo must default to /");
    strict_1.default.ok(appNav.includes("href={logoHref}"), "AppNav logo link must use the logoHref prop");
    strict_1.default.ok(appNav.includes("t.header.logoHomeLabel"), "AppNav logo accessible name is the dictionary home label");
    strict_1.default.ok(!appNav.includes("logoAppLabel"), "AppNav must not use the app-home label — the logo goes to the main page");
    strict_1.default.ok(appNav.includes("<GaugeMMark"), "AppNav must render the Gauge M mark");
    // MinimalTopBar (auth/standalone shell): ≥48px tap target (its
    // uniform "/" target is pinned in the shared loop above).
    strict_1.default.ok(bar.includes("min-h-[48px]"), "MinimalTopBar logo link must be a ≥48px tap target");
    // Legal pages inherit the header (and its logo) through LegalShell.
    strict_1.default.ok(legal.includes("<Header"), "LegalShell must render <Header>");
    // Footers (public pages + homepage): the lockup closes the page and
    // is a home link like every other logo on the site — before the
    // 2026-11-16 Pass #11 these two were plain, unlinked renders; their
    // uniform "/" target is pinned in the shared loop above.
    // The mark itself renders from the active theme's tokens
    // (currentColor for the M, the accent token for the arc) — visible in
    // BOTH themes with no forked variants (theme atomicity rule).
    strict_1.default.ok(logo.includes('stroke="currentColor"'), "Gauge M body must use currentColor");
    strict_1.default.ok(logo.includes("text-ink-1"), "the lockup must ink from the theme token");
});
(0, node_test_1.test)("logo accessible names exist in every locale's own dictionary", () => {
    const root = process.cwd();
    const dictDir = (0, node_path_1.join)(root, "lib/i18n/dictionaries");
    const files = (0, node_fs_1.readdirSync)(dictDir).filter((f) => f.endsWith(".ts"));
    strict_1.default.equal(files.length, 13, "the owner's 13 v1 locales");
    for (const file of files) {
        const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(dictDir, file), "utf8");
        const home = source.match(/logoHomeLabel:\s*"([^"]+)"/);
        const app = source.match(/logoAppLabel:\s*"([^"]+)"/);
        strict_1.default.ok(home && home[1].trim().length > 0, `${file} must define a non-empty logoHomeLabel`);
        strict_1.default.ok(app && app[1].trim().length > 0, `${file} must define a non-empty logoAppLabel`);
    }
});
