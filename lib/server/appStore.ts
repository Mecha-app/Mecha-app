import { Pool } from "pg";
import { DatabaseNotConfiguredError, isDatabaseConfigured } from "./db";
import { haversineMiles, type LatLng } from "./geo";

/**
 * Product persistence (WP6) — vehicles/vault, marketplace listings,
 * shop + towing business accounts, nearby search, shop messaging.
 *
 * Same contract shape as WP5's IdentityStore (lib/server/store.ts):
 * one interface, two implementations — PgAppStore for production
 * (standard `pg` Pool over DATABASE_URL) and MemoryAppStore for the
 * automated tests, with semantics kept deliberately identical.
 *
 * OWNERSHIP IS ENFORCED IN THE STORE, not just the routes: every
 * owner-scoped read/update/delete carries the owner id in its WHERE
 * clause, so a caller who skips a check still cannot touch another
 * account's rows. A miss returns null/false — the service layer turns
 * that into a 404, so "not yours" and "doesn't exist" look identical
 * from outside (no enumeration).
 */

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface VehicleRecord {
  id: string;
  ownerId: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  mileage: number | null;
  nickname: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisSummary {
  id: string;
  userId: string;
  vehicleId: string;
  problemText: string | null;
  imageUrl: string | null;
  aiResult: unknown;
  createdAt: string;
}

export type ListingPhotoSlot = "front" | "back" | "right" | "left" | "interior" | "whole";

export interface ListingPhoto {
  url: string;
  slot: ListingPhotoSlot;
}

export type ListingStatus = "active" | "sold" | "removed";

export interface ListingRecord {
  id: string;
  sellerId: string;
  sellerName: string | null;
  sellerEmail: string | null;
  title: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  price: number;
  titleStatus: string;
  condition: string;
  color: string | null;
  transmission: string;
  drivetrain: string;
  engine: string | null;
  description: string;
  knownProblems: string | null;
  phone: string | null;
  city: string;
  state: string;
  zip: string | null;
  images: ListingPhoto[];
  status: ListingStatus;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopProfileRecord {
  id: string;
  shopName: string;
  ownerName: string | null;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string;
  lat: number | null;
  lng: number | null;
  about: string | null;
  specialties: string[];
  languages: string[];
  hours: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  plan: string;
  stripeCustomerId: string | null;
  passwordHash: string | null;
  authMethod: "email" | "google" | "both";
  createdAt: string;
}

export interface TowingProfileRecord {
  id: string;
  companyName: string;
  ownerName: string | null;
  email: string;
  phone: string;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  serviceRadiusMi: number;
  truckCount: number;
  plan: string;
  rating: number;
  isVerified: boolean;
  isActive: boolean;
  stripeCustomerId: string | null;
  passwordHash: string | null;
  authMethod: "email" | "google" | "both";
  createdAt: string;
}

export interface NearbyBusiness {
  id: string;
  kind: "shop" | "towing";
  name: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number;
  lng: number;
  distanceMi: number;
  rating: number;
  reviewCount: number | null;
  specialties: string[];
  hours: string | null;
  serviceRadiusMi: number | null;
  isVerified: boolean;
}

export type MessageSender = "user" | "shop";

export interface MessageRecord {
  id: string;
  userId: string;
  shopId: string;
  senderType: MessageSender;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface ThreadSummary {
  userId: string;
  shopId: string;
  counterpartName: string;
  lastBody: string;
  lastAt: string;
  lastSender: MessageSender;
  unread: number;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface CreateVehicleInput {
  ownerId: string;
  year: string;
  make: string;
  model: string;
  trim?: string | null;
  vin?: string | null;
  mileage?: number | null;
  nickname?: string | null;
}

export type VehiclePatch = Partial<
  Pick<VehicleRecord, "year" | "make" | "model" | "trim" | "vin" | "mileage" | "nickname">
>;

export interface CreateListingInput {
  sellerId: string;
  sellerName: string | null;
  sellerEmail: string | null;
  title: string;
  year: string;
  make: string;
  model: string;
  trim?: string | null;
  mileage: number;
  price: number;
  titleStatus?: string;
  condition?: string;
  color?: string | null;
  transmission?: string;
  drivetrain?: string;
  engine?: string | null;
  description: string;
  knownProblems?: string | null;
  phone?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  images: ListingPhoto[];
}

export type ListingPatch = Partial<
  Pick<
    ListingRecord,
    | "title"
    | "year"
    | "make"
    | "model"
    | "trim"
    | "mileage"
    | "price"
    | "titleStatus"
    | "condition"
    | "color"
    | "transmission"
    | "drivetrain"
    | "engine"
    | "description"
    | "knownProblems"
    | "phone"
    | "city"
    | "state"
    | "zip"
    | "images"
    | "status"
  >
>;

export interface CreateShopInput {
  shopName: string;
  ownerName?: string | null;
  email: string;
  phone: string;
  passwordHash?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip: string;
  lat?: number | null;
  lng?: number | null;
  about?: string | null;
  specialties?: string[];
  languages?: string[];
  hours?: string | null;
}

export type ShopPatch = Partial<
  Pick<
    ShopProfileRecord,
    | "shopName"
    | "ownerName"
    | "phone"
    | "address"
    | "city"
    | "state"
    | "zip"
    | "lat"
    | "lng"
    | "about"
    | "specialties"
    | "languages"
    | "hours"
  >
>;

export interface CreateTowingInput {
  companyName: string;
  ownerName?: string | null;
  email: string;
  phone: string;
  passwordHash?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  serviceRadiusMi?: number;
  truckCount?: number;
}

export type TowingPatch = Partial<
  Pick<
    TowingProfileRecord,
    "companyName" | "ownerName" | "phone" | "zip" | "lat" | "lng" | "serviceRadiusMi" | "truckCount"
  >
>;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface AppStore {
  // Vehicles / vault
  createVehicle(input: CreateVehicleInput): Promise<VehicleRecord>;
  listVehiclesByOwner(ownerId: string): Promise<VehicleRecord[]>;
  findVehicleById(id: string): Promise<VehicleRecord | null>;
  updateVehicle(id: string, ownerId: string, patch: VehiclePatch): Promise<VehicleRecord | null>;
  deleteVehicle(id: string, ownerId: string): Promise<boolean>;
  listVehicleDiagnoses(vehicleId: string): Promise<DiagnosisSummary[]>;
  listRecentDiagnoses(userId: string, limit: number): Promise<DiagnosisSummary[]>;

  // Listings
  createListing(input: CreateListingInput): Promise<ListingRecord>;
  listActiveListings(limit: number): Promise<ListingRecord[]>;
  listListingsBySeller(sellerId: string): Promise<ListingRecord[]>;
  findListingById(id: string): Promise<ListingRecord | null>;
  incrementListingViews(id: string): Promise<void>;
  updateListing(id: string, sellerId: string, patch: ListingPatch): Promise<ListingRecord | null>;
  deleteListing(id: string, sellerId: string): Promise<boolean>;

  // Business accounts (shops + towing)
  findShopByEmail(emailNormalized: string): Promise<ShopProfileRecord | null>;
  findShopProfileById(id: string): Promise<ShopProfileRecord | null>;
  createShop(input: CreateShopInput): Promise<ShopProfileRecord>;
  updateShopProfile(id: string, patch: ShopPatch): Promise<ShopProfileRecord | null>;
  findTowingByEmail(emailNormalized: string): Promise<TowingProfileRecord | null>;
  findTowingProfileById(id: string): Promise<TowingProfileRecord | null>;
  createTowing(input: CreateTowingInput): Promise<TowingProfileRecord>;
  updateTowingProfile(id: string, patch: TowingPatch): Promise<TowingProfileRecord | null>;

  // Nearby search (lat/lng present + active only; ordered by distance)
  nearbyShops(origin: LatLng, radiusMi: number, limit: number): Promise<NearbyBusiness[]>;
  nearbyTowing(origin: LatLng, radiusMi: number, limit: number): Promise<NearbyBusiness[]>;

  // Messaging (thread = one user + one shop)
  postMessage(input: {
    userId: string;
    shopId: string;
    senderType: MessageSender;
    body: string;
  }): Promise<MessageRecord>;
  listThreadMessages(userId: string, shopId: string): Promise<MessageRecord[]>;
  listThreadsForUser(userId: string): Promise<ThreadSummary[]>;
  listThreadsForShop(shopId: string): Promise<ThreadSummary[]>;
  markThreadRead(userId: string, shopId: string, reader: MessageSender): Promise<void>;
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

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function num(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

interface VehicleRow {
  id: string;
  owner_id: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  mileage: number | null;
  nickname: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const VEHICLE_COLUMNS =
  "id, owner_id, year, make, model, trim, vin, mileage, nickname, created_at, updated_at";

function toVehicle(row: VehicleRow): VehicleRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    vin: row.vin,
    mileage: row.mileage,
    nickname: row.nickname,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

interface DiagnosisRow {
  id: string;
  user_id: string;
  vehicle_id: string;
  problem_text: string | null;
  image_url: string | null;
  ai_result: unknown;
  created_at: Date | string;
}

function toDiagnosis(row: DiagnosisRow): DiagnosisSummary {
  return {
    id: row.id,
    userId: row.user_id,
    vehicleId: row.vehicle_id,
    problemText: row.problem_text,
    imageUrl: row.image_url,
    aiResult: row.ai_result,
    createdAt: iso(row.created_at),
  };
}

interface ListingRow {
  id: string;
  seller_id: string;
  seller_name: string | null;
  seller_email: string | null;
  title: string;
  year: string;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  price: string | number;
  title_status: string;
  condition: string;
  color: string | null;
  transmission: string;
  drivetrain: string;
  engine: string | null;
  description: string;
  known_problems: string | null;
  phone: string | null;
  city: string;
  state: string;
  zip: string | null;
  images: unknown;
  status: string;
  views: number;
  created_at: Date | string;
  updated_at: Date | string;
}

const LISTING_COLUMNS =
  "id, seller_id, seller_name, seller_email, title, year, make, model, trim, mileage, price, title_status, condition, color, transmission, drivetrain, engine, description, known_problems, phone, city, state, zip, images, status, views, created_at, updated_at";

const PHOTO_SLOTS: ListingPhotoSlot[] = ["front", "back", "right", "left", "interior", "whole"];

function toPhotos(raw: unknown): ListingPhoto[] {
  if (!Array.isArray(raw)) return [];
  const out: ListingPhoto[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      // Legacy rows store bare upload paths — slot unknown, shown as the
      // whole-vehicle shot rather than dropped.
      out.push({ url: item, slot: "whole" });
    } else if (item && typeof item === "object") {
      const rec = item as { url?: unknown; slot?: unknown };
      if (typeof rec.url === "string") {
        out.push({
          url: rec.url,
          slot: PHOTO_SLOTS.includes(rec.slot as ListingPhotoSlot)
            ? (rec.slot as ListingPhotoSlot)
            : "whole",
        });
      }
    }
  }
  return out;
}

function toListing(row: ListingRow): ListingRecord {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    sellerEmail: row.seller_email,
    title: row.title,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    mileage: row.mileage,
    price: num(row.price) ?? 0,
    titleStatus: row.title_status,
    condition: row.condition,
    color: row.color,
    transmission: row.transmission,
    drivetrain: row.drivetrain,
    engine: row.engine,
    description: row.description,
    knownProblems: row.known_problems,
    phone: row.phone,
    city: row.city,
    state: row.state,
    zip: row.zip,
    images: toPhotos(row.images),
    status: (["active", "sold", "removed"].includes(row.status)
      ? row.status
      : "active") as ListingStatus,
    views: row.views,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

interface ShopRow {
  id: string;
  shop_name: string;
  owner_name: string | null;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string;
  lat: string | number | null;
  lng: string | number | null;
  about: string | null;
  specialties: unknown;
  languages: unknown;
  hours: string | null;
  rating: string | number;
  review_count: number;
  is_verified: boolean;
  is_active: boolean;
  plan: string;
  stripe_customer_id: string | null;
  password_hash: string | null;
  auth_method: "email" | "google" | "both";
  created_at: Date | string;
}

const SHOP_COLUMNS =
  "id, shop_name, owner_name, email, phone, address, city, state, zip, lat, lng, about, specialties, languages, hours, rating, review_count, is_verified, is_active, plan, stripe_customer_id, password_hash, auth_method, created_at";

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string");
}

function toShop(row: ShopRow): ShopProfileRecord {
  return {
    id: row.id,
    shopName: row.shop_name,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    lat: num(row.lat),
    lng: num(row.lng),
    about: row.about,
    specialties: toStringArray(row.specialties),
    languages: toStringArray(row.languages),
    hours: row.hours,
    rating: num(row.rating) ?? 0,
    reviewCount: row.review_count,
    isVerified: row.is_verified,
    isActive: row.is_active,
    plan: row.plan,
    stripeCustomerId: row.stripe_customer_id,
    passwordHash: row.password_hash,
    authMethod: row.auth_method,
    createdAt: iso(row.created_at),
  };
}

interface TowingRow {
  id: string;
  company_name: string;
  owner_name: string | null;
  email: string;
  phone: string;
  zip: string | null;
  lat: string | number | null;
  lng: string | number | null;
  service_radius_mi: number;
  truck_count: number;
  plan: string;
  rating: string | number;
  is_verified: boolean;
  is_active: boolean;
  stripe_customer_id: string | null;
  password_hash: string | null;
  auth_method: "email" | "google" | "both";
  created_at: Date | string;
}

const TOWING_COLUMNS =
  "id, company_name, owner_name, email, phone, zip, lat, lng, service_radius_mi, truck_count, plan, rating, is_verified, is_active, stripe_customer_id, password_hash, auth_method, created_at";

function toTowing(row: TowingRow): TowingProfileRecord {
  return {
    id: row.id,
    companyName: row.company_name,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    zip: row.zip,
    lat: num(row.lat),
    lng: num(row.lng),
    serviceRadiusMi: row.service_radius_mi,
    truckCount: row.truck_count,
    plan: row.plan,
    rating: num(row.rating) ?? 0,
    isVerified: row.is_verified,
    isActive: row.is_active,
    stripeCustomerId: row.stripe_customer_id,
    passwordHash: row.password_hash,
    authMethod: row.auth_method,
    createdAt: iso(row.created_at),
  };
}

interface MessageRow {
  id: string;
  from_user_id: string;
  shop_id: string;
  sender_type: MessageSender;
  body: string;
  is_read: boolean;
  created_at: Date | string;
}

function toMessage(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    userId: row.from_user_id,
    shopId: row.shop_id,
    senderType: row.sender_type,
    body: row.body,
    isRead: row.is_read,
    createdAt: iso(row.created_at),
  };
}

/** Build a parameterized SET clause from a patch object. */
function setClause(
  patch: Record<string, unknown>,
  columnMap: Record<string, string>,
  startAt: number,
): { clause: string; values: unknown[] } {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = startAt;
  for (const [key, column] of Object.entries(columnMap)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = $${i}`);
      values.push(patch[key]);
      i += 1;
    }
  }
  return { clause: sets.join(", "), values };
}

const KM_PER_MILE = 1.609344;

export class PgAppStore implements AppStore {
  // -- Vehicles -------------------------------------------------------------
  async createVehicle(input: CreateVehicleInput): Promise<VehicleRecord> {
    const { rows } = await getPool().query<VehicleRow>(
      `INSERT INTO vehicles (owner_id, year, make, model, trim, vin, mileage, nickname)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${VEHICLE_COLUMNS}`,
      [
        input.ownerId,
        input.year,
        input.make,
        input.model,
        input.trim ?? null,
        input.vin ?? null,
        input.mileage ?? null,
        input.nickname ?? null,
      ],
    );
    return toVehicle(rows[0]);
  }

  async listVehiclesByOwner(ownerId: string): Promise<VehicleRecord[]> {
    const { rows } = await getPool().query<VehicleRow>(
      `SELECT ${VEHICLE_COLUMNS} FROM vehicles WHERE owner_id = $1 ORDER BY created_at ASC`,
      [ownerId],
    );
    return rows.map(toVehicle);
  }

  async findVehicleById(id: string): Promise<VehicleRecord | null> {
    const { rows } = await getPool().query<VehicleRow>(
      `SELECT ${VEHICLE_COLUMNS} FROM vehicles WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toVehicle(rows[0]) : null;
  }

  async updateVehicle(id: string, ownerId: string, patch: VehiclePatch): Promise<VehicleRecord | null> {
    const { clause, values } = setClause(patch as Record<string, unknown>, {
      year: "year",
      make: "make",
      model: "model",
      trim: "trim",
      vin: "vin",
      mileage: "mileage",
      nickname: "nickname",
    }, 3);
    if (!clause) return this.findVehicleById(id).then((v) => (v && v.ownerId === ownerId ? v : null));
    const { rows } = await getPool().query<VehicleRow>(
      `UPDATE vehicles SET ${clause} WHERE id = $1 AND owner_id = $2 RETURNING ${VEHICLE_COLUMNS}`,
      [id, ownerId, ...values],
    );
    return rows[0] ? toVehicle(rows[0]) : null;
  }

  async deleteVehicle(id: string, ownerId: string): Promise<boolean> {
    const { rowCount } = await getPool().query(
      "DELETE FROM vehicles WHERE id = $1 AND owner_id = $2",
      [id, ownerId],
    );
    return (rowCount ?? 0) > 0;
  }

  async listVehicleDiagnoses(vehicleId: string): Promise<DiagnosisSummary[]> {
    const { rows } = await getPool().query<DiagnosisRow>(
      `SELECT id, user_id, vehicle_id, problem_text, image_url, ai_result, created_at
         FROM diagnostics WHERE vehicle_id = $1 ORDER BY created_at DESC`,
      [vehicleId],
    );
    return rows.map(toDiagnosis);
  }

  async listRecentDiagnoses(userId: string, limit: number): Promise<DiagnosisSummary[]> {
    const { rows } = await getPool().query<DiagnosisRow>(
      `SELECT id, user_id, vehicle_id, problem_text, image_url, ai_result, created_at
         FROM diagnostics WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
    return rows.map(toDiagnosis);
  }

  // -- Listings -------------------------------------------------------------
  async createListing(input: CreateListingInput): Promise<ListingRecord> {
    const { rows } = await getPool().query<ListingRow>(
      `INSERT INTO listings (seller_id, seller_name, seller_email, title, year, make, model, trim,
                             mileage, price, title_status, condition, color, transmission,
                             drivetrain, engine, description, known_problems, phone, city,
                             state, zip, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb)
       RETURNING ${LISTING_COLUMNS}`,
      [
        input.sellerId,
        input.sellerName,
        input.sellerEmail,
        input.title,
        input.year,
        input.make,
        input.model,
        input.trim ?? null,
        input.mileage,
        input.price,
        input.titleStatus ?? "Clean Title",
        input.condition ?? "Good",
        input.color ?? null,
        input.transmission ?? "Automatic",
        input.drivetrain ?? "FWD",
        input.engine ?? null,
        input.description,
        input.knownProblems ?? null,
        input.phone ?? null,
        input.city,
        input.state,
        input.zip ?? null,
        JSON.stringify(input.images),
      ],
    );
    return toListing(rows[0]);
  }

  async listActiveListings(limit: number): Promise<ListingRecord[]> {
    const { rows } = await getPool().query<ListingRow>(
      `SELECT ${LISTING_COLUMNS} FROM listings
        WHERE status = 'active' ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(toListing);
  }

  async listListingsBySeller(sellerId: string): Promise<ListingRecord[]> {
    const { rows } = await getPool().query<ListingRow>(
      `SELECT ${LISTING_COLUMNS} FROM listings WHERE seller_id = $1 ORDER BY created_at DESC`,
      [sellerId],
    );
    return rows.map(toListing);
  }

  async findListingById(id: string): Promise<ListingRecord | null> {
    const { rows } = await getPool().query<ListingRow>(
      `SELECT ${LISTING_COLUMNS} FROM listings WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toListing(rows[0]) : null;
  }

  async incrementListingViews(id: string): Promise<void> {
    await getPool().query("UPDATE listings SET views = views + 1 WHERE id = $1", [id]);
  }

  async updateListing(id: string, sellerId: string, patch: ListingPatch): Promise<ListingRecord | null> {
    const valuesByKey: Record<string, unknown> = { ...patch };
    if (patch.images !== undefined) valuesByKey.images = JSON.stringify(patch.images);
    const { clause, values } = setClause(valuesByKey, {
      title: "title",
      year: "year",
      make: "make",
      model: "model",
      trim: "trim",
      mileage: "mileage",
      price: "price",
      titleStatus: "title_status",
      condition: "condition",
      color: "color",
      transmission: "transmission",
      drivetrain: "drivetrain",
      engine: "engine",
      description: "description",
      knownProblems: "known_problems",
      phone: "phone",
      city: "city",
      state: "state",
      zip: "zip",
      images: "images",
      status: "status",
    }, 3);
    if (!clause) {
      const existing = await this.findListingById(id);
      return existing && existing.sellerId === sellerId ? existing : null;
    }
    const { rows } = await getPool().query<ListingRow>(
      `UPDATE listings SET ${clause} WHERE id = $1 AND seller_id = $2 RETURNING ${LISTING_COLUMNS}`,
      [id, sellerId, ...values],
    );
    return rows[0] ? toListing(rows[0]) : null;
  }

  async deleteListing(id: string, sellerId: string): Promise<boolean> {
    const { rowCount } = await getPool().query(
      "DELETE FROM listings WHERE id = $1 AND seller_id = $2",
      [id, sellerId],
    );
    return (rowCount ?? 0) > 0;
  }

  // -- Business accounts ------------------------------------------------------
  async findShopByEmail(emailNormalized: string): Promise<ShopProfileRecord | null> {
    const { rows } = await getPool().query<ShopRow>(
      `SELECT ${SHOP_COLUMNS} FROM shops WHERE lower(email) = $1 LIMIT 1`,
      [emailNormalized],
    );
    return rows[0] ? toShop(rows[0]) : null;
  }

  async findShopProfileById(id: string): Promise<ShopProfileRecord | null> {
    const { rows } = await getPool().query<ShopRow>(
      `SELECT ${SHOP_COLUMNS} FROM shops WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toShop(rows[0]) : null;
  }

  async createShop(input: CreateShopInput): Promise<ShopProfileRecord> {
    const { rows } = await getPool().query<ShopRow>(
      `INSERT INTO shops (shop_name, owner_name, email, phone, password_hash, address, city,
                          state, zip, lat, lng, about, specialties, languages, hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15)
       RETURNING ${SHOP_COLUMNS}`,
      [
        input.shopName,
        input.ownerName ?? null,
        input.email,
        input.phone,
        input.passwordHash ?? null,
        input.address ?? null,
        input.city ?? null,
        input.state ?? null,
        input.zip,
        input.lat ?? null,
        input.lng ?? null,
        input.about ?? null,
        JSON.stringify(input.specialties ?? []),
        JSON.stringify(input.languages ?? ["EN"]),
        input.hours ?? null,
      ],
    );
    return toShop(rows[0]);
  }

  async updateShopProfile(id: string, patch: ShopPatch): Promise<ShopProfileRecord | null> {
    const valuesByKey: Record<string, unknown> = { ...patch };
    if (patch.specialties !== undefined) valuesByKey.specialties = JSON.stringify(patch.specialties);
    if (patch.languages !== undefined) valuesByKey.languages = JSON.stringify(patch.languages);
    const { clause, values } = setClause(valuesByKey, {
      shopName: "shop_name",
      ownerName: "owner_name",
      phone: "phone",
      address: "address",
      city: "city",
      state: "state",
      zip: "zip",
      lat: "lat",
      lng: "lng",
      about: "about",
      specialties: "specialties",
      languages: "languages",
      hours: "hours",
    }, 2);
    if (!clause) return this.findShopProfileById(id);
    const { rows } = await getPool().query<ShopRow>(
      `UPDATE shops SET ${clause} WHERE id = $1 RETURNING ${SHOP_COLUMNS}`,
      [id, ...values],
    );
    return rows[0] ? toShop(rows[0]) : null;
  }

  async findTowingByEmail(emailNormalized: string): Promise<TowingProfileRecord | null> {
    const { rows } = await getPool().query<TowingRow>(
      `SELECT ${TOWING_COLUMNS} FROM towing_companies WHERE lower(email) = $1 LIMIT 1`,
      [emailNormalized],
    );
    return rows[0] ? toTowing(rows[0]) : null;
  }

  async findTowingProfileById(id: string): Promise<TowingProfileRecord | null> {
    const { rows } = await getPool().query<TowingRow>(
      `SELECT ${TOWING_COLUMNS} FROM towing_companies WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toTowing(rows[0]) : null;
  }

  async createTowing(input: CreateTowingInput): Promise<TowingProfileRecord> {
    const { rows } = await getPool().query<TowingRow>(
      `INSERT INTO towing_companies (company_name, owner_name, email, phone, password_hash,
                                      zip, lat, lng, service_radius_mi, truck_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${TOWING_COLUMNS}`,
      [
        input.companyName,
        input.ownerName ?? null,
        input.email,
        input.phone,
        input.passwordHash ?? null,
        input.zip ?? null,
        input.lat ?? null,
        input.lng ?? null,
        input.serviceRadiusMi ?? 25,
        input.truckCount ?? 1,
      ],
    );
    return toTowing(rows[0]);
  }

  async updateTowingProfile(id: string, patch: TowingPatch): Promise<TowingProfileRecord | null> {
    const { clause, values } = setClause(patch as Record<string, unknown>, {
      companyName: "company_name",
      ownerName: "owner_name",
      phone: "phone",
      zip: "zip",
      lat: "lat",
      lng: "lng",
      serviceRadiusMi: "service_radius_mi",
      truckCount: "truck_count",
    }, 2);
    if (!clause) return this.findTowingProfileById(id);
    const { rows } = await getPool().query<TowingRow>(
      `UPDATE towing_companies SET ${clause} WHERE id = $1 RETURNING ${TOWING_COLUMNS}`,
      [id, ...values],
    );
    return rows[0] ? toTowing(rows[0]) : null;
  }

  // -- Nearby -----------------------------------------------------------------
  async nearbyShops(origin: LatLng, radiusMi: number, limit: number): Promise<NearbyBusiness[]> {
    const { rows } = await getPool().query<{
      id: string;
      shop_name: string;
      phone: string;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string;
      lat: string | number;
      lng: string | number;
      rating: string | number;
      review_count: number;
      specialties: unknown;
      hours: string | null;
      is_verified: boolean;
      distance_mi: string | number;
    }>(
      `SELECT id, shop_name, phone, address, city, state, zip, lat, lng, rating, review_count,
              specialties, hours, is_verified,
              haversine_km(lat, lng, $1, $2) / ${KM_PER_MILE} AS distance_mi
         FROM shops
        WHERE is_active AND lat IS NOT NULL AND lng IS NOT NULL
          AND haversine_km(lat, lng, $1, $2) / ${KM_PER_MILE} <= $3
        ORDER BY distance_mi ASC
        LIMIT $4`,
      [origin.lat, origin.lng, radiusMi, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      kind: "shop" as const,
      name: r.shop_name,
      phone: r.phone,
      address: r.address,
      city: r.city,
      state: r.state,
      zip: r.zip,
      lat: num(r.lat) ?? 0,
      lng: num(r.lng) ?? 0,
      distanceMi: num(r.distance_mi) ?? 0,
      rating: num(r.rating) ?? 0,
      reviewCount: r.review_count,
      specialties: toStringArray(r.specialties),
      hours: r.hours,
      serviceRadiusMi: null,
      isVerified: r.is_verified,
    }));
  }

  async nearbyTowing(origin: LatLng, radiusMi: number, limit: number): Promise<NearbyBusiness[]> {
    const { rows } = await getPool().query<{
      id: string;
      company_name: string;
      phone: string;
      zip: string | null;
      lat: string | number;
      lng: string | number;
      rating: string | number;
      service_radius_mi: number;
      is_verified: boolean;
      distance_mi: string | number;
    }>(
      `SELECT id, company_name, phone, zip, lat, lng, rating, service_radius_mi, is_verified,
              haversine_km(lat, lng, $1, $2) / ${KM_PER_MILE} AS distance_mi
         FROM towing_companies
        WHERE is_active AND lat IS NOT NULL AND lng IS NOT NULL
          AND haversine_km(lat, lng, $1, $2) / ${KM_PER_MILE} <= $3
          AND haversine_km(lat, lng, $1, $2) / ${KM_PER_MILE} <= service_radius_mi
        ORDER BY distance_mi ASC
        LIMIT $4`,
      [origin.lat, origin.lng, radiusMi, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      kind: "towing" as const,
      name: r.company_name,
      phone: r.phone,
      address: null,
      city: null,
      state: null,
      zip: r.zip,
      lat: num(r.lat) ?? 0,
      lng: num(r.lng) ?? 0,
      distanceMi: num(r.distance_mi) ?? 0,
      rating: num(r.rating) ?? 0,
      reviewCount: null,
      specialties: [],
      hours: null,
      serviceRadiusMi: r.service_radius_mi,
      isVerified: r.is_verified,
    }));
  }

  // -- Messaging ---------------------------------------------------------------
  async postMessage(input: {
    userId: string;
    shopId: string;
    senderType: MessageSender;
    body: string;
  }): Promise<MessageRecord> {
    const { rows } = await getPool().query<MessageRow>(
      `INSERT INTO shop_messages (from_user_id, shop_id, sender_type, from_shop_id, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, from_user_id, shop_id, sender_type, body, is_read, created_at`,
      [
        input.userId,
        input.shopId,
        input.senderType,
        input.senderType === "shop" ? input.shopId : null,
        input.body,
      ],
    );
    return toMessage(rows[0]);
  }

  async listThreadMessages(userId: string, shopId: string): Promise<MessageRecord[]> {
    const { rows } = await getPool().query<MessageRow>(
      `SELECT id, from_user_id, shop_id, sender_type, body, is_read, created_at
         FROM shop_messages
        WHERE from_user_id = $1 AND shop_id = $2
        ORDER BY created_at ASC`,
      [userId, shopId],
    );
    return rows.map(toMessage);
  }

  async listThreadsForUser(userId: string): Promise<ThreadSummary[]> {
    const { rows } = await getPool().query<{
      shop_id: string;
      shop_name: string;
      body: string;
      created_at: Date | string;
      sender_type: MessageSender;
      unread: string | number;
    }>(
      `SELECT m.shop_id, s.shop_name, m.body, m.created_at, m.sender_type,
              (SELECT count(*) FROM shop_messages u
                WHERE u.from_user_id = m.from_user_id AND u.shop_id = m.shop_id
                  AND u.sender_type = 'shop' AND NOT u.is_read) AS unread
         FROM shop_messages m
         JOIN shops s ON s.id = m.shop_id
        WHERE m.from_user_id = $1
          AND m.created_at = (SELECT max(m2.created_at) FROM shop_messages m2
                               WHERE m2.from_user_id = m.from_user_id AND m2.shop_id = m.shop_id)
        ORDER BY m.created_at DESC`,
      [userId],
    );
    return rows.map((r) => ({
      userId,
      shopId: r.shop_id,
      counterpartName: r.shop_name,
      lastBody: r.body,
      lastAt: iso(r.created_at),
      lastSender: r.sender_type,
      unread: Number(r.unread) || 0,
    }));
  }

  async listThreadsForShop(shopId: string): Promise<ThreadSummary[]> {
    const { rows } = await getPool().query<{
      from_user_id: string;
      user_name: string;
      body: string;
      created_at: Date | string;
      sender_type: MessageSender;
      unread: string | number;
    }>(
      `SELECT m.from_user_id, u.name AS user_name, m.body, m.created_at, m.sender_type,
              (SELECT count(*) FROM shop_messages x
                WHERE x.from_user_id = m.from_user_id AND x.shop_id = m.shop_id
                  AND x.sender_type = 'user' AND NOT x.is_read) AS unread
         FROM shop_messages m
         JOIN users u ON u.id = m.from_user_id
        WHERE m.shop_id = $1
          AND m.created_at = (SELECT max(m2.created_at) FROM shop_messages m2
                               WHERE m2.from_user_id = m.from_user_id AND m2.shop_id = m.shop_id)
        ORDER BY m.created_at DESC`,
      [shopId],
    );
    return rows.map((r) => ({
      userId: r.from_user_id,
      shopId,
      counterpartName: r.user_name,
      lastBody: r.body,
      lastAt: iso(r.created_at),
      lastSender: r.sender_type,
      unread: Number(r.unread) || 0,
    }));
  }

  async markThreadRead(userId: string, shopId: string, reader: MessageSender): Promise<void> {
    // Reading a thread marks the OTHER side's messages as read.
    const senderToMark: MessageSender = reader === "user" ? "shop" : "user";
    await getPool().query(
      `UPDATE shop_messages SET is_read = true
        WHERE from_user_id = $1 AND shop_id = $2 AND sender_type = $3 AND NOT is_read`,
      [userId, shopId, senderToMark],
    );
  }
}

// ---------------------------------------------------------------------------
// In-memory implementation (tests) — identical semantics to PgAppStore,
// including owner-scoped misses returning null/false and nearby results
// ordered by ascending distance.
// ---------------------------------------------------------------------------

export class MemoryAppStore implements AppStore {
  readonly vehicles = new Map<string, VehicleRecord>();
  readonly diagnoses: DiagnosisSummary[] = [];
  readonly listings = new Map<string, ListingRecord>();
  readonly shops = new Map<string, ShopProfileRecord>();
  readonly towing = new Map<string, TowingProfileRecord>();
  readonly messages: MessageRecord[] = [];
  private seq = 0;

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-test-${this.seq}`;
  }

  private now(): string {
    // Monotonic timestamps keep thread/listing ordering deterministic
    // in tests even when several rows land in the same millisecond.
    return new Date(Date.now() + this.seq).toISOString();
  }

  // -- Vehicles -------------------------------------------------------------
  async createVehicle(input: CreateVehicleInput): Promise<VehicleRecord> {
    const ts = this.now();
    const vehicle: VehicleRecord = {
      id: this.nextId("vehicle"),
      ownerId: input.ownerId,
      year: input.year,
      make: input.make,
      model: input.model,
      trim: input.trim ?? null,
      vin: input.vin ?? null,
      mileage: input.mileage ?? null,
      nickname: input.nickname ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.vehicles.set(vehicle.id, vehicle);
    return vehicle;
  }

  async listVehiclesByOwner(ownerId: string): Promise<VehicleRecord[]> {
    return [...this.vehicles.values()].filter((v) => v.ownerId === ownerId);
  }

  async findVehicleById(id: string): Promise<VehicleRecord | null> {
    return this.vehicles.get(id) ?? null;
  }

  async updateVehicle(id: string, ownerId: string, patch: VehiclePatch): Promise<VehicleRecord | null> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle || vehicle.ownerId !== ownerId) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (vehicle as unknown as Record<string, unknown>)[key] = value;
    }
    vehicle.updatedAt = this.now();
    return vehicle;
  }

  async deleteVehicle(id: string, ownerId: string): Promise<boolean> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle || vehicle.ownerId !== ownerId) return false;
    this.vehicles.delete(id);
    return true;
  }

  async listVehicleDiagnoses(vehicleId: string): Promise<DiagnosisSummary[]> {
    return this.diagnoses
      .filter((d) => d.vehicleId === vehicleId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listRecentDiagnoses(userId: string, limit: number): Promise<DiagnosisSummary[]> {
    return this.diagnoses
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  // -- Listings -------------------------------------------------------------
  async createListing(input: CreateListingInput): Promise<ListingRecord> {
    const ts = this.now();
    const listing: ListingRecord = {
      id: this.nextId("listing"),
      sellerId: input.sellerId,
      sellerName: input.sellerName,
      sellerEmail: input.sellerEmail,
      title: input.title,
      year: input.year,
      make: input.make,
      model: input.model,
      trim: input.trim ?? null,
      mileage: input.mileage,
      price: input.price,
      titleStatus: input.titleStatus ?? "Clean Title",
      condition: input.condition ?? "Good",
      color: input.color ?? null,
      transmission: input.transmission ?? "Automatic",
      drivetrain: input.drivetrain ?? "FWD",
      engine: input.engine ?? null,
      description: input.description,
      knownProblems: input.knownProblems ?? null,
      phone: input.phone ?? null,
      city: input.city,
      state: input.state,
      zip: input.zip ?? null,
      images: input.images,
      status: "active",
      views: 0,
      createdAt: ts,
      updatedAt: ts,
    };
    this.listings.set(listing.id, listing);
    return listing;
  }

  async listActiveListings(limit: number): Promise<ListingRecord[]> {
    return [...this.listings.values()]
      .filter((l) => l.status === "active")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async listListingsBySeller(sellerId: string): Promise<ListingRecord[]> {
    return [...this.listings.values()]
      .filter((l) => l.sellerId === sellerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findListingById(id: string): Promise<ListingRecord | null> {
    return this.listings.get(id) ?? null;
  }

  async incrementListingViews(id: string): Promise<void> {
    const listing = this.listings.get(id);
    if (listing) listing.views += 1;
  }

  async updateListing(id: string, sellerId: string, patch: ListingPatch): Promise<ListingRecord | null> {
    const listing = this.listings.get(id);
    if (!listing || listing.sellerId !== sellerId) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (listing as unknown as Record<string, unknown>)[key] = value;
    }
    listing.updatedAt = this.now();
    return listing;
  }

  async deleteListing(id: string, sellerId: string): Promise<boolean> {
    const listing = this.listings.get(id);
    if (!listing || listing.sellerId !== sellerId) return false;
    this.listings.delete(id);
    return true;
  }

  // -- Business accounts ------------------------------------------------------
  async findShopByEmail(emailNormalized: string): Promise<ShopProfileRecord | null> {
    for (const s of this.shops.values()) if (s.email === emailNormalized) return s;
    return null;
  }

  async findShopProfileById(id: string): Promise<ShopProfileRecord | null> {
    return this.shops.get(id) ?? null;
  }

  async createShop(input: CreateShopInput): Promise<ShopProfileRecord> {
    const shop: ShopProfileRecord = {
      id: this.nextId("shop"),
      shopName: input.shopName,
      ownerName: input.ownerName ?? null,
      email: input.email,
      phone: input.phone,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      about: input.about ?? null,
      specialties: input.specialties ?? [],
      languages: input.languages ?? ["EN"],
      hours: input.hours ?? null,
      rating: 0,
      reviewCount: 0,
      isVerified: false,
      isActive: true,
      plan: "free",
      stripeCustomerId: null,
      passwordHash: input.passwordHash ?? null,
      authMethod: "email",
      createdAt: this.now(),
    };
    this.shops.set(shop.id, shop);
    return shop;
  }

  async updateShopProfile(id: string, patch: ShopPatch): Promise<ShopProfileRecord | null> {
    const shop = this.shops.get(id);
    if (!shop) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (shop as unknown as Record<string, unknown>)[key] = value;
    }
    return shop;
  }

  async findTowingByEmail(emailNormalized: string): Promise<TowingProfileRecord | null> {
    for (const t of this.towing.values()) if (t.email === emailNormalized) return t;
    return null;
  }

  async findTowingProfileById(id: string): Promise<TowingProfileRecord | null> {
    return this.towing.get(id) ?? null;
  }

  async createTowing(input: CreateTowingInput): Promise<TowingProfileRecord> {
    const towing: TowingProfileRecord = {
      id: this.nextId("towing"),
      companyName: input.companyName,
      ownerName: input.ownerName ?? null,
      email: input.email,
      phone: input.phone,
      zip: input.zip ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      serviceRadiusMi: input.serviceRadiusMi ?? 25,
      truckCount: input.truckCount ?? 1,
      plan: "starter",
      rating: 0,
      isVerified: false,
      isActive: true,
      stripeCustomerId: null,
      passwordHash: input.passwordHash ?? null,
      authMethod: "email",
      createdAt: this.now(),
    };
    this.towing.set(towing.id, towing);
    return towing;
  }

  async updateTowingProfile(id: string, patch: TowingPatch): Promise<TowingProfileRecord | null> {
    const towing = this.towing.get(id);
    if (!towing) return null;
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (towing as unknown as Record<string, unknown>)[key] = value;
    }
    return towing;
  }

  // -- Nearby -----------------------------------------------------------------
  async nearbyShops(origin: LatLng, radiusMi: number, limit: number): Promise<NearbyBusiness[]> {
    const out: NearbyBusiness[] = [];
    for (const s of this.shops.values()) {
      if (!s.isActive || s.lat === null || s.lng === null) continue;
      const distanceMi = haversineMiles(origin, { lat: s.lat, lng: s.lng });
      if (distanceMi > radiusMi) continue;
      out.push({
        id: s.id,
        kind: "shop",
        name: s.shopName,
        phone: s.phone,
        address: s.address,
        city: s.city,
        state: s.state,
        zip: s.zip,
        lat: s.lat,
        lng: s.lng,
        distanceMi,
        rating: s.rating,
        reviewCount: s.reviewCount,
        specialties: s.specialties,
        hours: s.hours,
        serviceRadiusMi: null,
        isVerified: s.isVerified,
      });
    }
    return out.sort((a, b) => a.distanceMi - b.distanceMi).slice(0, limit);
  }

  async nearbyTowing(origin: LatLng, radiusMi: number, limit: number): Promise<NearbyBusiness[]> {
    const out: NearbyBusiness[] = [];
    for (const t of this.towing.values()) {
      if (!t.isActive || t.lat === null || t.lng === null) continue;
      const distanceMi = haversineMiles(origin, { lat: t.lat, lng: t.lng });
      if (distanceMi > radiusMi || distanceMi > t.serviceRadiusMi) continue;
      out.push({
        id: t.id,
        kind: "towing",
        name: t.companyName,
        phone: t.phone,
        address: null,
        city: null,
        state: null,
        zip: t.zip,
        lat: t.lat,
        lng: t.lng,
        distanceMi,
        rating: t.rating,
        reviewCount: null,
        specialties: [],
        hours: null,
        serviceRadiusMi: t.serviceRadiusMi,
        isVerified: t.isVerified,
      });
    }
    return out.sort((a, b) => a.distanceMi - b.distanceMi).slice(0, limit);
  }

  // -- Messaging ---------------------------------------------------------------
  async postMessage(input: {
    userId: string;
    shopId: string;
    senderType: MessageSender;
    body: string;
  }): Promise<MessageRecord> {
    const message: MessageRecord = {
      id: this.nextId("message"),
      userId: input.userId,
      shopId: input.shopId,
      senderType: input.senderType,
      body: input.body,
      isRead: false,
      createdAt: this.now(),
    };
    this.messages.push(message);
    return message;
  }

  async listThreadMessages(userId: string, shopId: string): Promise<MessageRecord[]> {
    return this.messages
      .filter((m) => m.userId === userId && m.shopId === shopId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private summarize(
    filter: (m: MessageRecord) => boolean,
    reader: MessageSender,
    nameFor: (m: MessageRecord) => string,
  ): ThreadSummary[] {
    const threads = new Map<string, MessageRecord[]>();
    for (const m of this.messages) {
      if (!filter(m)) continue;
      const key = `${m.userId}|${m.shopId}`;
      const list = threads.get(key) ?? [];
      list.push(m);
      threads.set(key, list);
    }
    const summaries: ThreadSummary[] = [];
    for (const list of threads.values()) {
      const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const last = sorted[sorted.length - 1];
      const incoming: MessageSender = reader === "user" ? "shop" : "user";
      summaries.push({
        userId: last.userId,
        shopId: last.shopId,
        counterpartName: nameFor(last),
        lastBody: last.body,
        lastAt: last.createdAt,
        lastSender: last.senderType,
        unread: sorted.filter((m) => m.senderType === incoming && !m.isRead).length,
      });
    }
    return summaries.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }

  async listThreadsForUser(userId: string): Promise<ThreadSummary[]> {
    return this.summarize(
      (m) => m.userId === userId,
      "user",
      (m) => this.shops.get(m.shopId)?.shopName ?? "Shop",
    );
  }

  async listThreadsForShop(shopId: string): Promise<ThreadSummary[]> {
    // The Memory store has no users table (that is IdentityStore's) —
    // tests seed names through message flow metadata; the Pg store
    // joins users for the real name. Fallback keeps the shape honest.
    return this.summarize(
      (m) => m.shopId === shopId,
      "shop",
      () => "Driver",
    );
  }

  async markThreadRead(userId: string, shopId: string, reader: MessageSender): Promise<void> {
    const incoming: MessageSender = reader === "user" ? "shop" : "user";
    for (const m of this.messages) {
      if (m.userId === userId && m.shopId === shopId && m.senderType === incoming) {
        m.isRead = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------

let cachedAppStore: AppStore | null = null;

/** Production store — honest DatabaseNotConfiguredError when unwired. */
export function getAppStore(): AppStore {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  if (!cachedAppStore) cachedAppStore = new PgAppStore();
  return cachedAppStore;
}
