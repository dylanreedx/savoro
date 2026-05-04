import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
  sessionExpiresAt,
  shouldExtendSession,
} from "../lib/auth";
import { encodeBase32LowerCaseNoPadding } from "../lib/encoding";

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const password = "testpassword123";
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(await verifyPassword(hashed, password)).toBe(true);
    expect(await verifyPassword(hashed, "wrongpassword")).toBe(false);
  });
});

describe("session tokens", () => {
  it("generates a base32 token", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[a-z2-7]+$/);
    expect(token.length).toBe(32); // 20 bytes → 32 base32 chars
  });

  it("hashes token to hex string", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("same token produces same hash", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("different tokens produce different hashes", () => {
    const t1 = generateSessionToken();
    const t2 = generateSessionToken();
    expect(hashSessionToken(t1)).not.toBe(hashSessionToken(t2));
  });
});

describe("session timing", () => {
  it("expires 30 days from now", () => {
    const expires = sessionExpiresAt();
    const diff = expires.getTime() - Date.now();
    const days = diff / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it("should extend when within 15 days of expiry", () => {
    const within15 = new Date(Date.now() + 14 * 86_400_000);
    expect(shouldExtendSession(within15)).toBe(true);
  });

  it("should NOT extend when more than 15 days from expiry", () => {
    const beyond15 = new Date(Date.now() + 16 * 86_400_000);
    expect(shouldExtendSession(beyond15)).toBe(false);
  });
});

describe("base32 encoding", () => {
  it("encodes bytes correctly", () => {
    const result = encodeBase32LowerCaseNoPadding(new Uint8Array([0xff, 0x00]));
    expect(result).toMatch(/^[a-z2-7]+$/);
  });

  it("encodes 20 bytes to 32 chars", () => {
    const bytes = new Uint8Array(20);
    bytes.fill(0xab);
    const encoded = encodeBase32LowerCaseNoPadding(bytes);
    expect(encoded.length).toBe(32);
  });
});
