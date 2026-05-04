import { hash, verify } from "@node-rs/argon2";
import { createHash, randomBytes } from "node:crypto";
import { encodeBase32LowerCaseNoPadding } from "./encoding";

// ---------------------------------------------------------------------------
// Password hashing (Argon2id)
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  return verify(passwordHash, password);
}

// ---------------------------------------------------------------------------
// Session tokens
// 20-byte random → base32 → SHA-256 hash stored in DB
// ---------------------------------------------------------------------------
export function generateSessionToken(): string {
  const bytes = randomBytes(20);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ---------------------------------------------------------------------------
// Session timing
// ---------------------------------------------------------------------------
const DAY_MS = 86_400_000;

export function sessionExpiresAt(): Date {
  return new Date(Date.now() + 30 * DAY_MS);
}

export function shouldExtendSession(expiresAt: Date): boolean {
  return expiresAt.getTime() - Date.now() < 15 * DAY_MS;
}
