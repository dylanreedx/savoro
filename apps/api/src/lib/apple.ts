import { createRemoteJWKSet, jwtVerify } from 'jose'

const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys')
const APPLE_ISSUER = 'https://appleid.apple.com'
const appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL)

export type AppleTokenClaims = {
  sub: string
  email: string
}

export type AppleIdentityVerifier = (identityToken: string, bundleId: string) => Promise<AppleTokenClaims>

export const verifyAppleIdentityToken: AppleIdentityVerifier = async (identityToken, bundleId) => {
  const { payload } = await jwtVerify(identityToken, appleJWKS, {
    issuer: APPLE_ISSUER,
    audience: bundleId,
  })

  if (!payload.sub || typeof payload.email !== 'string') {
    throw new Error('Apple identity token missing required claims.')
  }

  return { sub: payload.sub, email: payload.email }
}
