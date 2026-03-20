import { create } from "zustand";
import { api } from "../api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface FeedAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface FeedRecipe {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  imageUrl: string | null;
  tags: string[];
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbPerServing: number | null;
  fatPerServing: number | null;
  forkCount: number;
  createdAt: string;
  isBookmarked: boolean;
  author: FeedAuthor;
}

export interface FeedFilters {
  tags?: string;
  maxCalories?: number;
  minProtein?: number;
  sort?: "popular" | "recent";
}

interface FeedResponse {
  recipes: FeedRecipe[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Discover section types (Phase 1 — static data)
// ---------------------------------------------------------------------------
export interface KitchenPreview {
  id: string;
  name: string;
  memberAvatars: string[];
  auraColor: string;
}

export interface SocialRecipeShare {
  id: string;
  sharedBy: { name: string; avatar: string };
  sharedAt: string;
  recipeName: string;
  macros: { cal: number; protein: number; carbs: number; fat: number };
  provenance: string;
}

export interface TrendingRecipe {
  id: string;
  recipeName: string;
  macros: { cal: number; protein: number; carbs: number; fat: number };
  savedCount: number;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Placeholder data — TODO(Phase2): replace with API calls
// ---------------------------------------------------------------------------
const PLACEHOLDER_KITCHENS: KitchenPreview[] = [
  {
    id: "k1",
    name: "Sunday Meal Prep",
    memberAvatars: ["https://i.pravatar.cc/80?u=a1", "https://i.pravatar.cc/80?u=a2", "https://i.pravatar.cc/80?u=a3"],
    auraColor: "rgba(251,113,133,0.35)",
  },
  {
    id: "k2",
    name: "High Protein Club",
    memberAvatars: ["https://i.pravatar.cc/80?u=b1", "https://i.pravatar.cc/80?u=b2"],
    auraColor: "rgba(147,197,253,0.35)",
  },
  {
    id: "k3",
    name: "Vegan Eats",
    memberAvatars: ["https://i.pravatar.cc/80?u=c1", "https://i.pravatar.cc/80?u=c2", "https://i.pravatar.cc/80?u=c3", "https://i.pravatar.cc/80?u=c4"],
    auraColor: "rgba(196,181,253,0.35)",
  },
];

const PLACEHOLDER_SOCIAL_FEED: SocialRecipeShare[] = [
  {
    id: "s1",
    sharedBy: { name: "Alex Rivera", avatar: "https://i.pravatar.cc/80?u=alex" },
    sharedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    recipeName: "Spicy Miso Salmon Bowl",
    macros: { cal: 520, protein: 42, carbs: 38, fat: 18 },
    provenance: "Adapted from a family recipe",
  },
  {
    id: "s2",
    sharedBy: { name: "Jordan Lee", avatar: "https://i.pravatar.cc/80?u=jordan" },
    sharedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    recipeName: "Greek Yogurt Protein Pancakes",
    macros: { cal: 340, protein: 28, carbs: 32, fat: 10 },
    provenance: "Quick weekday breakfast",
  },
  {
    id: "s3",
    sharedBy: { name: "Sam Patel", avatar: "https://i.pravatar.cc/80?u=sam" },
    sharedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    recipeName: "Chipotle Chicken Burrito Bowl",
    macros: { cal: 610, protein: 48, carbs: 52, fat: 22 },
    provenance: "Copycat restaurant recipe",
  },
];

const PLACEHOLDER_TRENDING: TrendingRecipe[] = [
  {
    id: "t1",
    recipeName: "Overnight Oats 3 Ways",
    macros: { cal: 380, protein: 18, carbs: 52, fat: 12 },
    savedCount: 1243,
    imageUrl: null,
  },
  {
    id: "t2",
    recipeName: "One-Pan Lemon Herb Chicken",
    macros: { cal: 450, protein: 38, carbs: 12, fat: 28 },
    savedCount: 987,
    imageUrl: null,
  },
  {
    id: "t3",
    recipeName: "Cottage Cheese Ice Cream",
    macros: { cal: 210, protein: 24, carbs: 18, fat: 6 },
    savedCount: 2105,
    imageUrl: null,
  },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
interface DiscoverState {
  recipes: FeedRecipe[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  cursor: string | null;
  hasMore: boolean;
  filters: FeedFilters;
  // Discover sections — TODO(Phase2): wire to API
  kitchens: KitchenPreview[];
  socialFeed: SocialRecipeShare[];
  trending: TrendingRecipe[];
  setFilters: (filters: FeedFilters) => void;
  fetchFeed: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleBookmark: (recipeId: string) => Promise<void>;
}

export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  recipes: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  cursor: null,
  hasMore: true,
  filters: { sort: "popular" },
  // Discover sections — TODO(Phase2): fetch from API
  kitchens: PLACEHOLDER_KITCHENS,
  socialFeed: PLACEHOLDER_SOCIAL_FEED,
  trending: PLACEHOLDER_TRENDING,

  setFilters: (filters) => {
    set({ filters, recipes: [], cursor: null, hasMore: true });
    get().fetchFeed();
  },

  fetchFeed: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams();
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.tags) params.set("tags", filters.tags);
      if (filters.maxCalories) params.set("maxCalories", String(filters.maxCalories));
      if (filters.minProtein) params.set("minProtein", String(filters.minProtein));

      const data = await api<FeedResponse>(`/recipe/feed?${params.toString()}`);
      set({
        recipes: data.recipes,
        cursor: data.nextCursor,
        hasMore: data.hasMore,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message ?? "Failed to load feed", isLoading: false });
    }
  },

  fetchMore: async () => {
    const { cursor, hasMore, isLoadingMore, filters } = get();
    if (!hasMore || isLoadingMore || !cursor) return;

    set({ isLoadingMore: true });

    try {
      const params = new URLSearchParams();
      params.set("cursor", cursor);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.tags) params.set("tags", filters.tags);
      if (filters.maxCalories) params.set("maxCalories", String(filters.maxCalories));
      if (filters.minProtein) params.set("minProtein", String(filters.minProtein));

      const data = await api<FeedResponse>(`/recipe/feed?${params.toString()}`);
      set((s) => ({
        recipes: [...s.recipes, ...data.recipes],
        cursor: data.nextCursor,
        hasMore: data.hasMore,
        isLoadingMore: false,
      }));
    } catch {
      set({ isLoadingMore: false });
    }
  },

  refresh: async () => {
    set({ cursor: null, hasMore: true });
    await get().fetchFeed();
  },

  toggleBookmark: async (recipeId) => {
    const { recipes } = get();
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    // Optimistic update
    set({
      recipes: recipes.map((r) =>
        r.id === recipeId ? { ...r, isBookmarked: !r.isBookmarked } : r,
      ),
    });

    try {
      if (recipe.isBookmarked) {
        // Find the favorite to delete — fetch user's favorites for this recipe
        const favs = await api<{ favorites: { id: string; recipeId: string | null }[] }>(
          "/favorites?limit=50",
        );
        const fav = favs.favorites.find((f) => f.recipeId === recipeId);
        if (fav) {
          await api(`/favorites/${fav.id}`, { method: "DELETE" });
        }
      } else {
        await api("/favorites", {
          method: "POST",
          body: { recipeId },
        });
      }
    } catch {
      // Revert optimistic update
      set({
        recipes: get().recipes.map((r) =>
          r.id === recipeId ? { ...r, isBookmarked: !r.isBookmarked } : r,
        ),
      });
    }
  },
}));
