
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModuleId, BusinessCategory } from '../types';
import { CATEGORY_PRESETS } from '../config/modules';

interface AppState {
  businessType: string | null;
  businessDescription: string | null;
  isSidebarCollapsed: boolean;
  isFirstVisit: boolean;
  onboarding_completed: boolean;
  integrations_completed: boolean;
  planType: 'Start' | 'Plus' | 'Pro';
  activeModules: ModuleId[];

  // Actions
  setBusinessInfo: (type: string, description: string) => void;
  setPlanType: (plan: 'Start' | 'Plus' | 'Pro') => void;
  toggleSidebar: () => void;
  completeOnboarding: () => void;
  completeIntegrations: () => void;
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
      onboarding_completed: false,
      integrations_completed: false,
      activeModules: ['dashboard', 'integrations', 'settings', 'plan', 'support'], // Fallback default
      planType: 'Start',

      setBusinessInfo: (type, description) => {
        // When business info is set, we also load the default presets
        const defaultModules = CATEGORY_PRESETS[type] || CATEGORY_PRESETS['other'];
        // Ensure integrations is ALWAYS present
        if (!defaultModules.includes('integrations')) {
          defaultModules.push('integrations');
        }
        set({
          businessType: type,
          businessDescription: description,
          activeModules: defaultModules
        });
      },

      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      completeOnboarding: () => set({ onboarding_completed: true, isFirstVisit: false }),
      completeIntegrations: () => set({ integrations_completed: true }),

      resetOnboarding: () => set({
        isFirstVisit: true,
        onboarding_completed: false,
        integrations_completed: false,
        businessType: null,
        activeModules: []
      }),

      setModules: (modules) => set({ activeModules: modules }),
      setPlanType: (plan) => set({ planType: plan }),

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
