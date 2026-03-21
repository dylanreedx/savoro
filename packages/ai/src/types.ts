/**
 * Shared types for the Savoro AI agent.
 */

/** UI component types that can be rendered inline in chat */
export type UIComponentType =
  | "food_card"
  | "macro_summary"
  | "confirm_button"
  | "food_list"
  | "quick_log_chips"
  | "daily_snapshot"
  | "recipe_card"
  | "recipe_detail"
  | "recipe_create"
  | "meal_plan"
  | "suggestion_card";

export type UIComponent = {
  type: UIComponentType;
  props: Record<string, unknown>;
};

export type FoodCardProps = {
  foodId: string;
  name: string;
  brandName: string | null;
  servingId: string;
  servingDescription: string;
  calories: number | null;
  protein: number | null;
  carb: number | null;
  fat: number | null;
  quantity: number;
};

export type MacroSummaryProps = {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  goals: {
    calories: number | null;
    protein: number | null;
    carb: number | null;
    fat: number | null;
  } | null;
};

export type FoodListProps = {
  foods: Array<{
    foodId: string;
    name: string;
    brandName: string | null;
    servingId: string;
    servingDescription: string;
    calories: number | null;
    protein: number | null;
    carb: number | null;
    fat: number | null;
  }>;
};

export type QuickLogChipsProps = {
  foods: Array<{
    foodId: string;
    servingId: string;
    name: string;
    calories: number | null;
  }>;
};

export type ConfirmButtonProps = {
  action: "log_food";
  foodId: string;
  servingId: string;
  quantity: number;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  label: string;
};

export type MealPlanProps = {
  suggestedFood: {
    name: string;
    calories: number | null;
    protein: number | null;
    carb: number | null;
    fat: number | null;
    servingDescription: string;
    quantity: number;
  };
  currentMacros: { calories: number; protein: number; carb: number; fat: number };
  projectedMacros: { calories: number; protein: number; carb: number; fat: number };
  goals: {
    calories: number | null;
    protein: number | null;
    carb: number | null;
    fat: number | null;
  } | null;
};

export type MacroShortfall = {
  macro: "protein" | "carbs" | "fat";
  amount: number;
  unit: "g";
};

export type SuggestionItem = {
  id: string;
  label: string;
  subtitle?: string;
  calories?: number | null;
  protein?: number | null;
  food_id?: string | null;
  recipe_id?: string | null;
};

export type SuggestionCardProps = {
  suggestions: SuggestionItem[];
  shortfall?: MacroShortfall | null;
};

export type SuggestFoodsResult =
  | { found: false; reason: "no_goals" | "goals_met" }
  | { found: true; shortfall: MacroShortfall; suggestions: SuggestionItem[] };

/** Tool call result types */
export type SearchFoodResult = {
  foods: Array<{
    id: string;
    name: string;
    brandName: string | null;
    serving: {
      id: string;
      description: string;
      calories: number | null;
      protein: number | null;
      carb: number | null;
      fat: number | null;
    } | null;
  }>;
};
