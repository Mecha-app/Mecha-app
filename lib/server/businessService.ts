import { InvalidCredentialsError, ValidationError } from "./authService";
import { NotFoundError } from "./errors";
import { isValidLatLng, normalizeZip, zipCentroid, type LatLng } from "./geo";
import { normalizeEmail, normalizePhone } from "./identity";
import { signToken, type AccountType } from "./jwt";
import { hashPassword, verifyPassword } from "./passwords";
import { IdentityConflictError } from "./store";
import type {
  AppStore,
  ShopPatch,
  ShopProfileRecord,
  TowingPatch,
  TowingProfileRecord,
} from "./appStore";

/**
 * Business accounts (WP6) — self-signup + login for mechanic shops and
 * towing companies, the supply side of the nearby flows.
 *
 * Identity here is per-table email (the repo's model: shops and towing
 * companies are separate auth actors with their own unique emails, and
 * their session tokens carry type 'shop' | 'towing' — the legacy JWT
 * contract). Registration geocodes the ZIP through the bundled Census
 * centroids: no external geocoder, no key, and a business whose ZIP we
 * somehow don't know lands with NULL coordinates and simply doesn't
 * appear in nearby results until its location is set — honest absence
 * over a guessed location.
 */

export type BusinessKind = "shop" | "towing";

export interface PublicShop {
  id: string;
  type: "shop";
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
  plan: string;
}

export interface PublicTowing {
  id: string;
  type: "towing";
  companyName: string;
  ownerName: string | null;
  email: string;
  phone: string;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  serviceRadiusMi: number;
  truckCount: number;
  rating: number;
  isVerified: boolean;
  plan: string;
}

export interface BusinessAuthResult {
  token: string;
  business: PublicShop | PublicTowing;
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

function optionalString(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanString(value, max);
}

function stringList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0 && item.trim().length <= maxLen) {
      out.push(item.trim());
    }
    if (out.length >= maxItems) break;
  }
  return out;
}

function resolveLatLng(body: Record<string, unknown>, zip: string | null): LatLng | null {
  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
  if (isValidLatLng(lat, lng)) return { lat, lng };
  if (zip) return zipCentroid(zip);
  return null;
}

function requireEmail(body: Record<string, unknown>): string {
  const email = normalizeEmail(body.email);
  if (!email) throw new ValidationError('A valid "email" is required.');
  return email;
}

function requirePassword(body: Record<string, unknown>): string {
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) {
    throw new ValidationError('"password" must be at least 8 characters.');
  }
  return password;
}

function requirePhone(body: Record<string, unknown>): string {
  const phone = cleanString(body.phone, 40);
  if (!phone || !normalizePhone(phone)) {
    throw new ValidationError('A reachable "phone" number is required — drivers call it from the roadside list.');
  }
  return phone;
}

export function publicShop(shop: ShopProfileRecord): PublicShop {
  return {
    id: shop.id,
    type: "shop",
    shopName: shop.shopName,
    ownerName: shop.ownerName,
    email: shop.email,
    phone: shop.phone,
    address: shop.address,
    city: shop.city,
    state: shop.state,
    zip: shop.zip,
    lat: shop.lat,
    lng: shop.lng,
    about: shop.about,
    specialties: shop.specialties,
    languages: shop.languages,
    hours: shop.hours,
    rating: shop.rating,
    reviewCount: shop.reviewCount,
    isVerified: shop.isVerified,
    plan: shop.plan,
  };
}

export function publicTowing(towing: TowingProfileRecord): PublicTowing {
  return {
    id: towing.id,
    type: "towing",
    companyName: towing.companyName,
    ownerName: towing.ownerName,
    email: towing.email,
    phone: towing.phone,
    zip: towing.zip,
    lat: towing.lat,
    lng: towing.lng,
    serviceRadiusMi: towing.serviceRadiusMi,
    truckCount: towing.truckCount,
    rating: towing.rating,
    isVerified: towing.isVerified,
    plan: towing.plan,
  };
}

export async function registerBusiness(
  store: AppStore,
  kind: BusinessKind,
  body: Record<string, unknown>,
): Promise<BusinessAuthResult> {
  const email = requireEmail(body);
  const password = requirePassword(body);
  const phone = requirePhone(body);
  const passwordHash = await hashPassword(password);

  if (kind === "shop") {
    const shopName = cleanString(body.shopName ?? body.name, 120);
    if (!shopName) throw new ValidationError('A non-empty "shopName" is required.');
    const zipRaw = normalizeZip(body.zip);
    if (!zipRaw) throw new ValidationError('A valid 5-digit "zip" is required — drivers find you by it.');
    if (await store.findShopByEmail(email)) throw new IdentityConflictError("email");
    const coords = resolveLatLng(body, zipRaw);
    try {
      const shop = await store.createShop({
        shopName,
        ownerName: optionalString(body.ownerName, 120),
        email,
        phone,
        passwordHash,
        address: optionalString(body.address, 200),
        city: optionalString(body.city, 80),
        state: optionalString(body.state, 80),
        zip: zipRaw,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        about: optionalString(body.about, 2000),
        specialties: stringList(body.specialties, 12, 60),
        languages: stringList(body.languages, 8, 10),
        hours: optionalString(body.hours, 200),
      });
      return { token: signToken({ id: shop.id, type: "shop" }), business: publicShop(shop) };
    } catch (err) {
      if ((err as { code?: string }).code === "23505") throw new IdentityConflictError("email");
      throw err;
    }
  }

  const companyName = cleanString(body.companyName ?? body.name, 120);
  if (!companyName) throw new ValidationError('A non-empty "companyName" is required.');
  const zip = body.zip === undefined || body.zip === "" ? null : normalizeZip(body.zip);
  if (body.zip !== undefined && body.zip !== "" && !zip) {
    throw new ValidationError('"zip" must be a 5-digit ZIP code.');
  }
  if (await store.findTowingByEmail(email)) throw new IdentityConflictError("email");
  const coords = resolveLatLng(body, zip);
  const radiusRaw = typeof body.serviceRadiusMi === "number" ? body.serviceRadiusMi : Number(body.serviceRadiusMi);
  const truckRaw = typeof body.truckCount === "number" ? body.truckCount : Number(body.truckCount);
  try {
    const towing = await store.createTowing({
      companyName,
      ownerName: optionalString(body.ownerName, 120),
      email,
      phone,
      passwordHash,
      zip,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      serviceRadiusMi: Number.isFinite(radiusRaw) ? Math.min(200, Math.max(1, Math.round(radiusRaw))) : 25,
      truckCount: Number.isFinite(truckRaw) ? Math.min(500, Math.max(1, Math.round(truckRaw))) : 1,
    });
    return { token: signToken({ id: towing.id, type: "towing" }), business: publicTowing(towing) };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new IdentityConflictError("email");
    throw err;
  }
}

// Timing equalization, same as driver login (WP5 security pass): a
// bcrypt compare runs on every path so timing doesn't reveal whether
// the business email is registered.
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("mecha-business-timing-dummy");
  return dummyHashPromise;
}

export async function loginBusiness(
  store: AppStore,
  kind: BusinessKind,
  body: Record<string, unknown>,
): Promise<BusinessAuthResult> {
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || password.length === 0) throw new InvalidCredentialsError();

  if (kind === "shop") {
    const shop = await store.findShopByEmail(email);
    const ok = await verifyPassword(password, shop?.passwordHash ?? (await dummyHash()));
    if (!shop || !shop.passwordHash || !ok) throw new InvalidCredentialsError();
    return { token: signToken({ id: shop.id, type: "shop" }), business: publicShop(shop) };
  }
  const towing = await store.findTowingByEmail(email);
  const ok = await verifyPassword(password, towing?.passwordHash ?? (await dummyHash()));
  if (!towing || !towing.passwordHash || !ok) throw new InvalidCredentialsError();
  return { token: signToken({ id: towing.id, type: "towing" }), business: publicTowing(towing) };
}

export async function getBusinessProfile(
  store: AppStore,
  payload: { id: string; type: AccountType },
): Promise<PublicShop | PublicTowing> {
  if (payload.type === "shop") {
    const shop = await store.findShopProfileById(payload.id);
    if (!shop) throw new NotFoundError("Business account not found.");
    return publicShop(shop);
  }
  if (payload.type === "towing") {
    const towing = await store.findTowingProfileById(payload.id);
    if (!towing) throw new NotFoundError("Business account not found.");
    return publicTowing(towing);
  }
  throw new ValidationError("This endpoint serves shop and towing accounts.");
}

export async function updateBusinessProfile(
  store: AppStore,
  payload: { id: string; type: AccountType },
  body: Record<string, unknown>,
): Promise<PublicShop | PublicTowing> {
  if (payload.type === "shop") {
    const patch: ShopPatch = {};
    if (body.shopName !== undefined) {
      const name = cleanString(body.shopName, 120);
      if (!name) throw new ValidationError('A non-empty "shopName" is required.');
      patch.shopName = name;
    }
    if (body.ownerName !== undefined) patch.ownerName = optionalString(body.ownerName, 120);
    if (body.phone !== undefined) patch.phone = requirePhone(body);
    if (body.address !== undefined) patch.address = optionalString(body.address, 200);
    if (body.city !== undefined) patch.city = optionalString(body.city, 80);
    if (body.state !== undefined) patch.state = optionalString(body.state, 80);
    if (body.about !== undefined) patch.about = optionalString(body.about, 2000);
    if (body.hours !== undefined) patch.hours = optionalString(body.hours, 200);
    if (body.specialties !== undefined) patch.specialties = stringList(body.specialties, 12, 60);
    if (body.languages !== undefined) patch.languages = stringList(body.languages, 8, 10);
    if (body.zip !== undefined) {
      const zip = normalizeZip(body.zip);
      if (!zip) throw new ValidationError('A valid 5-digit "zip" is required.');
      patch.zip = zip;
      const coords = resolveLatLng(body, zip);
      patch.lat = coords?.lat ?? null;
      patch.lng = coords?.lng ?? null;
    } else if (body.lat !== undefined || body.lng !== undefined) {
      const current = await store.findShopProfileById(payload.id);
      const coords = resolveLatLng(body, current?.zip ?? null);
      patch.lat = coords?.lat ?? null;
      patch.lng = coords?.lng ?? null;
    }
    const updated = await store.updateShopProfile(payload.id, patch);
    if (!updated) throw new NotFoundError("Business account not found.");
    return publicShop(updated);
  }
  if (payload.type === "towing") {
    const patch: TowingPatch = {};
    if (body.companyName !== undefined) {
      const name = cleanString(body.companyName, 120);
      if (!name) throw new ValidationError('A non-empty "companyName" is required.');
      patch.companyName = name;
    }
    if (body.ownerName !== undefined) patch.ownerName = optionalString(body.ownerName, 120);
    if (body.phone !== undefined) patch.phone = requirePhone(body);
    if (body.serviceRadiusMi !== undefined) {
      const n = Number(body.serviceRadiusMi);
      if (!Number.isFinite(n) || n < 1 || n > 200) {
        throw new ValidationError('"serviceRadiusMi" must be between 1 and 200.');
      }
      patch.serviceRadiusMi = Math.round(n);
    }
    if (body.truckCount !== undefined) {
      const n = Number(body.truckCount);
      if (!Number.isFinite(n) || n < 1 || n > 500) {
        throw new ValidationError('"truckCount" must be between 1 and 500.');
      }
      patch.truckCount = Math.round(n);
    }
    if (body.zip !== undefined) {
      const zip = body.zip === "" ? null : normalizeZip(body.zip);
      if (body.zip !== "" && !zip) throw new ValidationError('"zip" must be a 5-digit ZIP code.');
      patch.zip = zip;
      const coords = resolveLatLng(body, zip);
      patch.lat = coords?.lat ?? null;
      patch.lng = coords?.lng ?? null;
    }
    const updated = await store.updateTowingProfile(payload.id, patch);
    if (!updated) throw new NotFoundError("Business account not found.");
    return publicTowing(updated);
  }
  throw new ValidationError("This endpoint serves shop and towing accounts.");
}
