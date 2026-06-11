import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import app from '../src/index'
import { seedUser } from './seed'

interface GoalDTO {
  id: string
  dailyTargets: {
    calories: number
    proteinGrams: number
    carbsGrams: number
    fatGrams: number
    fiberGrams?: number
    sodiumMilligrams?: number
  }
  startDate: string
  endDate: string | null
}

interface GoalResponse {
  goal: GoalDTO | null
}

function authed(token: string, init: RequestInit = {}): RequestInit {
  return { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers } }
}

const TARGETS = { calories: 2200, proteinGrams: 160, carbsGrams: 220, fatGrams: 70, fiberGrams: 30 }

async function createGoal(token: string, body: Record<string, unknown>) {
  return app.request('/v1/goals', authed(token, { method: 'POST', body: JSON.stringify(body) }), env)
}

async function currentGoal(token: string, date: string) {
  return app.request(`/v1/goals/current?date=${date}`, authed(token), env)
}

describe('goals endpoints', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await seedUser(env.DB, 'usr_bob', 'bob-token')
  })

  it('requires auth', async () => {
    expect((await app.request('/v1/goals/current?date=2026-06-10', {}, env)).status).toBe(401)
    expect((await app.request('/v1/goals', { method: 'POST', body: '{}' }, env)).status).toBe(401)
  })

  it('returns null when the user has no goal', async () => {
    const res = await currentGoal('alice-token', '2026-06-10')
    expect(res.status).toBe(200)
    expect((await res.json()) as GoalResponse).toEqual({ goal: null })
  })

  it('rejects missing or invalid dates on GET', async () => {
    for (const qs of ['', '?date=2026-02-30', '?date=June+10', '?date=2026-6-1']) {
      const res = await app.request(`/v1/goals/current${qs}`, authed('alice-token'), env)
      expect(res.status).toBe(422)
    }
  })

  it('creates an open-ended goal and returns it as the active goal', async () => {
    const res = await createGoal('alice-token', { dailyTargets: TARGETS, startDate: '2026-06-01', endDate: null })
    expect(res.status).toBe(201)
    const { goal } = (await res.json()) as GoalResponse
    expect(goal?.dailyTargets).toEqual(TARGETS)
    expect(goal?.startDate).toBe('2026-06-01')
    expect(goal?.endDate).toBeNull()

    const current = (await (await currentGoal('alice-token', '2027-01-01')).json()) as GoalResponse
    expect(current.goal?.id).toBe(goal?.id)

    // Before the start date there is no active goal.
    const before = (await (await currentGoal('alice-token', '2026-05-31')).json()) as GoalResponse
    expect(before.goal).toBeNull()
  })

  it('selects the active goal across date ranges', async () => {
    await createGoal('alice-token', { dailyTargets: TARGETS, startDate: '2026-01-01', endDate: '2026-03-31' })
    const second = (await (
      await createGoal('alice-token', { dailyTargets: { ...TARGETS, calories: 1800 }, startDate: '2026-05-01' })
    ).json()) as GoalResponse

    const inFirst = (await (await currentGoal('alice-token', '2026-02-15')).json()) as GoalResponse
    expect(inFirst.goal?.dailyTargets.calories).toBe(2200)
    expect(inFirst.goal?.endDate).toBe('2026-03-31')

    const inGap = (await (await currentGoal('alice-token', '2026-04-15')).json()) as GoalResponse
    expect(inGap.goal).toBeNull()

    const inSecond = (await (await currentGoal('alice-token', '2026-05-02')).json()) as GoalResponse
    expect(inSecond.goal?.id).toBe(second.goal?.id)
  })

  it('closes an overlapping open goal at the new startDate', async () => {
    const first = (await (
      await createGoal('alice-token', { dailyTargets: TARGETS, startDate: '2026-06-01' })
    ).json()) as GoalResponse
    const second = (await (
      await createGoal('alice-token', { dailyTargets: { ...TARGETS, calories: 1900 }, startDate: '2026-07-01' })
    ).json()) as GoalResponse

    // Old goal still active strictly before the new start, new goal from its start.
    const june = (await (await currentGoal('alice-token', '2026-06-30')).json()) as GoalResponse
    expect(june.goal?.id).toBe(first.goal?.id)
    const july = (await (await currentGoal('alice-token', '2026-07-01')).json()) as GoalResponse
    expect(july.goal?.id).toBe(second.goal?.id)

    const oldRow = await env.DB.prepare('select end_date from goals where id = ?')
      .bind(first.goal?.id)
      .first<{ end_date: string | null }>()
    expect(oldRow?.end_date).toBe('2026-06-30')
  })

  it('does not touch open goals the new goal cannot overlap', async () => {
    const future = (await (
      await createGoal('alice-token', { dailyTargets: TARGETS, startDate: '2026-08-01' })
    ).json()) as GoalResponse
    const res = await createGoal('alice-token', {
      dailyTargets: { ...TARGETS, calories: 2000 },
      startDate: '2026-06-01',
      endDate: '2026-06-15',
    })
    expect(res.status).toBe(201)

    const row = await env.DB.prepare('select end_date from goals where id = ?')
      .bind(future.goal?.id)
      .first<{ end_date: string | null }>()
    expect(row?.end_date).toBeNull()
  })

  it("never reads another user's goal", async () => {
    await createGoal('alice-token', { dailyTargets: TARGETS, startDate: '2026-01-01' })
    const res = (await (await currentGoal('bob-token', '2026-06-10')).json()) as GoalResponse
    expect(res.goal).toBeNull()
  })

  it('derives the goal owner from the session, ignoring client userId', async () => {
    const res = await createGoal('alice-token', { userId: 'usr_bob', dailyTargets: TARGETS, startDate: '2026-06-01' })
    expect(res.status).toBe(201)
    const row = await env.DB.prepare("select user_id from goals where start_date = '2026-06-01'").first<{
      user_id: string
    }>()
    expect(row?.user_id).toBe('usr_alice')
  })

  it('rejects invalid create payloads', async () => {
    const bad: Record<string, unknown>[] = [
      { dailyTargets: TARGETS },
      { dailyTargets: TARGETS, startDate: '2026-02-30' },
      { dailyTargets: TARGETS, startDate: 'June 1' },
      { dailyTargets: TARGETS, startDate: '2026-06-01', endDate: '2026-05-31' },
      { dailyTargets: TARGETS, startDate: '2026-06-01', endDate: 'soon' },
      { startDate: '2026-06-01' },
      { dailyTargets: { ...TARGETS, calories: 0 }, startDate: '2026-06-01' },
      { dailyTargets: { ...TARGETS, proteinGrams: -5 }, startDate: '2026-06-01' },
      { dailyTargets: { ...TARGETS, fiberGrams: 0 }, startDate: '2026-06-01' },
      { dailyTargets: { calories: 2000, proteinGrams: 150, carbsGrams: 200 }, startDate: '2026-06-01' },
    ]
    for (const body of bad) {
      const res = await createGoal('alice-token', body)
      expect(res.status).toBe(422)
    }
  })

  it('shows the created goal on the day log', async () => {
    await createGoal('alice-token', { dailyTargets: TARGETS, startDate: '2026-06-01' })
    const res = await app.request('/v1/logs/day?date=2026-06-10', authed('alice-token'), env)
    const body = (await res.json()) as { goal: { dailyTargets: { calories: number } } | null }
    expect(body.goal?.dailyTargets.calories).toBe(2200)
  })
})
