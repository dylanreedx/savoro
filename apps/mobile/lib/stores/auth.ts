import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api, ApiError } from "../api";

const TOKEN_KEY = "savoro_auth_token";

type User = {
  id: string;
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Hydrate token from SecureStore on app start */
  hydrate: () => Promise<void>;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  loginWithApple: (
    identityToken: string,
    fullName?: { givenName?: string; familyName?: string } | null,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      set({ token, isAuthenticated: true, user: { id: "" }, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const data = await api<{ token: string; userId: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    set({ token: data.token, user: { id: data.userId }, isAuthenticated: true });
  },

  register: async (email, username, password) => {
    const data = await api<{ token: string; userId: string }>(
      "/auth/register",
      {
        method: "POST",
        body: { email, username, password },
      },
    );
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    set({ token: data.token, user: { id: data.userId }, isAuthenticated: true });
  },

  loginWithApple: async (identityToken, fullName) => {
    const data = await api<{ token: string; userId: string }>(
      "/auth/apple",
      {
        method: "POST",
        body: { identityToken, fullName },
      },
    );
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    set({ token: data.token, user: { id: data.userId }, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Server-side cleanup is best-effort
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
