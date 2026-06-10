import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedUser } from './seed'

describe('auth middleware', () => {
  it('rejects requests without a token', async () => {
    const res = await app.request('/v1/logs/day?date=2026-06-10', {}, env)
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('unauthorized')
  })

  it('rejects requests with an unknown token', async () => {
    const res = await app.request(
      '/v1/logs/day?date=2026-06-10',
      { headers: { Authorization: 'Bearer not-a-real-token' } },
      env,
    )
    expect(res.status).toBe(401)
  })

  it('accepts a seeded session token', async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    const res = await app.request(
      '/v1/logs/day?date=2026-06-10',
      { headers: { Authorization: 'Bearer alice-token' } },
      env,
    )
    expect(res.status).toBe(200)
  })
})
