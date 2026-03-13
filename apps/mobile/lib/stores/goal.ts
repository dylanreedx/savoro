import { create } from "zustand";
import { api } from "../api";

export type GoalData = {
  id: string;
  calories: number | null;
  protein: number | null;
  carb: number | null;
  fat: number | null;
  fiber: number | null;
  startDate: string;
};

type GoalState = {
  goal: GoalData | null;
  isLoading: boolean;
  isSaving: boolean;

  fetchGoal: () => Promise<void>;
  saveGoal: (values: {
    calories?: number;
    protein?: number;
    carb?: number;
    fat?: number;
    fiber?: number;
  }) => Promise<boolean>;
};

export const useGoalStore = create<GoalState>((set) => ({
  goal: null,
  isLoading: false,
  isSaving: false,

  fetchGoal: async () => {
    set({ isLoading: true });
    try {
      const data = await api<{ goal: GoalData | null }>("/goal/current");
      set({ goal: data.goal, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  saveGoal: async (values) => {
    set({ isSaving: true });
    try {
      const data = await api<{ goal: GoalData }>("/goal", {
        method: "POST",
        body: values,
      });
      set({ goal: data.goal, isSaving: false });
      return true;
    } catch {
      set({ isSaving: false });
      return false;
    }
  },
}));
