/**
 * Locale links (localized-landing pass, 2026-11-19) — outreach emails
 * land a reader on the site already in their language:
 * https://mechatech.io/shops?lang=es. The link is resolved by the
 * LocaleProvider once on mount, ahead of the saved switcher choice,
 * and then persists like any switcher pick.
 *
 * Pinned rules:
 *   - only the 13 registered codes are honored, spelled exactly as in
 *     the registry — "en-US", "ES", and junk values are ignored;
 *   - precedence: locale link > saved choice > EN default;
 *   - the chooser stays reachable where a shop lands: the language
 *     switcher is mounted in both headers (home + shared).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LOCALES } from "../lib/i18n";
import { parseLangParam, resolveInitialLocale } from "../lib/i18n/localeLink";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("parseLangParam: every registered locale round-trips through the outreach link format", () => {
  for (const meta of LOCALES) {
    assert.equal(parseLangParam(`?lang=${meta.code}`), meta.code, `${meta.code} honored`);
    assert.equal(
      parseLangParam(`?utm_source=email&lang=${meta.code}`),
      meta.code,
      `${meta.code} honored alongside tracking params`,
    );
  }
});

test("parseLangParam: unregistered, misspelled, and absent values are ignored", () => {
  assert.equal(parseLangParam("?lang=xx"), null);
  assert.equal(parseLangParam("?lang=ES"), null, "codes are case-sensitive registry spellings");
  assert.equal(parseLangParam("?lang=en-US"), null, "region tags are not registry codes");
  assert.equal(parseLangParam("?lang="), null);
  assert.equal(parseLangParam(""), null);
  assert.equal(parseLangParam("?utm_source=email"), null);
  assert.equal(parseLangParam("lang=fr"), "fr", "a bare query string parses too");
});

test("resolveInitialLocale: link beats saved, saved beats default, junk saved is ignored", () => {
  assert.equal(resolveInitialLocale("es", "fr"), "es");
  assert.equal(resolveInitialLocale("pt", null), "pt");
  assert.equal(resolveInitialLocale(null, "fr"), "fr");
  assert.equal(resolveInitialLocale(null, null), "en");
  assert.equal(resolveInitialLocale(null, undefined), "en");
  assert.equal(resolveInitialLocale(null, "xx"), "en");
  assert.equal(resolveInitialLocale(null, ""), "en");
});

test("wiring: the provider resolves the link on mount; both headers carry the switcher", () => {
  const provider = read("lib/i18n/LocaleProvider.tsx");
  assert.ok(provider.includes("parseLangParam(window.location.search)"), "provider reads ?lang=");
  assert.ok(provider.includes("resolveInitialLocale(link, saved)"), "provider applies the precedence");
  assert.ok(read("components/Header.tsx").includes("<LanguageSwitcher />"), "shared header (pricing, shops) carries the chooser");
  assert.ok(read("components/HomeHeader.tsx").includes("<LanguageSwitcher />"), "home header carries the chooser");
});
