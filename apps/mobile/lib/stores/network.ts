import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { createMMKV } from "react-native-mmkv";

// ---------------------------------------------------------------------------
// MMKV storage adapter for zustand persist
// ---------------------------------------------------------------------------
const mmkv = createMMKV({ id: "savoro-network" });

const mmkvStorage = {
  getItem: (name: string) => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    mmkv.set(name, value);
  },
  removeItem: (name: string) => {
    mmkv.remove(name);
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type QueuedLogEntry = {
  id: string;
  foodId: string;
  servingId: string;
  quantity: number;
  meal: string;
  createdAt: string;
};

type NetworkState = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  queue: QueuedLogEntry[];

  /** Start listening to connectivity changes */
  startListening: () => () => void;

  /** Add a food log to the offline queue */
  enqueue: (entry: Omit<QueuedLogEntry, "id" | "createdAt">) => void;

  /** Flush the queue when back online — returns count of succeeded items */
  flushQueue: () => Promise<number>;

  /** Remove a single entry from the queue */
  dequeue: (id: string) => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      isConnected: true,
      isInternetReachable: true,
      queue: [],

      startListening: () => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
          const wasOffline = !get().isConnected;
          const isNowOnline =
            state.isConnected === true &&
            state.isInternetReachable !== false;

          set({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable,
          });

          // Auto-flush queue when coming back online
          if (wasOffline && isNowOnline && get().queue.length > 0) {
            get().flushQueue();
          }
        });

        return unsubscribe;
      },

      enqueue: (entry) => {
        const item: QueuedLogEntry = {
          ...entry,
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ queue: [...s.queue, item] }));
      },

      flushQueue: async () => {
        const { queue } = get();
        if (queue.length === 0) return 0;

        // Lazy import to avoid circular deps
        const { api } = await import("../api");
        let flushed = 0;

        for (const entry of queue) {
          try {
            await api("/log", {
              method: "POST",
              body: {
                foodId: entry.foodId,
                servingId: entry.servingId,
                quantity: entry.quantity,
                meal: entry.meal,
              },
            });
            get().dequeue(entry.id);
            flushed++;
          } catch {
            // Stop flushing on first failure — likely still offline
            break;
          }
        }

        return flushed;
      },

      dequeue: (id) => {
        set((s) => ({ queue: s.queue.filter((e) => e.id !== id) }));
      },
    }),
    {
      name: "savoro-offline-queue",
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);
