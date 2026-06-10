import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm'
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
