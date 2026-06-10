import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import app from '../src/index'

describe('GET /health', () => {
  it('returns 200 ok without auth', async () => {
    const res = await app.request('/health', {}, env)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
