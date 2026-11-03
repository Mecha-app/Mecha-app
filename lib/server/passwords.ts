import bcrypt from "bcryptjs";

/**
 * Password hashing (WP5) — bcrypt, cost 12, exactly the legacy scheme
 * (repo auth.js: bcryptjs). Hashes carried over from Mongo by the ETL
 * verify against this module unchanged — users keep their passwords.
 *
 * MECHA_BCRYPT_COST exists ONLY so the automated test-suite can run at
 * a cheap cost; production never sets it.
 */

function cost(): number {
  const raw = Number(process.env.MECHA_BCRYPT_COST);
  return Number.isInteger(raw) && raw >= 4 && raw <= 14 ? raw : 12;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, cost());
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
