"use strict";
/**
 * Coarse per-instance, per-IP fixed-window rate limiting (security pass).
 *
 * The durable abuse controls in this app are structural — the
 * per-account free-diagnosis quota (consumed atomically before any paid
 * call) and bcrypt's cost for password checks. This limiter is the
 * second, deliberately rough layer for the unauthenticated surfaces
 * (sign-in, registration): serverless instances are per-process, so the
 * counts are per-instance, not global. It exists to blunt casual
 * credential-stuffing and signup spam, not to be a precise quota.
 *
 * (The /api/diagnose route keeps its WP5 limiter of the same shape;
 * new unauthenticated routes should use this module.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientIp = clientIp;
exports.createRateLimiter = createRateLimiter;
function clientIp(request) {
    return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
function createRateLimiter(options) {
    const { windowMs, max } = options;
    const hits = new Map();
    return {
        limited(request) {
            const ip = clientIp(request);
            const now = Date.now();
            // Light sweep so a long-lived instance does not accumulate
            // entries forever; correctness does not depend on it.
            if (hits.size > 5000) {
                for (const [key, entry] of hits) {
                    if (now - entry.windowStart > windowMs)
                        hits.delete(key);
                }
            }
            const entry = hits.get(ip);
            if (!entry || now - entry.windowStart > windowMs) {
                hits.set(ip, { count: 1, windowStart: now });
                return false;
            }
            entry.count += 1;
            return entry.count > max;
        },
    };
}
