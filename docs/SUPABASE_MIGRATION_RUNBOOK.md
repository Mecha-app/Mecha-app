# SUPABASE MIGRATION RUNBOOK — staged, NOT live

**Owner decision:** 2026-11-14 — Frantz: switch MECHA's database to Supabase
(plan of record: `files/TOOL_STACK_INTEGRATION_2026-11-14.md`, P4).
**Branch:** `supabase-migration-staging`, based on `rebuild-preview`
@ `1bcf180c0226cb7661f13b2f891057f0b52c3ba3`.
**Status:** STAGED ONLY. Production stays on Neon. Nothing in this runbook is
executed until the cutover gate at the bottom is cleared by Frantz's explicit
go. No deploys, no production env changes, no `main` changes.

**UPDATE 2026-11-14 (finish-everything run):** the Supabase project now
EXISTS — org **MECHA** (Free), project **mecha-production**, ref
**qwgxtzjahayusqcsyplw**, URL https://qwgxtzjahayusqcsyplw.supabase.co,
region us-east-1, status Healthy (dashboard-verified 2026-11-14 14:44 ET;
created via GitHub sign-in as Mecha-app). Migration `0014_better_auth.sql`
is pushed to this branch (sequence 0001→0014 complete in git), and the §4
`db.ts` driver swap is DONE. What remains: the data transfer itself (§5A —
browser lane, because it needs the vault-held DB password + the Neon
connection string), the §6 parity pass on a Preview deployment, and the
owner's cutover go (§7).

---

## 1. Audit — how the app wires its database today (verified 2026-11-14)

Everything is Postgres behind ONE env variable, `DATABASE_URL`. There is no
hard-coded host anywhere in `lib/`, `app/`, or `db/`.

| Module | Driver | Reads | Notes |
|---|---|---|---|
| `lib/server/store.ts` (`PgIdentityStore`) | `pg` Pool | `DATABASE_URL` | `getPool()` → `new Pool({ connectionString: process.env.DATABASE_URL })`. Standard Postgres wire protocol — works against Supabase unchanged. |
| `lib/server/appStore.ts` (`PgAppStore`) | `pg` Pool | `DATABASE_URL` | Same pattern, own cached pool. Works against Supabase unchanged. |
| `lib/server/betterAuth.ts` (staged tree; migration `0014_better_auth.sql`) | `pg` Pool | `DATABASE_URL` + `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Better Auth's user model IS the app `users` table; its own tables are `ba_account` / `ba_session` / `ba_verification`. Works against Supabase Postgres unchanged — see §2. |
| `lib/server/db.ts` (waitlist only) | `pg` Pool | `DATABASE_URL` | ✅ **Swapped 2026-11-14** (was `@neondatabase/serverless` — Neon's HTTP driver, which cannot connect to Supabase). `getSql()` still returns a tagged-template function, now translated to parameterized pg queries; `@neondatabase/serverless` removed from package.json. See §4. |

Schema / migrations: `db/migrations/0001_foundation.sql` …
`0014_better_auth.sql` — the full sequence 0001→0014 is on this branch
(0014 arrived with the Better Auth package, pushed 2026-11-14).

Other env vars (verified by sweep of `lib/`, `app/`, `db/`): `JWT_SECRET`,
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY` /
`STRIPE_WEBHOOK_SECRET` / price ids, `SMTP_*`, `MAIL_FROM`, `CLIENT_URL`,
`ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, AI model overrides. None of these
change in this migration.

**Conclusion:** the connection string is already fully env-driven in every
module. The one code change the audit found — the `db.ts` driver swap — is
done (§4); nothing else in the codebase needs to change for the move.

## 2. Auth decision (per plan P4)

**Better Auth stays.** It keeps running against the Supabase Postgres
connection through its existing `pg` Pool — least rework, zero auth behavior
change, existing password hashes (bcryptjs) and the Google linking policy are
untouched. Supabase Auth is NOT adopted in this migration; it is re-evaluated
only after parity is proven. Supabase Storage + pgvector arrive with the
platform for the later health-vault / document-search work; they are not
wired in this migration.

## 3. Prerequisites (before any step below)

- [x] Supabase project created under the Mecha-app identity (GitHub login) —
      2026-11-14: org MECHA, project mecha-production, ref
      qwgxtzjahayusqcsyplw, us-east-1, Healthy. `.env.supabase.example`
      carries the real (non-secret) project URL/ref.
- [ ] Anon key, service role key, and DB password: they stay in the Secure
      Vault / Supabase dashboard by design (never in git, never recorded in
      workspace files). They are needed at exactly two moments: the data
      transfer (§5A, DB password) and the cutover env wiring (§7, all three
      + the DATABASE_URL string).
- [x] `0014_better_auth.sql` pushed to this branch (migration sequence
      complete in git: 0001→0014).
- [ ] A Preview deployment available for the parity pass (§6) — production is
      not touched during verification.

## 4. The one code change — ✅ DONE 2026-11-14 (finish-everything run)

`lib/server/db.ts` now runs on the standard `pg` Pool (same pattern as the
other stores). The exported interface is unchanged — `getSql()` still
returns a tagged-template function, implemented by translating the
template into a parameterized query (`buildParameterizedQuery`, exported
and unit-tested in `tests/db-pg.test.ts`); the honest
`DatabaseNotConfiguredError` behavior when `DATABASE_URL` is absent is
preserved and pinned by test; `timestamptz` values are normalized to ISO
strings (pg returns Date objects where the Neon driver returned strings).
`@neondatabase/serverless` was removed from `package.json` — a grep
verified `db.ts` was its only importer. Verified with the full suite +
typecheck + production build on the final tree (see STATUS.md for the
run's numbers). One behavior note: the swap is verified by construction
and unit tests here; its first live exercise against a real database is
the §6 parity waitlist check, by design.

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

## 5A. Transfer execution — for the browser lane (no further prep needed)

The transfer itself needs two secrets that never enter git, chat, or this
workspace: the current Neon connection string and the Supabase DB password
(both vault/dashboard-side). That is why this step runs through the browser
lane. Everything else is prepared; execute exactly this:

1. **Get the source string (Neon):** in the Vercel browser session
   (mecha-app-7720 account) open the production project's Settings →
   Environment Variables and copy the current Production `DATABASE_URL`
   value into a local shell variable `NEON_DATABASE_URL`. Do not paste it
   anywhere else.
2. **Get the target password (Supabase):** the DB password the owner set at
   project creation, from the Secure Vault. Compose the target string:
   `postgresql://postgres:<DB_PASSWORD>@db.qwgxtzjahayusqcsyplw.supabase.co:5432/postgres`
   into a shell variable `SUPABASE_DIRECT_URL`.
3. **Dump + restore** with the §5 commands verbatim (`pg_dump` from
   `$NEON_DATABASE_URL` with `--no-owner --no-privileges`; `psql
   --single-transaction` into `$SUPABASE_DIRECT_URL`). Requires
   pg_dump/psql v15+ on the executing machine.
4. **0014:** production Neon does not have the Better Auth tables yet (0014
   was never applied there), so after the restore apply
   `db/migrations/0014_better_auth.sql` to Supabase ( §5 step 4). The §6
   row-count parity for `ba_*` tables then reads "present on Supabase,
   absent on Neon — expected."
5. **Record the outcome** (which path was used, dump size, restore result)
   in STATUS.md, then run the §6 parity pass on a Preview deployment.

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
