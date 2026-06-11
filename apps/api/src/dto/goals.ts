import type { GoalRow } from '../db/schema'

// Goal DTO per docs/api-contract.md GET /v1/goals/current / POST /v1/goals.
// Scoped to the session user only; never embedded in any public DTO.

export function mapGoal(goal: GoalRow) {
  return {
    id: goal.id,
    dailyTargets: {
      calories: goal.calories,
      proteinGrams: goal.proteinGrams,
      carbsGrams: goal.carbsGrams,
      fatGrams: goal.fatGrams,
      ...(goal.fiberGrams !== null && { fiberGrams: goal.fiberGrams }),
      ...(goal.sodiumMilligrams !== null && { sodiumMilligrams: goal.sodiumMilligrams }),
    },
    startDate: goal.startDate,
    endDate: goal.endDate,
  }
}
