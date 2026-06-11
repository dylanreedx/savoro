import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import app from '../src/index'
import { hashToken } from '../src/token'

function appleEnv(verifier: NonNullable<(typeof env)['APPLE_IDENTITY_VERIFIER']>) {
  return { ...env, APPLE_BUNDLE_ID: 'com.savoro.test', APPLE_IDENTITY_VERIFIER: verifier }
}

describe('POST /v1/auth/apple', () => {
  it('validates the identity token body', async () => {
    const res = await app.request('/v1/auth/apple', { method: 'POST', body: JSON.stringify({}) }, env)
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('validation_failed')
  })

  it('rejects invalid Apple identity tokens', async () => {
    const res = await app.request(
      '/v1/auth/apple',
      { method: 'POST', body: JSON.stringify({ identityToken: 'bad-token' }) },
      appleEnv(async () => {
        throw new Error('bad token')
      }),
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('unauthorized')
  })

  it('creates a user and hashed session for a new Apple subject', async () => {
    const res = await app.request(
      '/v1/auth/apple',
      { method: 'POST', body: JSON.stringify({ identityToken: 'new-user-token' }) },
      appleEnv(async (identityToken, bundleId) => {
        expect(identityToken).toBe('new-user-token')
        expect(bundleId).toBe('com.savoro.test')
        return { sub: 'apple_new_user', email: 'relay-new@privaterelay.appleid.com' }
      }),
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { sessionToken: string; user: { id: string; email: string; displayName: null } }
    expect(body.sessionToken).toMatch(/^[0-9a-f]{64}$/)
    expect(body.user.email).toBe('relay-new@privaterelay.appleid.com')
    expect(body.user.displayName).toBeNull()
    expect(JSON.stringify(body)).not.toContain('apple_new_user')

    const userRow = await env.DB.prepare('select id, apple_sub, email from users where apple_sub = ?')
      .bind('apple_new_user')
      .first<{ id: string; apple_sub: string; email: string }>()
    expect(userRow).toMatchObject({ id: body.user.id, apple_sub: 'apple_new_user', email: body.user.email })

    const tokenHash = await hashToken(body.sessionToken)
    const sessionRow = await env.DB.prepare('select user_id, token_hash from sessions where token_hash = ?')
      .bind(tokenHash)
      .first<{ user_id: string; token_hash: string }>()
    expect(sessionRow).toMatchObject({ user_id: body.user.id, token_hash: tokenHash })
    expect(sessionRow?.token_hash).not.toBe(body.sessionToken)
  })

  it('reuses the user for a returning Apple subject and issues a working session token', async () => {
    const first = await app.request(
      '/v1/auth/apple',
      { method: 'POST', body: JSON.stringify({ identityToken: 'returning-1' }) },
      appleEnv(async () => ({ sub: 'apple_returning_user', email: 'first@example.com' })),
    )
    expect(first.status).toBe(200)
    const firstBody = (await first.json()) as { user: { id: string } }

    const second = await app.request(
      '/v1/auth/apple',
      { method: 'POST', body: JSON.stringify({ identityToken: 'returning-2' }) },
      appleEnv(async () => ({ sub: 'apple_returning_user', email: 'second@example.com' })),
    )
    expect(second.status).toBe(200)
    const secondBody = (await second.json()) as { sessionToken: string; user: { id: string; email: string } }
    expect(secondBody.user.id).toBe(firstBody.user.id)
    expect(secondBody.user.email).toBe('second@example.com')

    const day = await app.request(
      '/v1/logs/day?date=2026-06-10',
      { headers: { Authorization: `Bearer ${secondBody.sessionToken}` } },
      env,
    )
    expect(day.status).toBe(200)
  })
})
