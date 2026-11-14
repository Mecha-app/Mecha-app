# Playwright e2e — integration notes for the coordinator

This folder is a staging part, not a runnable suite in place. Promote it
into the repo root (the Next.js 15 app in `finish-build/`) as follows:

```
parts/playwright/playwright.config.ts  ->  <repo root>/playwright.config.ts
parts/playwright/e2e/*.spec.ts         ->  <repo root>/e2e/*.spec.ts
parts/playwright/e2e/helpers.ts        ->  <repo root>/e2e/helpers.ts
```

`playwright.config.ts` sets `testDir: "./e2e"`, so the layout above is
required — do not nest the specs deeper.

## 1. Exact lines to add to package.json

devDependency (version verified live on 2026-11-14 with
`npm view @playwright/test version` → **1.65.1**):

```json
"devDependencies": {
  "@playwright/test": "^1.65.1"
}
```

Script:

```json
"scripts": {
  "test:e2e": "playwright test"
}
```

Equivalent one-liner the coordinator may run instead of editing by hand:

```bash
npm install -D @playwright/test@^1.65.1
npm pkg set scripts.test:e2e="playwright test"
```

## 2. One-time setup

```bash
npx playwright install chromium
```

(Installs the Chromium build the `chromium` / Desktop Chrome project
needs. On a bare Linux CI image also run
`npx playwright install --with-deps chromium` once for system libraries.)

For local runs the config starts the app itself via
`webServer: npm run start`, so build first:

```bash
npm run build
```

## 3. How to run

```bash
# Local: starts `npm run start` on http://localhost:3000 automatically
npm run test:e2e

# Against an already-running deployment (no server is started):
E2E_BASE_URL=https://<deployment-host> npm run test:e2e

# A single spec
npx playwright test e2e/public.spec.ts
```

Retries are 0 and the reporter is `list` by design — a flaky pass must
never hide behind a retry at the promotion gate. Traces are captured
`on-first-retry` (i.e. only if retries are raised manually for a debug
run).

## 4. Environment variables

| Variable       | Required | Meaning |
| -------------- | -------- | ------- |
| `E2E_BASE_URL` | No | Base URL of a running app. When set, `webServer` is disabled. Default when unset: `http://localhost:3000`. |
| `E2E_EMAIL`    | No | Reusable account email for the login paths. When unset, specs register a unique `e2e-<timestamp>@example.com` account per run. |
| `E2E_PASSWORD` | No | Password for `E2E_EMAIL`. When unset, a fixed test-only password is used for freshly registered accounts. |
| `E2E_PHONE`    | No | Phone for phone-complete accounts. Diagnosis requires a phone on file (`phone_required` gate), so set this for a real diagnosis environment; fresh accounts fall back to a 555 test number. |

App-side env the honest states depend on (no spec fakes around these):
no AI key → diagnosis shows the honest `ai_not_configured` state; no
`STRIPE_SECRET_KEY` → checkout shows the honest `stripe_not_configured`
state. Both are passing outcomes by design — see the spec headers.

## 5. Promotion gate

Run the suite **before every promotion** (staging → production, and
before any cutover deploy):

```bash
npm run build && npm run test:e2e
# or, against the promotion candidate:
E2E_BASE_URL=https://<candidate-host> npm run test:e2e
```

**Gate rule: the suite must be fully green or the promotion stops.**
No partial promotion, no "known flaky" waivers — a red spec is either a
real regression, a broken honest state (fake report / fake checkout),
or a selector/copy change that must be fixed in the spec in the same
change. Fix forward, re-run, then promote.

## 6. Known app-behaviour notes baked into the specs (do not "fix" blindly)

Verified against the rebuild source on 2026-11-14; if the app changes,
update the spec and this list together:

1. **Register's default door is email-code.** The password form is
   behind "Sign up with a password instead" — `helpers.registerFresh`
   clicks that toggle. Labels: Name / Email / "Phone (optional)" /
   Password / Confirm password; submit "Create account"; success lands
   on `/app/vault?welcome=1`.
2. **Login's default destination is `/app/diagnose`**, not `/app`.
   Specs assert landing inside `/app/*`, then visit `/app`
   ("Your garage") for the dashboard assertion. `/login` renders two
   Email fields (code door + password form) — helpers scope to the
   form containing the Password field.
3. **Vehicle add requires five fields** — Year, Make, Model, Engine,
   Mileage (server-enforced). The brief's year/make/model alone cannot
   submit.
4. **⚠️ The vault has NO edit UI.** There is no Edit control on
   `/app/vault`; editing exists only as `PATCH /api/vehicles/[id]`.
   `vehicles.spec.ts` edits mileage through that API with the session
   token, then asserts the UI reflects it. When an edit form ships,
   rewrite that step as UI and remove this note.
5. **Checkout does not start on `/pricing`.** The Pro tier's "Go Pro"
   there is a link to `/register`. The real checkout trigger is the
   dashboard Plan & billing button "Upgrade to Pro — $9.99/mo"
   (`POST /api/payments/create-checkout`). `checkout.spec.ts` starts
   at `/pricing` and performs the attempt from `/app`. It never enters
   payment details: on redirect it only asserts a
   `checkout.stripe.com` URL and stops.
6. **Diagnosis not-configured surfacing:** the API's 501 detail
   ("The diagnosis engine is not wired in this environment yet — no AI
   call was made.") is rendered by `/app/diagnose` in a `role="alert"`.
   The spec accepts report (severity + "Fair repair range:") OR that
   alert OR the quota-exhausted state, and asserts no fair-price report
   appears alongside the not-configured alert.
7. **No custom 404 page exists** — the unknown-route spec asserts the
   404 status and Next.js's default not-found wording.
8. **No `data-testid` attributes were invented.** Selectors use roles,
   labels, and verified English copy (ids `reg-*` / `login-*` /
   `veh-*` / `diag-*` exist in source but the specs prefer ARIA
   selectors; the VIN field is located by its verified placeholder
   "Enter VIN number").
9. **Google sign-in is never depended on** — the button renders only
   when configured, and no spec looks for it.
