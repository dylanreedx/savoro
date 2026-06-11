import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { previousCalendarDay } from '../dates'
import type { Db } from '../db/client'
import { goals, type GoalRow } from '../db/schema'

/** The user's goal active on the given date, or null. */
export async function getActiveGoal(db: Db, userId: string, date: string): Promise<GoalRow | null> {
  const row = await db.query.goals.findFirst({
    where: and(
      eq(goals.userId, userId),
      lte(goals.startDate, date),
      or(isNull(goals.endDate), gte(goals.endDate, date)),
    ),
    orderBy: [desc(goals.startDate)],
  })
  return row ?? null
}

export interface CreateGoalInput {
  calories: number
  proteinGrams: number
  carbsGrams: number
  fatGrams: number
  fiberGrams: number | null
  sodiumMilligrams: number | null
  startDate: string
  endDate: string | null
}

/**
 * Creates a goal for the user. Open goals that the new goal's range overlaps
 * are closed the day before the new startDate, so at most one goal is active
 * on any date going forward.
 */
export async function createGoal(db: Db, userId: string, input: CreateGoalInput): Promise<GoalRow> {
  const now = new Date().toISOString()
  const id = `goal_${crypto.randomUUID()}`

  // An open goal [start, ∞) overlaps the new [startDate, endDate?] range
  // unless the new goal ends before the open goal starts.
  const overlappingOpen = await db.query.goals.findMany({
    where: and(
      eq(goals.userId, userId),
      isNull(goals.endDate),
      ...(input.endDate === null ? [] : [lte(goals.startDate, input.endDate)]),
    ),
    columns: { id: true },
  })

  const closeAt = previousCalendarDay(input.startDate)
  const ops: BatchItem<'sqlite'>[] = [
    db.insert(goals).values({
      id,
      userId,
      calories: input.calories,
      proteinGrams: input.proteinGrams,
      carbsGrams: input.carbsGrams,
      fatGrams: input.fatGrams,
      fiberGrams: input.fiberGrams,
      sodiumMilligrams: input.sodiumMilligrams,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: now,
      updatedAt: now,
    }),
    ...overlappingOpen.map((g) =>
      db.update(goals).set({ endDate: closeAt, updatedAt: now }).where(eq(goals.id, g.id)),
    ),
  ]
  await db.batch(ops as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])

  const row = await db.query.goals.findFirst({ where: and(eq(goals.id, id), eq(goals.userId, userId)) })
  if (!row) throw new Error('goal insert failed')
  return row
}
