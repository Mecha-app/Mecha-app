"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Password hashing (WP5) — bcrypt, cost 12, exactly the legacy scheme
 * (repo auth.js: bcryptjs). Hashes carried over from Mongo by the ETL
 * verify against this module unchanged — users keep their passwords.
 *
 * MECHA_BCRYPT_COST exists ONLY so the automated test-suite can run at
 * a cheap cost; production never sets it.
 */
function cost() {
    const raw = Number(process.env.MECHA_BCRYPT_COST);
    return Number.isInteger(raw) && raw >= 4 && raw <= 14 ? raw : 12;
}
async function hashPassword(plain) {
    return bcryptjs_1.default.hash(plain, cost());
}
async function verifyPassword(plain, hash) {
    try {
        return await bcryptjs_1.default.compare(plain, hash);
    }
    catch {
        return false;
    }
}
