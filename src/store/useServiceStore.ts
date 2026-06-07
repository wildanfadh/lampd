import { create } from "zustand";
import type { ManagedServiceStatus } from "@/lib/types";
import * as api from "@/lib/tauri";

interface ServiceStore {
  services: ManagedServiceStatus[];
  isLoading: boolean;
  error: string | null;
  loadServices: () => Promise<void>;
  startService: (id: string) => Promise<void>;
  stopService: (id: string) => Promise<void>;
  restartService: (id: string) => Promise<void>;
  enableService: (id: string) => Promise<void>;
  disableService: (id: string) => Promise<void>;
}

export const useServiceStore = create<ServiceStore>((set) => ({
  services: [],
  isLoading: false,
  error: null,

  loadServices: async () => {
    set({ isLoading: true, error: null });
    try {
      const services = await api.listManagedServices();
      set({ services, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  startService: async (id) => {
    set({ error: null, isLoading: true });
    try {
      const updated = await api.startManagedService(id);
      set((state) => ({
        services: state.services.map((s) => (s.id === id ? updated : s)),
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  stopService: async (id) => {
    set({ error: null, isLoading: true });
    try {
      const updated = await api.stopManagedService(id);
      set((state) => ({
        services: state.services.map((s) => (s.id === id ? updated : s)),
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  restartService: async (id) => {
    set({ error: null, isLoading: true });
    try {
      const updated = await api.restartManagedService(id);
      set((state) => ({
        services: state.services.map((s) => (s.id === id ? updated : s)),
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  enableService: async (id) => {
    set({ error: null, isLoading: true });
    try {
      const updated = await api.enableManagedService(id);
      set((state) => ({
        services: state.services.map((s) => (s.id === id ? updated : s)),
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  disableService: async (id) => {
    set({ error: null, isLoading: true });
    try {
      const updated = await api.disableManagedService(id);
      set((state) => ({
        services: state.services.map((s) => (s.id === id ? updated : s)),
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },
}));
