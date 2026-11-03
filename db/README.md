# db/ — Neon Postgres schema (WP3, repo-grounded 2026-11-03)

SQL migrations for the Render→Neon conversion, written to Migration Plan
V2 §2 — and **grounded in the real repo code** (`~/workspace/mechaapp/repo/`,
Mecha-app/Mecha-app @ 0747d8a). Where the plan/audit and the code disagreed,
the code won; every material difference is logged in `~/workspace/mechaapp/
STATUS.md` ("Repo-grounded reconciliation"). **Nothing here has been
applied anywhere** — no Neon account exists yet for MECHA. At Migration V2
Phase B the Neon project is created via *Sign in with Google* as
app.mechaai@gmail.com (charter rule — no Neon password), and these files
are applied in filename order through the Neon Console SQL Editor (the
sandbox-safe path used on the Nuvador build).

## Mapping rules (V2 §2, as reconciled with the code)

- Every converted table: `id uuid` PK + `legacy_id text UNIQUE` (the Mongo
  ObjectId string — permanent traceability and the ETL join key; the ETL
  upserts on `legacy_id` and emits a `conversion_map` build artifact).
- Real child collections → tables with FKs; Mongo arrays of strings →
  JSONB; money → `numeric(10,2)`; Mongo dates → `timestamptz`; anything
  unconvertible goes to the ETL quarantine report — no silent drops.
- bcrypt hashes carry as-is (repo: bcryptjs, cost 12 — confirmed in code,
  V2 §3 item 5 closed); Google-linked accounts carry `google_sub`.
- Denormalized back-reference arrays (`users.vehicles`,
  `vehicles.diagnoses`) are NOT columns — the child FK is the single
  source of truth.
- Runtime fields the legacy routes use but the Mongoose schemas omit
  (users.plan, stripeCustomerId, diagnosisCount, diagnosisResetDate,
  isVerified) ARE columns here — under Mongoose strict mode those writes
  were stripped, so the ETL defaults them (plan 'free', count 0, NULLs).

## Files

| File | Contents |
| --- | --- |
| `0001_foundation.sql` | pgcrypto, `plan_tier` + `reminder_status` enums, `set_updated_at()`, `haversine_km()` (repo search radius is in MILES — convert at the query layer) |
| `0002_users_waitlist.sql` | `users` (repo User model + its runtime fields; NO subscription columns — the repo stores none) · `waitlist_signups` (NEW — legacy captured nothing: the landing-page form was a client-side fake) |
| `0003_vehicles.sql` | `vehicles` (year is TEXT in the repo; no trim/VIN/photo exist) |
| `0004_diagnostics.sql` | `diagnostics` (vehicle REQUIRED; `ai_result` JSONB = the repo /ai response shape, stored whole) |
| `0005_shops_towing.sql` | `shops` (GeoJSON Point → lat/lng, [0,0] → NULL; hours is free text; specialties/languages JSONB; rating/review_count plain counters — NO reviews table, the repo has none) · `towing_companies` (point + serviceRadius miles; plan string) |
| `0006_marketplace_messaging.sql` | `listings` (standalone vehicle ads — NOT linked to vehicles; full repo field set; no zip) · `listing_messages` (repo ChatMessage) · `shop_messages` (repo Message) — two flat tables, no conversation entity |
| `0007_new_feature_tables.sql` | `service_records`, `maintenance_reminders` — WP5-NEW blueprint features with NO legacy source; start empty at cutover |
| `0008_wp5_identity_quota.sql` | **WP5 (owner's hard rules):** `users.phone_normalized` + unique partial index (second identity key), `users.free_diagnoses_used` (the LIFETIME free-quota counter — supersedes the legacy monthly `diagnosis_count` semantics; those columns remain for ETL parity, unread by WP5 code), `diagnosis_cache` (exact-match answer cache), `shops.plan` + `shops.stripe_customer_id` and `towing_companies.stripe_customer_id` (the webhook fix — the one deliberate exception to 0005's "shops carry no Stripe fields", ordered by the owner for WP5) |

## Deliberately absent (repo truth — do not re-add without new data)

- No `subscriptions` table — the Stripe webhook writes only `users.plan`
  + `users.stripe_customer_id` (routes/payments.js).
- No AI chat-history tables — "chat" in the repo is marketplace/shop
  messaging (0006).
- No answer-cache columns on diagnostics — legacy diagnoses carry no
  fault codes to key a cache on.
- No `users.role` — admin is an `x-admin-key` header check
  (routes/admin.js), not a user attribute.
- No shop Stripe columns — shops have none in the repo.

## Not yet validated

No local Postgres exists on this VM; all 7 files parse clean against the
PostgreSQL grammar (libpg_query). The live apply test happens on the Neon
branch at plan Phase B/D — by design, so any failure surfaces there, not
in production.
