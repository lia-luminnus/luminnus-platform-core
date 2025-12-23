
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModuleId, BusinessCategory } from '../types';
import { CATEGORY_PRESETS } from '../config/modules';

interface AppState {
  businessType: string | null;
  businessDescription: string | null;
  isSidebarCollapsed: boolean;
  isFirstVisit: boolean;
  activeModules: ModuleId[];
  
  // Actions
  setBusinessInfo: (type: string, description: string) => void;
  toggleSidebar: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setModules: (modules: ModuleId[]) => void;
  toggleModule: (moduleId: ModuleId) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      businessType: null,
      businessDescription: null,
      isSidebarCollapsed: false,
      isFirstVisit: true,
      activeModules: ['dashboard', 'settings', 'plan', 'support'], // Fallback default

      setBusinessInfo: (type, description) => {
        // When business info is set, we also load the default presets
        const defaultModules = CATEGORY_PRESETS[type] || CATEGORY_PRESETS['other'];
        set({ 
          businessType: type, 
          businessDescription: description,
          activeModules: defaultModules
        });
      },

      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      
      completeOnboarding: () => set({ isFirstVisit: false }),
      
      resetOnboarding: () => set({ isFirstVisit: true, businessType: null, activeModules: [] }),

      setModules: (modules) => set({ activeModules: modules }),

      toggleModule: (moduleId) => set((state) => {
        const isActive = state.activeModules.includes(moduleId);
        let newModules;
        if (isActive) {
          newModules = state.activeModules.filter(id => id !== moduleId);
        } else {
          newModules = [...state.activeModules, moduleId];
        }
        return { activeModules: newModules };
      }),
    }),
    {
      name: 'luminnus-storage',
    }
  )
);
