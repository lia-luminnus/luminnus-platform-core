
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

  // Module initialization method
  initializeModules: () => void;
  syncWithProfile: (profile: any) => void;
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
      activeModules: ['dashboard', 'integrations', 'settings', 'plan', 'support', 'lia'], // Fallback default (Fixed v9.6)
      planType: 'Pro', // Default to Pro - user's actual plan

      setBusinessInfo: (type, description) => {
        // When business info is set, we also load the default presets
        const defaultModules = CATEGORY_PRESETS[type] || CATEGORY_PRESETS['other'];

        // ✅ GARANTIR MÓDULOS CORE SEMPRE PRESENTES
        const coreModules: ModuleId[] = ['dashboard', 'integrations', 'settings', 'plan', 'support', 'lia'];
        const finalModules = Array.from(new Set([...coreModules, ...defaultModules]));

        set({
          businessType: type,
          businessDescription: description,
          activeModules: finalModules
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

      // Initialize modules with safe fallback
      initializeModules: () => {
        const current = get();
        // Se activeModules estiver vazio ou muito pequeno, inicializar com padrão seguro
        if (!current.activeModules || current.activeModules.length < 3) {
          const coreModules: ModuleId[] = ['dashboard', 'integrations', 'settings', 'plan', 'support', 'lia'];
          set({ activeModules: coreModules });
          console.log('[useAppStore] 🔧 Módulos inicializados com fallback seguro:', coreModules);
        }
      },

      // v9.6: Smart Profile Sync
      syncWithProfile: (profile: any) => {
        const current = get();
        const updates: any = {};
        let needsUpdate = false;

        if (profile.onboarding_completed && !current.onboarding_completed) {
          updates.onboarding_completed = true;
          updates.isFirstVisit = false;
          needsUpdate = true;
        }

        if (profile.onboarding_integrations_done && !current.integrations_completed) {
          updates.integrations_completed = true;
          needsUpdate = true;
        }

        // Module Logic
        let newModules = current.activeModules;

        // 1. Prefer DB modules if they exist and are valid
        if (profile.modules && Array.isArray(profile.modules) && profile.modules.length >= 3) {
          if (JSON.stringify(current.activeModules) !== JSON.stringify(profile.modules)) {
            newModules = profile.modules;
          }
        }
        // 2. If no DB modules or DB has only core, but we have a segment, RE-APPLY presets
        // This fixes the "missing tabs" issue if DB sync overwrote with incomplete list or persistence failed
        else if (profile.segment) {
          const hasSignificantModules = current.activeModules.length > 6; // core(5) + lia(1) = 6
          if (!hasSignificantModules || !current.businessType) {
            const preset = CATEGORY_PRESETS[profile.segment] || CATEGORY_PRESETS['other'];
            const core: ModuleId[] = ['dashboard', 'integrations', 'settings', 'plan', 'support', 'lia'];
            newModules = Array.from(new Set([...core, ...preset]));
            console.log('[useAppStore] 🔧 Re-applying presets for segment:', profile.segment);
          }
        }

        if (JSON.stringify(newModules) !== JSON.stringify(current.activeModules) || (profile.modules && !current.activeModules)) {
          updates.activeModules = newModules;
          needsUpdate = true;
        }

        if (profile.segment && current.businessType !== profile.segment) {
          updates.businessType = profile.segment;
          updates.businessDescription = profile.business_description || current.businessDescription || '';
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log('[useAppStore] 🔄 Syncing state with profile:', Object.keys(updates));
          set(updates);
        }
      }
    }),
    {
      name: 'luminnus-storage',
      // Adicionar onRehydrateStorage para inicializar módulos após carregamento do localStorage
      onRehydrateStorage: () => (state) => {
        if (state && (!state.activeModules || state.activeModules.length < 3)) {
          state.initializeModules();
        }
      },
    }
  )
);

// Expor store na window para acesso cross-module (Lia-Action Protocol)
if (typeof window !== 'undefined') {
  (window as any).__LUMINNUS_STORE__ = useAppStore.getState();
  useAppStore.subscribe((state) => {
    (window as any).__LUMINNUS_STORE__ = state;
  });
}
