
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModuleId, BusinessCategory } from '../types';
import { CATEGORY_PRESETS } from '../config/modules';

interface LiaDashboardAction {
  type: string;
  payload: any;
  timestamp: number;
}

interface AppState {
  businessType: string | null;
  businessDescription: string | null;
  isSidebarCollapsed: boolean;
  isFirstVisit: boolean;
  onboarding_completed: boolean;
  integrations_completed: boolean;
  planType: 'Start' | 'Plus' | 'Pro';
  activeModules: ModuleId[];

  // Cross-page Dashboard Actions Queue
  pendingDashboardActions: LiaDashboardAction[];

  // Actions
  setBusinessInfo: (type: string, description: string) => void;
  setPlanType: (plan: 'Start' | 'Plus' | 'Pro') => void;
  toggleSidebar: () => void;
  completeOnboarding: () => void;
  completeIntegrations: () => void;
  resetOnboarding: () => void;
  setModules: (modules: ModuleId[]) => void;
  toggleModule: (moduleId: ModuleId) => void;

  // Dashboard Action Queue Methods
  queueDashboardAction: (action: LiaDashboardAction) => void;
  dequeueDashboardActions: () => LiaDashboardAction[];
  clearDashboardActions: () => void;
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
      planType: 'Pro', // Default to Pro - user's actual plan

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

      resetOnboarding: () => {
        const currentPlan = get().planType; // Preserve current plan
        set({
          isFirstVisit: true,
          onboarding_completed: false,
          integrations_completed: false,
          businessType: null,
          activeModules: [],
          planType: currentPlan // Keep the plan!
        });
      },

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

      // Dashboard Action Queue - Cross-page communication
      pendingDashboardActions: [],

      queueDashboardAction: (action) => set((state) => ({
        pendingDashboardActions: [...state.pendingDashboardActions, action]
      })),

      dequeueDashboardActions: () => {
        const actions = get().pendingDashboardActions;
        set({ pendingDashboardActions: [] });
        return actions;
      },

      clearDashboardActions: () => set({ pendingDashboardActions: [] }),
    }),
    {
      name: 'luminnus-storage',
    }
  )
);

// Expor store na window para acesso cross-module (LIA-Action Protocol)
if (typeof window !== 'undefined') {
  (window as any).__LUMINNUS_STORE__ = useAppStore.getState();
  // Manter sincronizado com mudanças
  useAppStore.subscribe((state) => {
    (window as any).__LUMINNUS_STORE__ = state;
  });
}
