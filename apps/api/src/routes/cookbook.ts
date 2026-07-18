import { Hono } from 'hono'
import type { AppEnv } from '../app-env'
import { createDb } from '../db/client'
import { requireAuth } from '../middleware/auth'
import {
  listDraftRecipes,
  listOwnedRecipes,
  listSavedRecipes,
} from '../repo/recipes'
import { mapRecipePage, parseRecipeListOptions } from './recipe-list'

export const cookbook = new Hono<AppEnv>()

cookbook.use('*', requireAuth)

cookbook.get('/mine', async (c) => {
  const userId = c.get('userId')
  const page = await listOwnedRecipes(
    createDb(c.env.DB),
    userId,
    parseRecipeListOptions(c.req.query('limit'), c.req.query('cursor')),
  )
  return c.json(mapRecipePage(page, userId))
})

cookbook.get('/saved', async (c) => {
  const userId = c.get('userId')
  const page = await listSavedRecipes(
    createDb(c.env.DB),
    userId,
    parseRecipeListOptions(c.req.query('limit'), c.req.query('cursor')),
  )
  return c.json(mapRecipePage(page, userId))
})

cookbook.get('/drafts', async (c) => {
  const userId = c.get('userId')
  const page = await listDraftRecipes(
    createDb(c.env.DB),
    userId,
    parseRecipeListOptions(c.req.query('limit'), c.req.query('cursor')),
  )
  return c.json(mapRecipePage(page, userId))
})
