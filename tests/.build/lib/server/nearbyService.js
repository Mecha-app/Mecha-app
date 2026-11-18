"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEARBY_DEFAULT_RADIUS = void 0;
exports.nearbyHeadline = nearbyHeadline;
exports.searchNearby = searchNearby;
const authService_1 = require("./authService");
const geo_1 = require("./geo");
exports.NEARBY_DEFAULT_RADIUS = {
    shops: 25,
    towing: 30,
};
function nearbyHeadline(kind, count, radiusMi) {
    const noun = kind === "shops" ? "shop" : "towing company";
    const plural = kind === "shops" ? "shops" : "towing companies";
    if (count === 0)
        return `No ${plural} within ${radiusMi} miles — try widening the search.`;
    if (count === 1)
        return `1 ${noun} near you`;
    return `${count} ${plural} near you`;
}
async function searchNearby(store, input) {
    let origin = null;
    const lat = typeof input.lat === "number" ? input.lat : Number(input.lat);
    const lng = typeof input.lng === "number" ? input.lng : Number(input.lng);
    if ((0, geo_1.isValidLatLng)(lat, lng)) {
        origin = { lat, lng, source: "device", zip: null };
    }
    else if (input.zip !== undefined && input.zip !== "") {
        const zip = (0, geo_1.normalizeZip)(input.zip);
        if (!zip)
            throw new authService_1.ValidationError('"zip" must be a 5-digit ZIP code.');
        const centroid = (0, geo_1.zipCentroid)(zip);
        if (!centroid) {
            throw new authService_1.ValidationError("That ZIP code isn't in our table yet — use “Near me” so the app can take your location instead.");
        }
        origin = { ...centroid, source: "zip", zip };
    }
    if (!origin) {
        throw new authService_1.ValidationError("Give a ZIP code, or share your location, so we can find who's near you.");
    }
    const radiusRaw = typeof input.radiusMi === "number" ? input.radiusMi : Number(input.radiusMi);
    const radiusMi = Number.isFinite(radiusRaw)
        ? Math.min(100, Math.max(1, radiusRaw))
        : exports.NEARBY_DEFAULT_RADIUS[input.kind];
    const found = input.kind === "shops"
        ? await store.nearbyShops(origin, radiusMi, 50)
        : await store.nearbyTowing(origin, radiusMi, 50);
    const results = found.map((b) => ({
        ...b,
        distanceMi: Math.round(b.distanceMi * 10) / 10,
        distanceLabel: (0, geo_1.formatMiles)(b.distanceMi),
    }));
    return {
        kind: input.kind,
        origin,
        radiusMi,
        count: results.length,
        headline: nearbyHeadline(input.kind, results.length, radiusMi),
        results,
    };
}
