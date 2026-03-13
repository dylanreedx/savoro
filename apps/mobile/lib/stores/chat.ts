import { create } from "zustand";
import { api } from "../api";

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
type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  macros: MacroTotals;
  goals: MacroGoals;

  loadMessages: () => Promise<void>;
  sendMessage: (content: string, attachments?: unknown[]) => Promise<void>;
  fetchMacros: () => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  macros: { calories: 0, protein: 0, carb: 0, fat: 0 },
  goals: { calories: null, protein: null, carb: null, fat: null },

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
    }));

    try {
      const data = await api<{
        userMessage: ChatMessage;
        assistantMessage: ChatMessage;
      }>("/chat/message", {
        method: "POST",
        body: { content, attachments },
      });

      set((s) => ({
        messages: [
          ...s.messages.filter((m) => m.id !== tempId),
          data.userMessage,
          data.assistantMessage,
        ],
        isLoading: false,
      }));

      // Refresh macros — the message may have logged food
      get().fetchMacros();
    } catch {
      set({ isLoading: false });
    }
  },

  fetchMacros: async () => {
    try {
      const data = await api<{ totals: MacroTotals; goals: MacroGoals }>(
        `/log?date=${today()}`,
      );
      set({ macros: data.totals, goals: data.goals });
    } catch {
      // API not available yet
    }
  },
}));
