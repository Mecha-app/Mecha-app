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

export interface UserRecord {
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
  freeDiagnosesUsed: number;
  createdAt: string;
}

export interface ShopRecord {
  id: string;
  shopName: string;
  email: string;
  plan: string;
  stripeCustomerId: string | null;
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
  plan: string;
  stripeCustomerId?: string | null;
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
  /** Stripe webhook sink — drivers, shops AND towing (legacy bug fix). */
  applyPlanUpdate(update: PlanUpdate): Promise<boolean>;
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
  free_diagnoses_used: number;
  created_at: Date | string;
}

const USER_COLUMNS =
  "id, name, email, phone, phone_normalized, password_hash, google_sub, auth_method, plan, stripe_customer_id, free_diagnoses_used, created_at";

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
    freeDiagnosesUsed: row.free_diagnoses_used,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
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
    const { rows } = await getPool().query<{
      id: string;
      shop_name: string;
      email: string;
      plan: string;
      stripe_customer_id: string | null;
    }>("SELECT id, shop_name, email, plan, stripe_customer_id FROM shops WHERE id = $1 LIMIT 1", [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return { id: r.id, shopName: r.shop_name, email: r.email, plan: r.plan, stripeCustomerId: r.stripe_customer_id };
  }

  async applyPlanUpdate(update: PlanUpdate): Promise<boolean> {
    const pool = getPool();
    if (update.accountType === "driver") {
      const plan = update.plan === "pro" ? "pro" : "free";
      const { rowCount } = await pool.query(
        "UPDATE users SET plan = $2, stripe_customer_id = COALESCE($3, stripe_customer_id) WHERE id = $1",
        [update.accountId, plan, update.stripeCustomerId ?? null],
      );
      return (rowCount ?? 0) > 0;
    }
    if (update.accountType === "shop") {
      const { rowCount } = await pool.query(
        "UPDATE shops SET plan = $2, stripe_customer_id = COALESCE($3, stripe_customer_id) WHERE id = $1",
        [update.accountId, update.plan, update.stripeCustomerId ?? null],
      );
      return (rowCount ?? 0) > 0;
    }
    const { rowCount } = await pool.query(
      "UPDATE towing_companies SET plan = $2, stripe_customer_id = COALESCE($3, stripe_customer_id) WHERE id = $1",
      [update.accountId, update.plan, update.stripeCustomerId ?? null],
    );
    return (rowCount ?? 0) > 0;
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
  readonly towing = new Map<string, { id: string; plan: string; stripeCustomerId: string | null }>();
  readonly cache = new Map<string, CachedDiagnosis>();
  readonly diagnoses: Array<{ id: string } & Record<string, unknown>> = [];
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
      freeDiagnosesUsed: 0,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
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

  async applyPlanUpdate(update: PlanUpdate): Promise<boolean> {
    if (update.accountType === "driver") {
      const user = this.users.get(update.accountId);
      if (!user) return false;
      user.plan = update.plan === "pro" ? "pro" : "free";
      if (update.stripeCustomerId) user.stripeCustomerId = update.stripeCustomerId;
      return true;
    }
    if (update.accountType === "shop") {
      const shop = this.shops.get(update.accountId);
      if (!shop) return false;
      shop.plan = update.plan;
      if (update.stripeCustomerId) shop.stripeCustomerId = update.stripeCustomerId;
      return true;
    }
    const tow = this.towing.get(update.accountId);
    if (!tow) return false;
    tow.plan = update.plan;
    if (update.stripeCustomerId) tow.stripeCustomerId = update.stripeCustomerId;
    return true;
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
