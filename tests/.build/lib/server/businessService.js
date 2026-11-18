"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicShop = publicShop;
exports.publicTowing = publicTowing;
exports.registerBusiness = registerBusiness;
exports.loginBusiness = loginBusiness;
exports.getBusinessProfile = getBusinessProfile;
exports.updateBusinessProfile = updateBusinessProfile;
const authService_1 = require("./authService");
const errors_1 = require("./errors");
const geo_1 = require("./geo");
const identity_1 = require("./identity");
const jwt_1 = require("./jwt");
const passwords_1 = require("./passwords");
const store_1 = require("./store");
function cleanString(value, max) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > max)
        return null;
    return trimmed;
}
function optionalString(value, max) {
    if (value === undefined || value === null || value === "")
        return null;
    return cleanString(value, max);
}
function stringList(value, maxItems, maxLen) {
    if (!Array.isArray(value))
        return [];
    const out = [];
    for (const item of value) {
        if (typeof item === "string" && item.trim().length > 0 && item.trim().length <= maxLen) {
            out.push(item.trim());
        }
        if (out.length >= maxItems)
            break;
    }
    return out;
}
function resolveLatLng(body, zip) {
    const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
    const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
    if ((0, geo_1.isValidLatLng)(lat, lng))
        return { lat, lng };
    if (zip)
        return (0, geo_1.zipCentroid)(zip);
    return null;
}
function requireEmail(body) {
    const email = (0, identity_1.normalizeEmail)(body.email);
    if (!email)
        throw new authService_1.ValidationError('A valid "email" is required.');
    return email;
}
function requirePassword(body) {
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) {
        throw new authService_1.ValidationError('"password" must be at least 8 characters.');
    }
    return password;
}
function requirePhone(body) {
    const phone = cleanString(body.phone, 40);
    if (!phone || !(0, identity_1.normalizePhone)(phone)) {
        throw new authService_1.ValidationError('A reachable "phone" number is required — drivers call it from the roadside list.');
    }
    return phone;
}
function publicShop(shop) {
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
function publicTowing(towing) {
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
async function registerBusiness(store, kind, body) {
    const email = requireEmail(body);
    const password = requirePassword(body);
    const phone = requirePhone(body);
    const passwordHash = await (0, passwords_1.hashPassword)(password);
    if (kind === "shop") {
        const shopName = cleanString(body.shopName ?? body.name, 120);
        if (!shopName)
            throw new authService_1.ValidationError('A non-empty "shopName" is required.');
        const zipRaw = (0, geo_1.normalizeZip)(body.zip);
        if (!zipRaw)
            throw new authService_1.ValidationError('A valid 5-digit "zip" is required — drivers find you by it.');
        if (await store.findShopByEmail(email))
            throw new store_1.IdentityConflictError("email");
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
            return { token: (0, jwt_1.signToken)({ id: shop.id, type: "shop" }), business: publicShop(shop) };
        }
        catch (err) {
            if (err.code === "23505")
                throw new store_1.IdentityConflictError("email");
            throw err;
        }
    }
    const companyName = cleanString(body.companyName ?? body.name, 120);
    if (!companyName)
        throw new authService_1.ValidationError('A non-empty "companyName" is required.');
    const zip = body.zip === undefined || body.zip === "" ? null : (0, geo_1.normalizeZip)(body.zip);
    if (body.zip !== undefined && body.zip !== "" && !zip) {
        throw new authService_1.ValidationError('"zip" must be a 5-digit ZIP code.');
    }
    if (await store.findTowingByEmail(email))
        throw new store_1.IdentityConflictError("email");
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
        return { token: (0, jwt_1.signToken)({ id: towing.id, type: "towing" }), business: publicTowing(towing) };
    }
    catch (err) {
        if (err.code === "23505")
            throw new store_1.IdentityConflictError("email");
        throw err;
    }
}
// Timing equalization, same as driver login (WP5 security pass): a
// bcrypt compare runs on every path so timing doesn't reveal whether
// the business email is registered.
let dummyHashPromise = null;
function dummyHash() {
    if (!dummyHashPromise)
        dummyHashPromise = (0, passwords_1.hashPassword)("mecha-business-timing-dummy");
    return dummyHashPromise;
}
async function loginBusiness(store, kind, body) {
    const email = (0, identity_1.normalizeEmail)(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || password.length === 0)
        throw new authService_1.InvalidCredentialsError();
    if (kind === "shop") {
        const shop = await store.findShopByEmail(email);
        const ok = await (0, passwords_1.verifyPassword)(password, shop?.passwordHash ?? (await dummyHash()));
        if (!shop || !shop.passwordHash || !ok)
            throw new authService_1.InvalidCredentialsError();
        return { token: (0, jwt_1.signToken)({ id: shop.id, type: "shop" }), business: publicShop(shop) };
    }
    const towing = await store.findTowingByEmail(email);
    const ok = await (0, passwords_1.verifyPassword)(password, towing?.passwordHash ?? (await dummyHash()));
    if (!towing || !towing.passwordHash || !ok)
        throw new authService_1.InvalidCredentialsError();
    return { token: (0, jwt_1.signToken)({ id: towing.id, type: "towing" }), business: publicTowing(towing) };
}
async function getBusinessProfile(store, payload) {
    if (payload.type === "shop") {
        const shop = await store.findShopProfileById(payload.id);
        if (!shop)
            throw new errors_1.NotFoundError("Business account not found.");
        return publicShop(shop);
    }
    if (payload.type === "towing") {
        const towing = await store.findTowingProfileById(payload.id);
        if (!towing)
            throw new errors_1.NotFoundError("Business account not found.");
        return publicTowing(towing);
    }
    throw new authService_1.ValidationError("This endpoint serves shop and towing accounts.");
}
async function updateBusinessProfile(store, payload, body) {
    if (payload.type === "shop") {
        const patch = {};
        if (body.shopName !== undefined) {
            const name = cleanString(body.shopName, 120);
            if (!name)
                throw new authService_1.ValidationError('A non-empty "shopName" is required.');
            patch.shopName = name;
        }
        if (body.ownerName !== undefined)
            patch.ownerName = optionalString(body.ownerName, 120);
        if (body.phone !== undefined)
            patch.phone = requirePhone(body);
        if (body.address !== undefined)
            patch.address = optionalString(body.address, 200);
        if (body.city !== undefined)
            patch.city = optionalString(body.city, 80);
        if (body.state !== undefined)
            patch.state = optionalString(body.state, 80);
        if (body.about !== undefined)
            patch.about = optionalString(body.about, 2000);
        if (body.hours !== undefined)
            patch.hours = optionalString(body.hours, 200);
        if (body.specialties !== undefined)
            patch.specialties = stringList(body.specialties, 12, 60);
        if (body.languages !== undefined)
            patch.languages = stringList(body.languages, 8, 10);
        if (body.zip !== undefined) {
            const zip = (0, geo_1.normalizeZip)(body.zip);
            if (!zip)
                throw new authService_1.ValidationError('A valid 5-digit "zip" is required.');
            patch.zip = zip;
            const coords = resolveLatLng(body, zip);
            patch.lat = coords?.lat ?? null;
            patch.lng = coords?.lng ?? null;
        }
        else if (body.lat !== undefined || body.lng !== undefined) {
            const current = await store.findShopProfileById(payload.id);
            const coords = resolveLatLng(body, current?.zip ?? null);
            patch.lat = coords?.lat ?? null;
            patch.lng = coords?.lng ?? null;
        }
        const updated = await store.updateShopProfile(payload.id, patch);
        if (!updated)
            throw new errors_1.NotFoundError("Business account not found.");
        return publicShop(updated);
    }
    if (payload.type === "towing") {
        const patch = {};
        if (body.companyName !== undefined) {
            const name = cleanString(body.companyName, 120);
            if (!name)
                throw new authService_1.ValidationError('A non-empty "companyName" is required.');
            patch.companyName = name;
        }
        if (body.ownerName !== undefined)
            patch.ownerName = optionalString(body.ownerName, 120);
        if (body.phone !== undefined)
            patch.phone = requirePhone(body);
        if (body.serviceRadiusMi !== undefined) {
            const n = Number(body.serviceRadiusMi);
            if (!Number.isFinite(n) || n < 1 || n > 200) {
                throw new authService_1.ValidationError('"serviceRadiusMi" must be between 1 and 200.');
            }
            patch.serviceRadiusMi = Math.round(n);
        }
        if (body.truckCount !== undefined) {
            const n = Number(body.truckCount);
            if (!Number.isFinite(n) || n < 1 || n > 500) {
                throw new authService_1.ValidationError('"truckCount" must be between 1 and 500.');
            }
            patch.truckCount = Math.round(n);
        }
        if (body.zip !== undefined) {
            const zip = body.zip === "" ? null : (0, geo_1.normalizeZip)(body.zip);
            if (body.zip !== "" && !zip)
                throw new authService_1.ValidationError('"zip" must be a 5-digit ZIP code.');
            patch.zip = zip;
            const coords = resolveLatLng(body, zip);
            patch.lat = coords?.lat ?? null;
            patch.lng = coords?.lng ?? null;
        }
        const updated = await store.updateTowingProfile(payload.id, patch);
        if (!updated)
            throw new errors_1.NotFoundError("Business account not found.");
        return publicTowing(updated);
    }
    throw new authService_1.ValidationError("This endpoint serves shop and towing accounts.");
}
