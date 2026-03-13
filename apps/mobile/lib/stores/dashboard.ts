import { create } from "zustand";
import { api, ApiError } from "../api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MacroTotals = {
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

export type MacroGoals = {
  calories: number | null;
  protein: number | null;
  carb: number | null;
  fat: number | null;
};

export type LogEntry = {
  id: string;
  foodName: string;
  brandName: string | null;
  servingDescription: string;
  quantity: number;
  meal: string;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
type DashboardState = {
  date: string;
  totals: MacroTotals;
  goals: MacroGoals;
  entries: LogEntry[];
  isLoading: boolean;
  error: string | null;

  fetchDashboard: (date?: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setDate: (date: string) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export const useDashboardStore = create<DashboardState>((set, get) => ({
  date: today(),
  totals: { calories: 0, protein: 0, carb: 0, fat: 0 },
  goals: { calories: null, protein: null, carb: null, fat: null },
  entries: [],
  isLoading: false,
  error: null,

  fetchDashboard: async (date?: string) => {
    const d = date ?? get().date;
    set({ isLoading: true, error: null });

    try {
      const [logData, entriesData] = await Promise.all([
        api<{ totals: MacroTotals; goals: MacroGoals | null }>(
          `/log?date=${d}`,
        ),
        api<{ entries: LogEntry[] }>(`/log/entries?date=${d}`),
      ]);

      set({
        totals: logData.totals,
        goals: logData.goals ?? {
          calories: null,
          protein: null,
          carb: null,
          fat: null,
        },
        entries: entriesData.entries,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      let errorMsg = "Failed to load dashboard. Pull to refresh.";
      if (err instanceof ApiError) {
        if (err.status === 401) {
          errorMsg = "Session expired. Please log in again.";
        } else {
          errorMsg = err.message;
        }
      } else if (err instanceof TypeError && err.message.includes("Network")) {
        errorMsg = "No connection. Pull to refresh when online.";
      }
      set({ isLoading: false, error: errorMsg });
    }
  },

  deleteEntry: async (id: string) => {
    const prev = get().entries;

    // Optimistic removal
    set({ entries: prev.filter((e) => e.id !== id) });

    try {
      await api<{ deleted: true }>(`/log/${id}`, { method: "DELETE" });

      // Re-fetch totals to get accurate server-side sums
      const d = get().date;
      const logData = await api<{
        totals: MacroTotals;
        goals: MacroGoals | null;
      }>(`/log?date=${d}`);

      set({
        totals: logData.totals,
        goals: logData.goals ?? {
          calories: null,
          protein: null,
          carb: null,
          fat: null,
        },
      });
    } catch {
      // Rollback on failure
      set({ entries: prev });
    }
  },

  setDate: (date: string) => {
    set({ date });
    get().fetchDashboard(date);
  },
}));
