import type { AppleIdentityVerifier } from './lib/apple'

export type AppEnv = {
  Bindings: {
    DB: D1Database
    ENVIRONMENT: string
    APPLE_BUNDLE_ID: string
    APPLE_IDENTITY_VERIFIER?: AppleIdentityVerifier
  }
  Variables: {
    userId: string
  }
}
