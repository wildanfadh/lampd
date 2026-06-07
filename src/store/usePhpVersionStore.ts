import { create } from "zustand";
import type { PhpVersionInfo } from "@/lib/types";
import * as api from "@/lib/tauri";

interface PhpVersionStore {
  versions: PhpVersionInfo[];
  isLoading: boolean;
  isSwitching: boolean;
  error: string | null;
  selectedUnit: string | null;
  loadVersions: () => Promise<void>;
  setSelectedUnit: (unit: string) => void;
  switchVersion: (unit: string) => Promise<void>;
}

export const usePhpVersionStore = create<PhpVersionStore>((set, get) => ({
  versions: [],
  isLoading: false,
  isSwitching: false,
  error: null,
  selectedUnit: null,

  loadVersions: async () => {
    set({ isLoading: true, error: null });
    try {
      const versions = await api.listPhpVersions();
      const available = versions.filter((v) => v.available);
      const active = available.find((v) => v.active);
      set({
        versions: available,
        isLoading: false,
        selectedUnit: get().selectedUnit ?? active?.unitName ?? null,
      });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  setSelectedUnit: (unit) => set({ selectedUnit: unit }),

  switchVersion: async (unit) => {
    set({ isSwitching: true, error: null });
    try {
      await api.switchPhpVersion(unit);
      await get().loadVersions();
      set({ isSwitching: false });
    } catch (e) {
      set({ error: String(e), isSwitching: false });
    }
  },
}));
