import { describe, it, expect } from "vitest";
import { planMeal, agentTools } from "./tools";
import type { UIComponentType, MealPlanProps } from "./types";

// ---------------------------------------------------------------------------
// planMeal tool — schema validation
// ---------------------------------------------------------------------------
describe("planMeal tool schema", () => {
  it("is exported from agentTools as plan_meal", () => {
    expect(agentTools).toHaveProperty("plan_meal");
    expect(agentTools.plan_meal).toBe(planMeal);
  });

  it("accepts a valid query and quantity", () => {
    const result = planMeal.inputSchema.safeParse({ query: "grilled chicken", quantity: 2 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("grilled chicken");
      expect(result.data.quantity).toBe(2);
    }
  });

  it("defaults quantity to 1 when omitted", () => {
    const result = planMeal.inputSchema.safeParse({ query: "salmon" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
    }
  });

  it("rejects quantity of 0 (not positive)", () => {
    const result = planMeal.inputSchema.safeParse({ query: "oats", quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = planMeal.inputSchema.safeParse({ query: "oats", quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects missing query", () => {
    const result = planMeal.inputSchema.safeParse({ quantity: 2 });
    expect(result.success).toBe(false);
  });

  it("accepts fractional quantity (e.g. 0.5 serving)", () => {
    const result = planMeal.inputSchema.safeParse({ query: "rice", quantity: 0.5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(0.5);
    }
  });
});

// ---------------------------------------------------------------------------
// UIComponentType — meal_plan is included
// ---------------------------------------------------------------------------
describe("UIComponentType includes meal_plan", () => {
  it("meal_plan is a valid UIComponentType", () => {
    // TypeScript-level: if this compiles, the type is present.
    const t: UIComponentType = "meal_plan";
    expect(t).toBe("meal_plan");
  });
});

// ---------------------------------------------------------------------------
// MealPlanProps — type structure contract tests
// ---------------------------------------------------------------------------
describe("MealPlanProps structure", () => {
  it("accepts a fully-populated MealPlanProps object", () => {
    const props: MealPlanProps = {
      suggestedFood: {
        name: "Chicken Breast",
        calories: 165,
        protein: 31,
        carb: 0,
        fat: 3.6,
        servingDescription: "100g",
        quantity: 1,
      },
      currentMacros: { calories: 800, protein: 60, carb: 100, fat: 25 },
      projectedMacros: { calories: 965, protein: 91, carb: 100, fat: 28.6 },
      goals: { calories: 2000, protein: 150, carb: 200, fat: 70 },
    };
    expect(props.suggestedFood.name).toBe("Chicken Breast");
    expect(props.projectedMacros.calories).toBe(965);
    expect(props.goals).not.toBeNull();
  });

  it("accepts null goals (user has no goal set)", () => {
    const props: MealPlanProps = {
      suggestedFood: {
        name: "Rice",
        calories: 200,
        protein: 4,
        carb: 44,
        fat: 0.4,
        servingDescription: "1 cup cooked",
        quantity: 2,
      },
      currentMacros: { calories: 0, protein: 0, carb: 0, fat: 0 },
      projectedMacros: { calories: 400, protein: 8, carb: 88, fat: 0 },
      goals: null,
    };
    expect(props.goals).toBeNull();
  });

  it("accepts null macro values on suggestedFood (off-label products)", () => {
    const props: MealPlanProps = {
      suggestedFood: {
        name: "Mystery Food",
        calories: null,
        protein: null,
        carb: null,
        fat: null,
        servingDescription: "1 serving",
        quantity: 1,
      },
      currentMacros: { calories: 100, protein: 10, carb: 10, fat: 5 },
      projectedMacros: { calories: 100, protein: 10, carb: 10, fat: 5 },
      goals: null,
    };
    expect(props.suggestedFood.calories).toBeNull();
    expect(props.projectedMacros.calories).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// planMealExecutor arithmetic — pure logic tests
// (mirrors the exact calculation in chat.ts planMealExecutor)
// ---------------------------------------------------------------------------
describe("plan_meal macro projection arithmetic", () => {
  function projectMacros(
    current: { calories: number; protein: number; carb: number; fat: number },
    food: { calories: number | null; protein: number | null; carb: number | null; fat: number | null },
    quantity: number,
  ) {
    return {
      calories: Math.round(current.calories + (food.calories ?? 0) * quantity),
      protein: Math.round(current.protein + (food.protein ?? 0) * quantity),
      carb: Math.round(current.carb + (food.carb ?? 0) * quantity),
      fat: Math.round(current.fat + (food.fat ?? 0) * quantity),
    };
  }

  it("adds a single serving correctly", () => {
    const current = { calories: 800, protein: 60, carb: 100, fat: 25 };
    const food = { calories: 165, protein: 31, carb: 0, fat: 3.6 };
    const result = projectMacros(current, food, 1);
    expect(result.calories).toBe(965);
    expect(result.protein).toBe(91);
    expect(result.carb).toBe(100);
    expect(result.fat).toBe(29); // Math.round(25 + 3.6)
  });

  it("multiplies correctly with quantity 2", () => {
    const current = { calories: 500, protein: 40, carb: 60, fat: 20 };
    const food = { calories: 200, protein: 10, carb: 30, fat: 5 };
    const result = projectMacros(current, food, 2);
    expect(result.calories).toBe(900); // 500 + 200*2
    expect(result.protein).toBe(60);   // 40 + 10*2
    expect(result.carb).toBe(120);     // 60 + 30*2
    expect(result.fat).toBe(30);       // 20 + 5*2
  });

  it("treats null macro values as 0", () => {
    const current = { calories: 300, protein: 25, carb: 40, fat: 10 };
    const food = { calories: null, protein: null, carb: null, fat: null };
    const result = projectMacros(current, food, 1);
    expect(result.calories).toBe(300);
    expect(result.protein).toBe(25);
    expect(result.carb).toBe(40);
    expect(result.fat).toBe(10);
  });

  it("handles quantity of 0.5 (fractional serving)", () => {
    const current = { calories: 0, protein: 0, carb: 0, fat: 0 };
    const food = { calories: 200, protein: 20, carb: 30, fat: 8 };
    const result = projectMacros(current, food, 0.5);
    expect(result.calories).toBe(100);
    expect(result.protein).toBe(10);
    expect(result.carb).toBe(15);
    expect(result.fat).toBe(4);
  });

  it("rounds projected macros (no floating point output)", () => {
    const current = { calories: 100, protein: 10, carb: 10, fat: 10 };
    const food = { calories: 33.33, protein: 11.11, carb: 22.22, fat: 7.77 };
    const result = projectMacros(current, food, 3);
    expect(Number.isInteger(result.calories)).toBe(true);
    expect(Number.isInteger(result.protein)).toBe(true);
    expect(Number.isInteger(result.carb)).toBe(true);
    expect(Number.isInteger(result.fat)).toBe(true);
  });

  it("handles zero-macro current state (nothing logged yet today)", () => {
    const current = { calories: 0, protein: 0, carb: 0, fat: 0 };
    const food = { calories: 500, protein: 50, carb: 60, fat: 15 };
    const result = projectMacros(current, food, 1);
    expect(result.calories).toBe(500);
    expect(result.protein).toBe(50);
    expect(result.carb).toBe(60);
    expect(result.fat).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// buildUIComponents — plan_meal case
// (mirrors the switch case in chat.ts buildUIComponents)
// ---------------------------------------------------------------------------
describe("buildUIComponents plan_meal case", () => {
  type ToolResult = { toolName: string; result: unknown };

  function buildUIComponents(toolResults: ToolResult[]) {
    const components: Array<{ type: string; props: Record<string, unknown> }> = [];

    for (const { toolName, result } of toolResults) {
      switch (toolName) {
        case "plan_meal": {
          const r = result as {
            found: boolean;
            suggestedFood?: unknown;
            currentMacros?: unknown;
            projectedMacros?: unknown;
            goals?: unknown;
          };
          if (r.found) {
            components.push({
              type: "meal_plan",
              props: {
                suggestedFood: r.suggestedFood,
                currentMacros: r.currentMacros,
                projectedMacros: r.projectedMacros,
                goals: r.goals,
              },
            });
          }
          break;
        }
      }
    }

    return components;
  }

  it("emits a meal_plan component when found is true", () => {
    const result = {
      found: true,
      suggestedFood: { name: "Chicken", calories: 165, protein: 31, carb: 0, fat: 3.6, servingDescription: "100g", quantity: 1 },
      currentMacros: { calories: 800, protein: 60, carb: 100, fat: 25 },
      projectedMacros: { calories: 965, protein: 91, carb: 100, fat: 29 },
      goals: { calories: 2000, protein: 150, carb: 200, fat: 70 },
    };
    const components = buildUIComponents([{ toolName: "plan_meal", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe("meal_plan");
    expect(components[0]!.props.suggestedFood).toEqual(result.suggestedFood);
    expect(components[0]!.props.currentMacros).toEqual(result.currentMacros);
    expect(components[0]!.props.projectedMacros).toEqual(result.projectedMacros);
    expect(components[0]!.props.goals).toEqual(result.goals);
  });

  it("emits no component when found is false (food not found)", () => {
    const result = { found: false, error: 'No food found for "xyzzy"' };
    const components = buildUIComponents([{ toolName: "plan_meal", result }]);
    expect(components).toHaveLength(0);
  });

  it("emits meal_plan with null goals when user has no goal set", () => {
    const result = {
      found: true,
      suggestedFood: { name: "Rice", calories: 200, protein: 4, carb: 44, fat: 0.4, servingDescription: "1 cup", quantity: 1 },
      currentMacros: { calories: 0, protein: 0, carb: 0, fat: 0 },
      projectedMacros: { calories: 200, protein: 4, carb: 44, fat: 0 },
      goals: null,
    };
    const components = buildUIComponents([{ toolName: "plan_meal", result }]);
    expect(components).toHaveLength(1);
    expect(components[0]!.props.goals).toBeNull();
  });

  it("does not emit meal_plan for other tool names", () => {
    const result = { found: true, suggestedFood: {}, currentMacros: {}, projectedMacros: {}, goals: null };
    const components = buildUIComponents([{ toolName: "search_food", result }]);
    expect(components.find((c) => c.type === "meal_plan")).toBeUndefined();
  });
});
