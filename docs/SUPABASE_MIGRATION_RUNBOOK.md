# SUPABASE MIGRATION RUNBOOK — staged, NOT live

**Owner decision:** 2026-11-14 — Frantz: switch MECHA's database to Supabase
(plan of record: `files/TOOL_STACK_INTEGRATION_2026-11-14.md`, P4).
**Branch:** `supabase-migration-staging`, based on `rebuild-preview`
@ `1bcf180c0226cb7661f13b2f891057f0b52c3ba3`.
**Status:** STAGED ONLY. Production stays on Neon. Nothing in this runbook is
executed until the cutover gate at the bottom is cleared by Frantz's explicit
go. No deploys, no production env changes, no `main` changes.

---

## 1. Audit — how the app wires its database today (verified 2026-11-14)

Everything is Postgres behind ONE env variable, `DATABASE_URL`. There is no
hard-coded host anywhere in `lib/`, `app/`, or `db/`.

| Module | Driver | Reads | Notes |
|---|---|---|---|
| `lib/server/store.ts` (`PgIdentityStore`) | `pg` Pool | `DATABASE_URL` | `getPool()` → `new Pool({ connectionString: process.env.DATABASE_URL })`. Standard Postgres wire protocol — works against Supabase unchanged. |
| `lib/server/appStore.ts` (`PgAppStore`) | `pg` Pool | `DATABASE_URL` | Same pattern, own cached pool. Works against Supabase unchanged. |
| `lib/server/betterAuth.ts` (staged tree; migration `0014_better_auth.sql`) | `pg` Pool | `DATABASE_URL` + `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Better Auth's user model IS the app `users` table; its own tables are `ba_account` / `ba_session` / `ba_verification`. Works against Supabase Postgres unchanged — see §2. |
| `lib/server/db.ts` (waitlist only) | **`@neondatabase/serverless`** | `DATABASE_URL` | ⚠️ **The one exception.** `getSql()` returns `neon(url)` — Neon's HTTP driver talks to Neon's proxy endpoint and **cannot** connect to a Supabase database. This module needs the single code change in §4 before cutover. |

Schema / migrations: `db/migrations/0001_foundation.sql` …
`0013_code_signin_signup.sql` on this branch; `0014_better_auth.sql` exists in
the staged local tree and **must be pushed to this branch before cutover** so
the full sequence 0001→0014 is in git.

Other env vars (verified by sweep of `lib/`, `app/`, `db/`): `JWT_SECRET`,
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY` /
`STRIPE_WEBHOOK_SECRET` / price ids, `SMTP_*`, `MAIL_FROM`, `CLIENT_URL`,
`ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, AI model overrides. None of these
change in this migration.

**Conclusion:** the connection string is already fully env-driven in every
module. No code change is made on this staging branch; the only code work is
the `db.ts` driver swap in §4, deliberately left for the cutover sitting so it
can be tested against the real Supabase project.

## 2. Auth decision (per plan P4)

**Better Auth stays.** It keeps running against the Supabase Postgres
connection through its existing `pg` Pool — least rework, zero auth behavior
change, existing password hashes (bcryptjs) and the Google linking policy are
untouched. Supabase Auth is NOT adopted in this migration; it is re-evaluated
only after parity is proven. Supabase Storage + pgvector arrive with the
platform for the later health-vault / document-search work; they are not
wired in this migration.

## 3. Prerequisites (before any step below)

- [ ] Supabase project created under the Mecha-app identity (GitHub login) —
      handled by a separate browser task; this branch carries placeholders
      only (`.env.supabase.example`).
- [ ] Project ref, anon key, service role key, and DB password received via
      the Secure Vault and recorded in `hidden_files/` (never in git).
- [ ] `0014_better_auth.sql` pushed to this branch (migration sequence
      complete in git: 0001→0014).
- [ ] A Preview deployment available for the parity pass (§6) — production is
      not touched during verification.

## 4. The one code change (cutover sitting, tested against the real project)

`lib/server/db.ts`: replace the Neon serverless driver with the same `pg`
Pool pattern the other stores use, keeping the module's exported interface
(`getSql` callers / waitlist functions) and its honest
`DatabaseNotConfiguredError` behavior when `DATABASE_URL` is absent. Then
remove `@neondatabase/serverless` from `package.json` if nothing else imports
it (verified at the sitting by grep). Full test suite + typecheck + build
must pass before the branch is promoted.

## 5. Data move — Neon → Supabase (pg_dump / restore)

Use the DIRECT Supabase connection (port 5432) for every step here — never
the transaction pooler (6543), which cannot run DDL/restore reliably.

```bash
# 1. Dump production Neon (schema + data), owner/privilege-neutral so it
#    restores cleanly into Supabase's postgres role:
pg_dump "$NEON_DATABASE_URL" \
  --no-owner --no-privileges \
  --format=plain --file=mecha-neon-dump.sql

# 2. Sanity-check the dump: table list + CREATE EXTENSION lines.
#    The schema relies on pgcrypto (gen_random_uuid) — built into
#    Supabase's Postgres; confirm nothing Neon-specific is referenced.

# 3. Restore into Supabase (direct connection):
psql "postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
  --single-transaction --file=mecha-neon-dump.sql

# 4. If 0014 is not yet in production Neon at dump time, apply it to
#    Supabase after the restore:
psql "$SUPABASE_DIRECT_URL" --file=db/migrations/0014_better_auth.sql
```

Alternative path (only if the dump/restore fails twice): create the schema
fresh by applying `db/migrations/0001`→`0014` in order to Supabase, then copy
data table-by-table. Record which path was used in STATUS.md.

**Neon stays untouched and read-only-referenced during verification** — it is
the rollback target (§7), so nothing is written to it or deleted from it
until Frantz closes the migration.

## 6. Parity checklist (Preview deployment pointed at Supabase)

Point ONLY a Preview deployment's `DATABASE_URL` at the Supabase direct
string. All items must pass before the cutover gate is even requested.

- [ ] **Row counts per table — Neon vs Supabase, exact match:**
      `users`, `waitlist_signups`, `vehicles`, `diagnostics`,
      `diagnosis_cache`, `service_records`, `maintenance_reminders`,
      `shops`, `towing_companies`, `listings`, `listing_messages`,
      `shop_messages`, `auth_codes`, `pending_signup_codes`,
      `ba_account`, `ba_session`, `ba_verification` (BA tables only where
      0014 has been applied on both sides).
- [ ] **Auth login test:** existing test account signs in with email +
      password through BOTH doors (legacy auth and Better Auth
      `/api/auth/session-bridge` payload shape `{token, user, quota}`
      byte-identical); wrong password → generic 401; Google sign-in door
      behaves exactly as on Neon (env-gated state unchanged).
- [ ] **Phone gate:** phone-less account is refused a diagnosis with
      `403 phone_required` BEFORE any quota consume.
- [ ] **Diagnosis smoke test:** signed-in account with phone completes one
      diagnosis end-to-end (provider result persisted in `diagnostics`,
      quota decremented by exactly one) — subject to the provider wiring
      state at the time; if the AI provider is unwired, verify the honest
      not-configured path instead and record it.
- [ ] **Vehicles CRUD cycle:** create → read → update → delete, persisted.
- [ ] **Waitlist signup** (after the §4 `db.ts` swap): one signup lands in
      `waitlist_signups` on Supabase.
- [ ] **Payments status endpoint** returns its honest state (Stripe wiring
      is independent of this migration and must be unchanged).

## 7. Cutover gate + rollback

**GATE: nothing goes live until Frantz's explicit go.** At the sitting, and
only then:

1. Merge/promote this branch per the standing promotion flow (never push to
   `main` directly without the owner's final go).
2. In Vercel (browser only), set Production `DATABASE_URL` to the Supabase
   direct connection string; redeploy.
3. Re-run §6's auth + diagnosis smokes against production.
4. **Rollback (available until Frantz closes the migration):** set
   Production `DATABASE_URL` back to the Neon string and redeploy — Neon was
   never modified, so rollback is a pure env revert. Note any rows written
   to Supabase after cutover would need a reverse copy before rollback;
   keep the window between cutover and verification short for this reason.

## 8. Explicitly NOT in this migration

- No Supabase Auth adoption (Better Auth stays — §2).
- No Storage buckets or pgvector wiring (staged follow-ons).
- No changes to Stripe, SMTP/email, or AI provider wiring.
- No deploys, no production env changes, no `main` changes from this branch.
