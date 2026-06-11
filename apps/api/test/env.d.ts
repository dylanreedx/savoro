import type { D1Migration } from '@cloudflare/vitest-pool-workers/config'
import type { AppleIdentityVerifier } from '../src/lib/apple'

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database
    ENVIRONMENT: string
    APPLE_BUNDLE_ID: string
    APPLE_IDENTITY_VERIFIER?: AppleIdentityVerifier
    TEST_MIGRATIONS: D1Migration[]
  }
}
