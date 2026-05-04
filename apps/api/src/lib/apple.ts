import { createRemoteJWKSet, jwtVerify } from "jose";

// ---------------------------------------------------------------------------
// Apple Sign-In token verification
// ---------------------------------------------------------------------------
const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");
const APPLE_ISSUER = "https://appleid.apple.com";

const appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL);

export type AppleTokenClaims = {
  /** Apple's unique user identifier (stable across sign-ins) */
  sub: string;
  /** User's email (may be a relay address for Hide My Email) */
  email: string;
  /** Whether the email has been verified by Apple */
  email_verified: boolean | string;
  /** Whether this is a private relay email */
  is_private_email: boolean | string;
};

/**
 * Verify an Apple identity token using Apple's public JWKS endpoint.
 * Returns the decoded claims if valid, throws on failure.
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  bundleId: string,
): Promise<AppleTokenClaims> {
  const { payload } = await jwtVerify(identityToken, appleJWKS, {
    issuer: APPLE_ISSUER,
    audience: bundleId,
  });

  const sub = payload.sub;
  const email = payload.email as string | undefined;

  if (!sub || !email) {
    throw new Error("Apple identity token missing required claims (sub, email)");
  }

  return {
    sub,
    email,
    email_verified: payload.email_verified as boolean | string,
    is_private_email: payload.is_private_email as boolean | string,
  };
}
