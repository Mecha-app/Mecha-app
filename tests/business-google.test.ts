/**
 * Item 10 tests (2026-11-20) — SHOP SIGN-IN, the returning-shop fix.
 *
 * The owner's live test: he registered a shop, logged out, and could
 * not get back in — /business/login was linked from nowhere but the
 * register page's footer, it had no Google door, and the driver
 * Google flow would have resolved a shop's email into a brand-new
 * DRIVER account. These tests pin the fix at the service level:
 *
 *   - a Google email matching a shop resolves to the SHOP (token
 *     type "shop", the business dashboard's session), and a towing
 *     email to the towing company;
 *   - an unknown or unverified email is refused with
 *     BusinessGoogleNoAccountError — and creates NOTHING, in any
 *     store (the resolver never even receives the identity store);
 *   - the callback core checks state first, like the driver flow;
 *   - the password door is untouched: register → login still works;
 *   - source contracts: the sign-in doors exist where a returning
 *     shop looks for them (/shops hero, /login, the business login's
 *     Google button), and the logged-out Messages bounce carries
 *     the return-to.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.MECHA_BCRYPT_COST = "4";
process.env.JWT_SECRET = "followup-test-secret";
process.env.CLIENT_URL = "https://mechatech.test";

import { MemoryAppStore } from "../lib/server/appStore";
import {
  BusinessGoogleNoAccountError,
  completeBusinessGoogleSignIn,
  loginBusiness,
  registerBusiness,
  resolveBusinessGoogleSignIn,
} from "../lib/server/businessService";
import { GoogleStateMismatchError } from "../lib/server/authService";
import {
  StubGoogleVerifier,
  businessGoogleRedirectUri,
  buildBusinessGoogleAuthorizeUrl,
  type GoogleIdTokenClaims,
} from "../lib/server/googleAuth";
import { verifyToken } from "../lib/server/jwt";
import { MemoryIdentityStore } from "../lib/server/store";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const SHOP = {
  shopName: "Fair Fix Auto",
  email: "owner@fairfix.example",
  password: "correct horse battery",
  phone: "617-555-0142",
  zip: "02101",
};
const TOWING = {
  companyName: "Fair Tow Co",
  email: "dispatch@fairtow.example",
  password: "correct horse battery",
  phone: "617-555-0143",
  zip: "02101",
};

function claims(email: string, overrides: Partial<GoogleIdTokenClaims> = {}): GoogleIdTokenClaims {
  return { sub: "google-sub-1", email, emailVerified: true, name: "Olivia Owner", ...overrides };
}

test("google: a shop email resolves to the SHOP — token type shop, same account", async () => {
  const store = new MemoryAppStore();
  const registered = await registerBusiness(store, "shop", { ...SHOP });
  const result = await resolveBusinessGoogleSignIn(store, claims(SHOP.email));
  assert.equal(result.business.type, "shop");
  assert.equal(result.business.id, registered.business.id);
  assert.equal(result.business.email, SHOP.email);
  const payload = verifyToken(result.token);
  assert.ok(payload);
  assert.equal(payload.type, "shop");
  assert.equal(payload.id, registered.business.id);
});

test("google: a towing email resolves to the TOWING company", async () => {
  const store = new MemoryAppStore();
  const registered = await registerBusiness(store, "towing", { ...TOWING });
  const result = await resolveBusinessGoogleSignIn(store, claims(TOWING.email));
  assert.equal(result.business.type, "towing");
  assert.equal(result.business.id, registered.business.id);
  assert.equal(verifyToken(result.token)?.type, "towing");
});

test("google: an unknown email is refused and creates NOTHING anywhere", async () => {
  const store = new MemoryAppStore();
  const users = new MemoryIdentityStore();
  await registerBusiness(store, "shop", { ...SHOP });
  await assert.rejects(
    resolveBusinessGoogleSignIn(store, claims("stranger@example.com")),
    BusinessGoogleNoAccountError,
  );
  // No second shop appeared, and no driver account exists — the
  // resolver cannot create one (it never sees the identity store;
  // the empty store here is the witness).
  assert.equal(await store.findShopByEmail("stranger@example.com"), null);
  assert.equal(await users.findUserByEmail("stranger@example.com"), null);
});

test("google: an UNVERIFIED email never links to a business", async () => {
  const store = new MemoryAppStore();
  await registerBusiness(store, "shop", { ...SHOP });
  await assert.rejects(
    resolveBusinessGoogleSignIn(store, claims(SHOP.email, { emailVerified: false })),
    BusinessGoogleNoAccountError,
  );
});

test("google callback core: state mismatch stops everything (no exchange)", async () => {
  const store = new MemoryAppStore();
  await registerBusiness(store, "shop", { ...SHOP });
  let exchanged = false;
  await assert.rejects(
    completeBusinessGoogleSignIn(
      store,
      { code: "code-1", state: "state-a", expectedState: "state-b" },
      {
        verifier: new StubGoogleVerifier(claims(SHOP.email)),
        exchangeCode: async () => {
          exchanged = true;
          return "id-token";
        },
      },
    ),
    GoogleStateMismatchError,
  );
  assert.equal(exchanged, false);
});

test("google callback core: happy path lands the business session", async () => {
  const store = new MemoryAppStore();
  const registered = await registerBusiness(store, "shop", { ...SHOP });
  const result = await completeBusinessGoogleSignIn(
    store,
    { code: "code-1", state: "state-a", expectedState: "state-a" },
    {
      verifier: new StubGoogleVerifier(claims(SHOP.email)),
      exchangeCode: async () => "id-token",
    },
  );
  assert.equal(result.business.id, registered.business.id);
  assert.equal(verifyToken(result.token)?.type, "shop");
});

test("google: the business authorize URL carries the BUSINESS redirect URI", () => {
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
  try {
    assert.equal(
      businessGoogleRedirectUri(),
      "https://mechatech.test/api/business/google/callback",
    );
    const url = new URL(buildBusinessGoogleAuthorizeUrl("state-x"));
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "https://mechatech.test/api/business/google/callback",
    );
  } finally {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  }
});

test("password door unchanged: register → login with the same credentials", async () => {
  const store = new MemoryAppStore();
  const registered = await registerBusiness(store, "shop", { ...SHOP });
  const login = await loginBusiness(store, "shop", {
    email: SHOP.email,
    password: SHOP.password,
  });
  assert.equal(login.business.id, registered.business.id);
  assert.equal(verifyToken(login.token)?.type, "shop");
});

test("doors: a returning shop can FIND sign-in from /shops, /login, and the business login itself", () => {
  const marketing = read("components/MarketingRoutes.tsx");
  assert.ok(marketing.includes('href="/business/login"'), "shops hero links the business login");
  assert.ok(marketing.includes("signInCta"), "shops hero uses the sign-in label");

  const driverLogin = read("app/login/page.tsx");
  assert.ok(driverLogin.includes('href="/business/login"'), "driver login cross-links the business login");

  const businessLogin = read("app/business/login/page.tsx");
  assert.ok(
    businessLogin.includes('href="/api/business/google/start"'),
    "business login carries the Google door",
  );
  assert.ok(businessLogin.includes("googleNoAccount"), "business login explains the no-account case");
  assert.ok(businessLogin.includes("RETURN_TO_KEY"), "business login honors the return-to");

  const complete = read("app/business/google/complete/page.tsx");
  assert.ok(complete.includes("saveSession"), "business google completion stores the session");
  assert.ok(complete.includes("RETURN_TO_KEY"), "business google completion honors the return-to");

  const callback = read("app/api/business/google/callback/route.ts");
  assert.ok(callback.includes("completeBusinessGoogleSignIn"), "callback resolves through the service");
  assert.ok(callback.includes("google_no_account"), "callback flags the no-account case distinctly");
});

test("return-to: the logged-out Messages bounce saves where the visitor was going", () => {
  const messages = read("app/app/messages/page.tsx");
  assert.ok(messages.includes("RETURN_TO_KEY"), "messages page imports the return-to key");
  assert.ok(
    messages.includes("window.location.pathname + window.location.search"),
    "messages page saves its own path (thread included) before bouncing",
  );
});
