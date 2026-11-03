import { Pool } from "pg";
import { DatabaseNotConfiguredError, isDatabaseConfigured } from "./db";
import { FREE_DIAGNOSIS_LIMIT, type PlanTier } from "./quota";
import type { AccountType } from "./jwt";

/**
 * Identity + quota persistence (WP5).
 *
 * One interface, two implementations:
 *   - PgIdentityStore — production. Standard `pg` Pool over DATABASE_URL
 *     (Neon's pooled endpoint). Works with any Postgres URL.
 *   - MemoryIdentityStore — the automated tests, with semantics kept
 *     deliberately identical (including the atomic consume).
 *
 * THE QUOTA CONSUME is the heart of the owner's rules: a single
 * conditional UPDATE … WHERE free_diagnoses_used < LIMIT … RETURNING.
 * Postgres executes it atomically — two concurrent requests can never
 * both take the last free slot, and when it matches no row the identity
 * is exhausted and the AI provider is never called.
 */

/**
 * Subscription display state (migration 0010) — the webhook's cache of
 * what Stripe says about the account's subscription, so the billing
 * screens can state plan + status + period end in plain words without
 * a live Stripe call. Stripe remains the system of record.
 */
export interface BillingFields {
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  /** ISO timestamp; while active this is the renewal date. */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UserRecord extends BillingFields {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneNormalized: string | null;
  passwordHash: string | null;
  googleSub: string | null;
  authMethod: "email" | "google" | "both";
  plan: PlanTier;
  stripeCustomerId: string | null;
  /** When the account email was verified by code (0011); NULL = not yet. */
  emailVerifiedAt: string | null;
  freeDiagnosesUsed: number;
  createdAt: string;
}

/**
 * One live account code (0011) — email verification or password reset.
 * Only the SHA-256 hash is ever stored; the plaintext exists in the
 * issued email and the user's input, nowhere else.
 */
export type AuthCodePurpose = "verify_email" | "reset_password";

export interface AuthCodeRecord {
  userId: string;
  purpose: AuthCodePurpose;
  codeHash: string;
  attempts: number;
  createdAt: string;
  expiresAt: string;
}

export interface ShopRecord {
  id: string;
  shopName: string;
  email: string;
  plan: string;
  stripeCustomerId: string | null;
  // Optional: records seeded before 0010 (ETL rows, older tests) may
  // not carry the billing fields yet; readers treat absent as empty.
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface TowingRecord {
  id: string;
  companyName: string;
  email: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface CachedDiagnosis {
  report: unknown;
  model: string;
  tier: string;
}

export interface CreateUserInput {
  name: string;
  email: string; // already normalized
  phone?: string | null; // display form
  phoneNormalized?: string | null;
  passwordHash?: string | null;
  googleSub?: string | null;
  authMethod?: "email" | "google" | "both";
}

export type IdentityConflict = "email" | "phone";

export class IdentityConflictError extends Error {
  readonly code = "identity_exists";
  readonly field: IdentityConflict;
  constructor(field: IdentityConflict) {
    super(
      field === "email"
        ? "An account already exists for this email — sign in instead. Your account and its diagnosis history are unchanged."
        : "An account already exists for this phone number — sign in instead. Your account and its diagnosis history are unchanged.",
    );
    this.name = "IdentityConflictError";
    this.field = field;
  }
}

export interface PlanUpdate {
  accountType: AccountType;
  accountId: string;
  /** null = leave the plan unchanged (status-only subscription events). */
  plan: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface IdentityStore {
  findUserByEmail(emailNormalized: string): Promise<UserRecord | null>;
  findUserByPhone(phoneNormalized: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  /**
   * Atomically consume one free diagnosis. Returns the post-consume
   * used-count; `consumed: false` means the identity is at the limit
   * and NOTHING was taken (the caller must not call the AI provider).
   */
  consumeFreeDiagnosis(userId: string): Promise<{ consumed: boolean; used: number }>;
  getCachedDiagnosis(cacheKey: string): Promise<CachedDiagnosis | null>;
  putCachedDiagnosis(cacheKey: string, entry: CachedDiagnosis): Promise<void>;
  saveDiagnosisRecord(input: {
    userId: string;
    vehicleId: string;
    problemText?: string;
    imageUrl?: string;
    aiResult: unknown;
  }): Promise<{ id: string }>;
  findShopById(id: string): Promise<ShopRecord | null>;
  findTowingById(id: string): Promise<TowingRecord | null>;
  /**
   * Resolve whoever owns a Stripe customer id — the subscription
   * lifecycle events carry ONLY the customer, no account metadata, so
   * the webhook finds its account this way.
   */
  findAccountByStripeCustomerId(
    customerId: string,
  ): Promise<{ accountType: AccountType; accountId: string } | null>;
  /** Stripe webhook sink — drivers, shops AND towing (legacy bug fix). */
  applyPlanUpdate(update: PlanUpdate): Promise<boolean>;
  // Account codes (0011) — one live code per (user, purpose); saving a
  // fresh code replaces the old one and resets its attempt count.
  saveAuthCode(input: {
    userId: string;
    purpose: AuthCodePurpose;
    codeHash: string;
    expiresAt: string;
  }): Promise<void>;
  getAuthCode(userId: string, purpose: AuthCodePurpose): Promise<AuthCodeRecord | null>;
  /** Increment the attempt count; returns the new count (0 = no live code). */
  recordAuthCodeAttempt(userId: string, purpose: AuthCodePurpose): Promise<number>;
  deleteAuthCode(userId: string, purpose: AuthCodePurpose): Promise<void>;
  /** Stamp email_verified_at (+ the legacy is_verified flag, ETL parity). */
  markEmailVerified(userId: string): Promise<void>;
  /** Replace the password hash (password reset). False = no such user. */
  updatePasswordHash(userId: string, passwordHash: string): Promise<boolean>;
  // Google sign-in (social login package) — drivers only.
  findUserByGoogleSub(googleSub: string): Promise<UserRecord | null>;
  /**
   * Link a Google identity to an existing account: sets google_sub,
   * lifts auth_method to "both" when the account has a password
   * ("google" when it doesn't), and stamps email_verified_at when it
   * is still null (the link only ever happens on Google's verified
   * email, so the stamp is earned). Null = no such user.
   */
  linkGoogleAccount(userId: string, googleSub: string): Promise<UserRecord | null>;
  /** Set/replace the account's phone (profile completion). Null = no such user. */
  updateUserPhone(
    userId: string,
    phone: string,
    phoneNormalized: string,
  ): Promise<UserRecord | null>;
}

// ---------------------------------------------------------------------------
// Postgres implementation
// ---------------------------------------------------------------------------

let cachedPool: Pool | null = null;

function getPool(): Pool {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  if (!cachedPool) cachedPool = new Pool({ connectionString: process.env.DATABASE_URL });
  return cachedPool;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phone_normalized: string | null;
  password_hash: string | null;
  google_sub: string | null;
  auth_method: "email" | "google" | "both";
  plan: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: Date | string | null;
  cancel_at_period_end: boolean;
  email_verified_at: Date | string | null;
  free_diagnoses_used: number;
  created_at: Date | string;
}

const USER_COLUMNS =
  "id, name, email, phone, phone_normalized, password_hash, google_sub, auth_method, plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end, email_verified_at, free_diagnoses_used, created_at";

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    phoneNormalized: row.phone_normalized,
    passwordHash: row.password_hash,
    googleSub: row.google_sub,
    authMethod: row.auth_method,
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: toIso(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
    emailVerifiedAt: toIso(row.email_verified_at),
    freeDiagnosesUsed: row.free_diagnoses_used,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

interface BillingRow {
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: Date | string | null;
  cancel_at_period_end: boolean;
}

const BILLING_COLUMNS =
  "stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end";

function billingFromRow(row: BillingRow): BillingFields {
  return {
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: toIso(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
  };
}

export class PgIdentityStore implements IdentityStore {
  async findUserByEmail(emailNormalized: string): Promise<UserRecord | null> {
    const { rows } = await getPool().query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = $1 LIMIT 1`,
      [emailNormalized],
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
  }

  async findUserByPhone(phoneNormalized: string): Promise<UserRecord | null> {
    const { rows } = await getPool().query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE phone_normalized = $1 LIMIT 1`,
      [phoneNormalized],
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const { rows } = await getPool().query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    // Identity pre-checks give a precise conflict field; the unique
    // indexes (lower(email), phone_normalized) are the backstop against
    // a race between the check and the insert.
    if (await this.findUserByEmail(input.email)) throw new IdentityConflictError("email");
    if (input.phoneNormalized && (await this.findUserByPhone(input.phoneNormalized))) {
      throw new IdentityConflictError("phone");
    }
    try {
      const { rows } = await getPool().query<UserRow>(
        `INSERT INTO users (name, email, phone, phone_normalized, password_hash, google_sub, auth_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${USER_COLUMNS}`,
        [
          input.name,
          input.email,
          input.phone ?? null,
          input.phoneNormalized ?? null,
          input.passwordHash ?? null,
          input.googleSub ?? null,
          input.authMethod ?? "email",
        ],
      );
      return toUserRecord(rows[0]);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "23505") {
        // Unique violation — attribute it by re-checking both keys.
        if (input.phoneNormalized && (await this.findUserByPhone(input.phoneNormalized))) {
          throw new IdentityConflictError("phone");
        }
        throw new IdentityConflictError("email");
      }
      throw err;
    }
  }

  async consumeFreeDiagnosis(userId: string): Promise<{ consumed: boolean; used: number }> {
    const pool = getPool();
    // ONE atomic statement: the increment happens only below the limit.
    const updated = await pool.query<{ free_diagnoses_used: number }>(
      `UPDATE users
          SET free_diagnoses_used = free_diagnoses_used + 1
        WHERE id = $1 AND free_diagnoses_used < $2
        RETURNING free_diagnoses_used`,
      [userId, FREE_DIAGNOSIS_LIMIT],
    );
    if (updated.rows.length > 0) {
      return { consumed: true, used: updated.rows[0].free_diagnoses_used };
    }
    const { rows } = await pool.query<{ free_diagnoses_used: number }>(
      "SELECT free_diagnoses_used FROM users WHERE id = $1",
      [userId],
    );
    return { consumed: false, used: rows[0]?.free_diagnoses_used ?? FREE_DIAGNOSIS_LIMIT };
  }

  async getCachedDiagnosis(cacheKey: string): Promise<CachedDiagnosis | null> {
    const { rows } = await getPool().query<{ report: unknown; model: string; tier: string }>(
      "SELECT report, model, tier FROM diagnosis_cache WHERE cache_key = $1 LIMIT 1",
      [cacheKey],
    );
    if (rows.length === 0) return null;
    await getPool().query(
      "UPDATE diagnosis_cache SET hit_count = hit_count + 1, last_hit_at = now() WHERE cache_key = $1",
      [cacheKey],
    );
    return rows[0];
  }

  async putCachedDiagnosis(cacheKey: string, entry: CachedDiagnosis): Promise<void> {
    await getPool().query(
      `INSERT INTO diagnosis_cache (cache_key, report, model, tier)
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT (cache_key) DO NOTHING`,
      [cacheKey, JSON.stringify(entry.report), entry.model, entry.tier],
    );
  }

  async saveDiagnosisRecord(input: {
    userId: string;
    vehicleId: string;
    problemText?: string;
    imageUrl?: string;
    aiResult: unknown;
  }): Promise<{ id: string }> {
    const { rows } = await getPool().query<{ id: string }>(
      `INSERT INTO diagnostics (user_id, vehicle_id, problem_text, image_url, ai_result)
       VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING id`,
      [
        input.userId,
        input.vehicleId,
        input.problemText ?? null,
        input.imageUrl ?? null,
        JSON.stringify(input.aiResult),
      ],
    );
    return { id: rows[0].id };
  }

  async findShopById(id: string): Promise<ShopRecord | null> {
    const { rows } = await getPool().query<
      {
        id: string;
        shop_name: string;
        email: string;
        plan: string;
        stripe_customer_id: string | null;
      } & BillingRow
    >(
      `SELECT id, shop_name, email, plan, stripe_customer_id, ${BILLING_COLUMNS} FROM shops WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      shopName: r.shop_name,
      email: r.email,
      plan: r.plan,
      stripeCustomerId: r.stripe_customer_id,
      ...billingFromRow(r),
    };
  }

  async findTowingById(id: string): Promise<TowingRecord | null> {
    const { rows } = await getPool().query<
      {
        id: string;
        company_name: string;
        email: string;
        plan: string;
        stripe_customer_id: string | null;
      } & BillingRow
    >(
      `SELECT id, company_name, email, plan, stripe_customer_id, ${BILLING_COLUMNS} FROM towing_companies WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      companyName: r.company_name,
      email: r.email,
      plan: r.plan,
      stripeCustomerId: r.stripe_customer_id,
      ...billingFromRow(r),
    };
  }

  async findAccountByStripeCustomerId(
    customerId: string,
  ): Promise<{ accountType: AccountType; accountId: string } | null> {
    const pool = getPool();
    const tables: Array<[AccountType, string]> = [
      ["driver", "users"],
      ["shop", "shops"],
      ["towing", "towing_companies"],
    ];
    for (const [accountType, table] of tables) {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM ${table} WHERE stripe_customer_id = $1 LIMIT 1`,
        [customerId],
      );
      if (rows.length > 0) return { accountType, accountId: rows[0].id };
    }
    return null;
  }

  async applyPlanUpdate(update: PlanUpdate): Promise<boolean> {
    const pool = getPool();
    const table =
      update.accountType === "driver"
        ? "users"
        : update.accountType === "shop"
          ? "shops"
          : "towing_companies";
    // Only the fields the event actually carries are written; a null
    // plan (status-only subscription event) leaves the plan untouched,
    // and a null customer/subscription id never erases the stored one
    // (the semantics the original COALESCE form had).
    const sets: string[] = [];
    const params: unknown[] = [update.accountId];
    const push = (column: string, value: unknown) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };
    if (update.plan !== null && update.plan !== undefined) {
      // Drivers store the plan_tier enum: anything but "pro" is free.
      push("plan", update.accountType === "driver" ? (update.plan === "pro" ? "pro" : "free") : update.plan);
    }
    if (update.stripeCustomerId) push("stripe_customer_id", update.stripeCustomerId);
    if (update.stripeSubscriptionId) push("stripe_subscription_id", update.stripeSubscriptionId);
    if (update.subscriptionStatus !== undefined) push("subscription_status", update.subscriptionStatus);
    if (update.currentPeriodEnd !== undefined) push("current_period_end", update.currentPeriodEnd);
    if (update.cancelAtPeriodEnd !== undefined) push("cancel_at_period_end", update.cancelAtPeriodEnd);
    if (sets.length === 0) return false;
    const { rowCount } = await pool.query(
      `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $1`,
      params,
    );
    return (rowCount ?? 0) > 0;
  }

  async saveAuthCode(input: {
    userId: string;
    purpose: AuthCodePurpose;
    codeHash: string;
    expiresAt: string;
  }): Promise<void> {
    await getPool().query(
      `INSERT INTO auth_codes (user_id, purpose, code_hash, attempts, created_at, expires_at)
       VALUES ($1, $2, $3, 0, now(), $4)
       ON CONFLICT (user_id, purpose) DO UPDATE
         SET code_hash = EXCLUDED.code_hash, attempts = 0,
             created_at = now(), expires_at = EXCLUDED.expires_at`,
      [input.userId, input.purpose, input.codeHash, input.expiresAt],
    );
  }

  async getAuthCode(userId: string, purpose: AuthCodePurpose): Promise<AuthCodeRecord | null> {
    const { rows } = await getPool().query<{
      user_id: string;
      purpose: AuthCodePurpose;
      code_hash: string;
      attempts: number;
      created_at: Date | string;
      expires_at: Date | string;
    }>(
      "SELECT user_id, purpose, code_hash, attempts, created_at, expires_at FROM auth_codes WHERE user_id = $1 AND purpose = $2 LIMIT 1",
      [userId, purpose],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      userId: r.user_id,
      purpose: r.purpose,
      codeHash: r.code_hash,
      attempts: r.attempts,
      createdAt: toIso(r.created_at) as string,
      expiresAt: toIso(r.expires_at) as string,
    };
  }

  async recordAuthCodeAttempt(userId: string, purpose: AuthCodePurpose): Promise<number> {
    const { rows } = await getPool().query<{ attempts: number }>(
      `UPDATE auth_codes SET attempts = attempts + 1
        WHERE user_id = $1 AND purpose = $2 RETURNING attempts`,
      [userId, purpose],
    );
    return rows[0]?.attempts ?? 0;
  }

  async deleteAuthCode(userId: string, purpose: AuthCodePurpose): Promise<void> {
    await getPool().query("DELETE FROM auth_codes WHERE user_id = $1 AND purpose = $2", [
      userId,
      purpose,
    ]);
  }

  async markEmailVerified(userId: string): Promise<void> {
    await getPool().query(
      "UPDATE users SET email_verified_at = now(), is_verified = true WHERE id = $1",
      [userId],
    );
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<boolean> {
    const { rowCount } = await getPool().query(
      "UPDATE users SET password_hash = $2 WHERE id = $1",
      [userId, passwordHash],
    );
    return (rowCount ?? 0) > 0;
  }

  async findUserByGoogleSub(googleSub: string): Promise<UserRecord | null> {
    const { rows } = await getPool().query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE google_sub = $1 LIMIT 1`,
      [googleSub],
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
  }

  async linkGoogleAccount(userId: string, googleSub: string): Promise<UserRecord | null> {
    const { rows } = await getPool().query<UserRow>(
      `UPDATE users
          SET google_sub = $2,
              auth_method = CASE WHEN password_hash IS NULL THEN 'google' ELSE 'both' END,
              email_verified_at = COALESCE(email_verified_at, now()),
              is_verified = true
        WHERE id = $1
        RETURNING ${USER_COLUMNS}`,
      [userId, googleSub],
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
  }

  async updateUserPhone(
    userId: string,
    phone: string,
    phoneNormalized: string,
  ): Promise<UserRecord | null> {
    const { rows } = await getPool().query<UserRow>(
      `UPDATE users SET phone = $2, phone_normalized = $3 WHERE id = $1
        RETURNING ${USER_COLUMNS}`,
      [userId, phone, phoneNormalized],
    );
    return rows[0] ? toUserRecord(rows[0]) : null;
  }
}

// ---------------------------------------------------------------------------
// In-memory implementation (tests) — same semantics, including atomicity:
// the consume below performs its check-and-increment with no awaits in
// between, so it cannot interleave on Node's single thread.
// ---------------------------------------------------------------------------

export class MemoryIdentityStore implements IdentityStore {
  readonly users = new Map<string, UserRecord>();
  readonly shops = new Map<string, ShopRecord & { phone?: string }>();
  readonly towing = new Map<string, TowingRecord>();
  readonly cache = new Map<string, CachedDiagnosis>();
  readonly diagnoses: Array<{ id: string } & Record<string, unknown>> = [];
  readonly authCodes = new Map<string, AuthCodeRecord>();
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-test-${this.seq}`;
  }

  async findUserByEmail(emailNormalized: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) if (u.email === emailNormalized) return u;
    return null;
  }

  async findUserByPhone(phoneNormalized: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) if (u.phoneNormalized === phoneNormalized) return u;
    return null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    if (await this.findUserByEmail(input.email)) throw new IdentityConflictError("email");
    if (input.phoneNormalized && (await this.findUserByPhone(input.phoneNormalized))) {
      throw new IdentityConflictError("phone");
    }
    const user: UserRecord = {
      id: this.nextId("user"),
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      phoneNormalized: input.phoneNormalized ?? null,
      passwordHash: input.passwordHash ?? null,
      googleSub: input.googleSub ?? null,
      authMethod: input.authMethod ?? "email",
      plan: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      emailVerifiedAt: null,
      freeDiagnosesUsed: 0,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  private authCodeKey(userId: string, purpose: AuthCodePurpose): string {
    return `${userId}:${purpose}`;
  }

  async saveAuthCode(input: {
    userId: string;
    purpose: AuthCodePurpose;
    codeHash: string;
    expiresAt: string;
  }): Promise<void> {
    this.authCodes.set(this.authCodeKey(input.userId, input.purpose), {
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      attempts: 0,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    });
  }

  async getAuthCode(userId: string, purpose: AuthCodePurpose): Promise<AuthCodeRecord | null> {
    return this.authCodes.get(this.authCodeKey(userId, purpose)) ?? null;
  }

  async recordAuthCodeAttempt(userId: string, purpose: AuthCodePurpose): Promise<number> {
    const record = this.authCodes.get(this.authCodeKey(userId, purpose));
    if (!record) return 0;
    record.attempts += 1;
    return record.attempts;
  }

  async deleteAuthCode(userId: string, purpose: AuthCodePurpose): Promise<void> {
    this.authCodes.delete(this.authCodeKey(userId, purpose));
  }

  async markEmailVerified(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) user.emailVerifiedAt = new Date().toISOString();
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    user.passwordHash = passwordHash;
    return true;
  }

  async findUserByGoogleSub(googleSub: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) if (u.googleSub === googleSub) return u;
    return null;
  }

  async linkGoogleAccount(userId: string, googleSub: string): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    user.googleSub = googleSub;
    user.authMethod = user.passwordHash === null ? "google" : "both";
    if (user.emailVerifiedAt === null) user.emailVerifiedAt = new Date().toISOString();
    return user;
  }

  async updateUserPhone(
    userId: string,
    phone: string,
    phoneNormalized: string,
  ): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    user.phone = phone;
    user.phoneNormalized = phoneNormalized;
    return user;
  }

  async consumeFreeDiagnosis(userId: string): Promise<{ consumed: boolean; used: number }> {
    const user = this.users.get(userId);
    if (!user) return { consumed: false, used: FREE_DIAGNOSIS_LIMIT };
    if (user.freeDiagnosesUsed >= FREE_DIAGNOSIS_LIMIT) {
      return { consumed: false, used: user.freeDiagnosesUsed };
    }
    user.freeDiagnosesUsed += 1;
    return { consumed: true, used: user.freeDiagnosesUsed };
  }

  async getCachedDiagnosis(cacheKey: string): Promise<CachedDiagnosis | null> {
    return this.cache.get(cacheKey) ?? null;
  }

  async putCachedDiagnosis(cacheKey: string, entry: CachedDiagnosis): Promise<void> {
    if (!this.cache.has(cacheKey)) this.cache.set(cacheKey, entry);
  }

  async saveDiagnosisRecord(input: {
    userId: string;
    vehicleId: string;
    problemText?: string;
    imageUrl?: string;
    aiResult: unknown;
  }): Promise<{ id: string }> {
    const row = { id: this.nextId("diagnosis"), ...input };
    this.diagnoses.push(row);
    return { id: row.id };
  }

  async findShopById(id: string): Promise<ShopRecord | null> {
    return this.shops.get(id) ?? null;
  }

  async findTowingById(id: string): Promise<TowingRecord | null> {
    return this.towing.get(id) ?? null;
  }

  async findAccountByStripeCustomerId(
    customerId: string,
  ): Promise<{ accountType: AccountType; accountId: string } | null> {
    for (const u of this.users.values()) {
      if (u.stripeCustomerId === customerId) return { accountType: "driver", accountId: u.id };
    }
    for (const s of this.shops.values()) {
      if (s.stripeCustomerId === customerId) return { accountType: "shop", accountId: s.id };
    }
    for (const t of this.towing.values()) {
      if (t.stripeCustomerId === customerId) return { accountType: "towing", accountId: t.id };
    }
    return null;
  }

  async applyPlanUpdate(update: PlanUpdate): Promise<boolean> {
    // Same partial-write semantics as the Pg implementation: only the
    // fields the event carries are applied; a null plan leaves the
    // plan untouched, a null id never erases the stored one.
    const applyTo = (record: {
      plan: string;
      stripeCustomerId: string | null;
      stripeSubscriptionId?: string | null;
      subscriptionStatus?: string | null;
      currentPeriodEnd?: string | null;
      cancelAtPeriodEnd?: boolean;
    }): boolean => {
      if (update.plan !== null && update.plan !== undefined) {
        record.plan =
          update.accountType === "driver" ? (update.plan === "pro" ? "pro" : "free") : update.plan;
      }
      if (update.stripeCustomerId) record.stripeCustomerId = update.stripeCustomerId;
      if (update.stripeSubscriptionId) record.stripeSubscriptionId = update.stripeSubscriptionId;
      if (update.subscriptionStatus !== undefined) record.subscriptionStatus = update.subscriptionStatus;
      if (update.currentPeriodEnd !== undefined) record.currentPeriodEnd = update.currentPeriodEnd;
      if (update.cancelAtPeriodEnd !== undefined) record.cancelAtPeriodEnd = update.cancelAtPeriodEnd;
      return true;
    };
    if (update.accountType === "driver") {
      const user = this.users.get(update.accountId);
      return user ? applyTo(user) : false;
    }
    if (update.accountType === "shop") {
      const shop = this.shops.get(update.accountId);
      return shop ? applyTo(shop) : false;
    }
    const tow = this.towing.get(update.accountId);
    return tow ? applyTo(tow) : false;
  }
}

// ---------------------------------------------------------------------------

let cachedStore: IdentityStore | null = null;

/** Production store — honest DatabaseNotConfiguredError when unwired. */
export function getIdentityStore(): IdentityStore {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  if (!cachedStore) cachedStore = new PgIdentityStore();
  return cachedStore;
}
