import { create } from "zustand";
import { api, ApiError, getApiUrl, getAuthToken } from "../api";
import { useNetworkStore } from "./network";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MessageRole = "user" | "assistant" | "system" | "tool";

export type UiComponent = {
  type: string;
  props: Record<string, unknown>;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string | null;
  uiComponents?: UiComponent[];
  createdAt: string;
  /** Client-only: error message to show inline */
  error?: string | null;
};

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

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export type FavoriteFood = {
  foodId: string;
  servingId: string | null;
  name: string;
  calories: number | null;
};

type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isMacrosLoading: boolean;
  streamingText: string;
  macros: MacroTotals;
  goals: MacroGoals;
  favorites: FavoriteFood[];
  /** Agent timeout — true when waiting exceeded 30s */
  isTimedOut: boolean;

  loadMessages: () => Promise<void>;
  sendMessage: (content: string, attachments?: unknown[]) => Promise<void>;
  fetchMacros: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  retryLastMessage: () => Promise<void>;
};

const AGENT_TIMEOUT_MS = 30_000;

const today = () => new Date().toISOString().slice(0, 10);

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isMacrosLoading: false,
  streamingText: "",
  macros: { calories: 0, protein: 0, carb: 0, fat: 0 },
  goals: { calories: null, protein: null, carb: null, fat: null },
  favorites: [],
  isTimedOut: false,

  loadMessages: async () => {
    try {
      const data = await api<{ messages: ChatMessage[] }>(
        `/chat/messages?date=${today()}`,
      );
      set({ messages: data.messages });
    } catch {
      // API not available yet — start with empty
    }
  },

  sendMessage: async (content, attachments) => {
    const tempId = `temp-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: tempId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      isLoading: true,
      isTimedOut: false,
      streamingText: "",
    }));

    // Check offline — queue food log attempts
    const { isConnected } = useNetworkStore.getState();
    if (!isConnected) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: null,
        error: "You're offline. Your message will be sent when you reconnect.",
        createdAt: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, errorMessage],
        isLoading: false,
      }));
      return;
    }

    // Set up timeout
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      set({ isTimedOut: true });
    }, AGENT_TIMEOUT_MS);

    try {
      const url = getApiUrl();
      const token = await getAuthToken();

      const res = await fetch(`${url}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content, attachments }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // Parse error message from response if possible
        let errorMsg = "Something went wrong. Try again.";
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch {
          // use default
        }

        // Handle 401 specifically
        if (res.status === 401) {
          errorMsg = "Session expired. Please log in again.";
        }

        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: null,
          error: errorMsg,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          messages: [...s.messages, errorMessage],
          isLoading: false,
          isTimedOut: false,
        }));
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      // Smart-routed messages return JSON
      if (contentType.includes("application/json")) {
        const data = (await res.json()) as {
          userMessage: ChatMessage;
          assistantMessage: ChatMessage;
        };

        set((s) => ({
          messages: [
            ...s.messages.filter((m) => m.id !== tempId),
            data.userMessage,
            data.assistantMessage,
          ],
          isLoading: false,
          isTimedOut: false,
        }));
      } else {
        // LLM path returns a text stream — read chunks and build response
        const reader = res.body?.getReader();
        if (!reader) {
          set({ isLoading: false, isTimedOut: false });
          return;
        }

        const decoder = new TextDecoder();
        let fullText = "";

        // Add a streaming placeholder for the assistant
        const streamId = `stream-${Date.now()}`;
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: streamId,
              role: "assistant" as const,
              content: "",
              createdAt: new Date().toISOString(),
            },
          ],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Update the streaming message in place
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === streamId ? { ...m, content: fullText } : m,
            ),
            streamingText: fullText,
          }));
        }

        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === streamId ? { ...m, content: fullText || null } : m,
          ),
          isLoading: false,
          isTimedOut: false,
          streamingText: "",
        }));
      }

      // Refresh macros — the message may have logged food
      get().fetchMacros();

      // Reload messages to get server-side IDs and uiComponents
      get().loadMessages();
    } catch (err) {
      clearTimeout(timeoutId);

      let errorMsg = "Something went wrong. Try again.";
      if (err instanceof ApiError) {
        errorMsg = err.message;
      } else if (timedOut) {
        errorMsg = "The assistant is taking too long. Tap retry to try again.";
      } else if (err instanceof TypeError && err.message.includes("Network")) {
        errorMsg = "Network error. Check your connection and try again.";
      }

      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: null,
        error: errorMsg,
        createdAt: new Date().toISOString(),
      };

      set((s) => ({
        messages: [...s.messages, errorMessage],
        isLoading: false,
        streamingText: "",
        isTimedOut: false,
      }));
    }
  },

  retryLastMessage: async () => {
    const { messages } = get();
    // Find the last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser?.content) return;

    // Remove error messages after the last user message
    const lastUserIdx = messages.lastIndexOf(lastUser);
    const cleaned = messages.slice(0, lastUserIdx);

    set({ messages: cleaned, isTimedOut: false });
    get().sendMessage(lastUser.content);
  },

  fetchMacros: async () => {
    set({ isMacrosLoading: true });
    try {
      const data = await api<{ totals: MacroTotals; goals: MacroGoals }>(
        `/log?date=${today()}`,
      );
      set({ macros: data.totals, goals: data.goals, isMacrosLoading: false });
    } catch {
      set({ isMacrosLoading: false });
    }
  },

  fetchFavorites: async () => {
    try {
      const data = await api<{
        favorites: Array<{
          foodId: string;
          servingId: string | null;
          name: string;
          calories: number | null;
        }>;
      }>("/favorites?limit=8");
      set({ favorites: data.favorites });
    } catch {
      // API not available yet
    }
  },
}));
