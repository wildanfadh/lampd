import { create } from "zustand";
import type { ServiceLogEntry } from "@/lib/types";
import { onServiceLog } from "@/lib/tauri";

const MAX_LOG_ENTRIES = 2000;

interface LogStore {
  entries: ServiceLogEntry[];
  activeServiceId: string | null;
  isSubscribed: boolean;
  subscribe: () => () => void;
  setActiveService: (serviceId: string | null) => void;
  clearLogs: () => void;
  clearServiceLogs: (serviceId: string) => void;
}

export const useLogStore = create<LogStore>((set, get) => ({
  entries: [],
  activeServiceId: null,
  isSubscribed: false,

  subscribe: () => {
    if (get().isSubscribed) return () => {};
    set({ isSubscribed: true });
    const unlisten = onServiceLog((entry) => {
      set((state) => {
        const entries = [...state.entries, entry];
        if (entries.length > MAX_LOG_ENTRIES) {
          entries.splice(0, entries.length - MAX_LOG_ENTRIES);
        }
        return { entries };
      });
    });
    return () => {
      unlisten();
      set({ isSubscribed: false });
    };
  },

  setActiveService: (serviceId) => set({ activeServiceId: serviceId }),

  clearLogs: () => set({ entries: [] }),

  clearServiceLogs: (serviceId) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.serviceId !== serviceId),
    })),
}));
