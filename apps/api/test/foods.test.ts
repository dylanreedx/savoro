import { env } from 'cloudflare:test'
import { beforeEach, describe, expect, it } from 'vitest'
import foodsFixtureSql from '../seed/foods-fixture.sql?raw'
import app from '../src/index'
import { seedUser } from './seed'

interface MacroTotalsDTO {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams?: number
  sodiumMilligrams?: number
}

interface FoodSummaryDTO {
  id: string
  name: string
  brand: string | null
  category: string | null
  source: 'usda'
  sourceId: string
  nutritionBasis: 'per_100g'
  per100gMacros: MacroTotalsDTO
}

interface FoodServingDTO {
  id: string
  description: string
  gramWeight: number
  isDefault: boolean
  nutritionBasis: 'per_serving'
  perServingMacros: MacroTotalsDTO
}

interface FoodSearchResponse {
  query: string
  items: FoodSummaryDTO[]
  nextCursor: string | null
}

interface FoodDetailResponse {
  food: FoodSummaryDTO & { servings: FoodServingDTO[] }
}

function authed(token = 'alice-token'): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } }
}

async function search(query: string): Promise<Response> {
  return app.request(`/v1/foods/search?${query}`, authed(), env)
}

describe('USDA food search and detail', () => {
  beforeEach(async () => {
    await seedUser(env.DB, 'usr_alice', 'alice-token')
    await env.DB.exec(foodsFixtureSql.replace(/^--.*$/gm, '').replace(/\s+/g, ' '))
  })

  it('requires authentication for search and detail', async () => {
    expect((await app.request('/v1/foods/search?q=chicken', {}, env)).status).toBe(401)
    expect((await app.request('/v1/foods/food_fixture_chicken_breast', {}, env)).status).toBe(401)
  })

  it('rejects a missing, empty, or whitespace-only query with 422', async () => {
    for (const query of ['', 'q=', 'q=%20%20%20']) {
      const response = await search(query)
      expect(response.status, query).toBe(422)
      expect(await response.json()).toMatchObject({ error: { code: 'validation_failed' } })
    }
  })

  it('matches food names with a case-insensitive LIKE search', async () => {
    const response = await search('q=ChIcKeN')
    expect(response.status).toBe(200)
    const body = (await response.json()) as FoodSearchResponse
    expect(body.query).toBe('ChIcKeN')
    expect(body.items.map((item) => item.id)).toEqual(['food_fixture_chicken_breast'])
  })

  it('paginates matching foods with an opaque cursor and no duplicates', async () => {
    const firstResponse = await search('q=raw&limit=2')
    expect(firstResponse.status).toBe(200)
    const first = (await firstResponse.json()) as FoodSearchResponse
    expect(first.items.map((item) => item.id)).toEqual([
      'food_fixture_almonds',
      'food_fixture_avocado',
    ])
    expect(first.nextCursor).toEqual(expect.any(String))

    const secondResponse = await search(`q=raw&limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`)
    expect(secondResponse.status).toBe(200)
    const second = (await secondResponse.json()) as FoodSearchResponse
    expect(second.items.map((item) => item.id)).toEqual([
      'food_fixture_banana',
      'food_fixture_broccoli',
    ])
    expect(second.nextCursor).toBeNull()
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(4)
  })

  it('returns an explicit per-100g nutrition DTO from search', async () => {
    const response = await search('q=chicken')
    expect(response.status).toBe(200)
    const [food] = ((await response.json()) as FoodSearchResponse).items
    expect(food).toEqual({
      id: 'food_fixture_chicken_breast',
      name: 'Chicken, broilers or fryers, breast, meat only, roasted',
      brand: null,
      category: 'Poultry Products',
      source: 'usda',
      sourceId: 'fixture-chicken-breast',
      nutritionBasis: 'per_100g',
      per100gMacros: {
        calories: 165,
        proteinGrams: 31.02,
        carbsGrams: 0,
        fatGrams: 3.57,
        fiberGrams: 0,
        sodiumMilligrams: 74,
      },
    })
    expect(food).not.toHaveProperty('macros')
  })

  it('returns food detail with gram-weighted servings and explicit per-serving macros', async () => {
    const response = await app.request('/v1/foods/food_fixture_chicken_breast', authed(), env)
    expect(response.status).toBe(200)
    const { food } = (await response.json()) as FoodDetailResponse
    expect(food.id).toBe('food_fixture_chicken_breast')
    expect(food.nutritionBasis).toBe('per_100g')
    expect(food.servings).toEqual([
      {
        id: 'fsv_fixture_chicken_breast_100g',
        description: '100 g',
        gramWeight: 100,
        isDefault: true,
        nutritionBasis: 'per_serving',
        perServingMacros: {
          calories: 165,
          proteinGrams: 31.02,
          carbsGrams: 0,
          fatGrams: 3.57,
          fiberGrams: 0,
          sodiumMilligrams: 74,
        },
      },
      {
        id: 'fsv_fixture_chicken_breast_piece',
        description: '1 breast',
        gramWeight: 172,
        isDefault: false,
        nutritionBasis: 'per_serving',
        perServingMacros: {
          calories: 283.8,
          proteinGrams: 53.3544,
          carbsGrams: 0,
          fatGrams: 6.1404,
          fiberGrams: 0,
          sodiumMilligrams: 127.28,
        },
      },
    ])
  })

  it('returns 404 for an unknown food id', async () => {
    const response = await app.request('/v1/foods/food_missing', authed(), env)
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ error: { code: 'not_found' } })
  })
})
