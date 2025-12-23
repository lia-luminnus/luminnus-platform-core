
import { ModuleDefinition, ModuleId } from '../types';

// 1. Registry of ALL available modules
export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  dashboard: { id: 'dashboard', translationKey: 'dashboard', icon: 'dashboard', path: '/home', isCore: true },
  lia: { id: 'lia', translationKey: 'lia', icon: 'forum', path: '/lia' },
  calendar: { id: 'calendar', translationKey: 'calendar', icon: 'calendar_month', path: '/calendar' },
  crm: { id: 'crm', translationKey: 'crm', icon: 'handshake', path: '/crm' },
  files: { id: 'files', translationKey: 'files', icon: 'folder_open', path: '/files' },
  financial: { id: 'financial', translationKey: 'financial', icon: 'monitoring', path: '/financial' },
  automations: { id: 'automations', translationKey: 'automations', icon: 'bolt', path: '/automations' },
  team: { id: 'team', translationKey: 'team', icon: 'group', path: '/team' },

  // New Modular Options
  stock: { id: 'stock', translationKey: 'stock', icon: 'inventory_2', path: '/stock' },
  projects: { id: 'projects', translationKey: 'projects', icon: 'rocket_launch', path: '/projects' },
  logistics: { id: 'logistics', translationKey: 'logistics', icon: 'local_shipping', path: '/logistics' },
  properties: { id: 'properties', translationKey: 'properties', icon: 'apartment', path: '/properties' },
  medical_records: { id: 'medical_records', translationKey: 'medicalRecords', icon: 'medical_services', path: '/records' },
  sales: { id: 'sales', translationKey: 'sales', icon: 'point_of_sale', path: '/sales' },
  reports: { id: 'reports', translationKey: 'reports', icon: 'bar_chart', path: '/reports' },

  // Core System
  plan: { id: 'plan', translationKey: 'plan', icon: 'credit_card', path: '/plan', isCore: true },
  settings: { id: 'settings', translationKey: 'settings', icon: 'settings', path: '/settings', isCore: true },
  support: { id: 'support', translationKey: 'support', icon: 'support_agent', path: '/support', isCore: true },
  integrations: { id: 'integrations', translationKey: 'integrations', icon: 'sync_alt', path: '/integrations', isCore: true },
};

// 2. Presets: Defines which modules are active by default for each profession
export const CATEGORY_PRESETS: Record<string, ModuleId[]> = {
  technical_services: ['dashboard', 'lia', 'calendar', 'crm', 'files', 'financial', 'automations', 'plan', 'settings', 'support'],

  liberal_professionals: ['dashboard', 'lia', 'crm', 'calendar', 'files', 'financial', 'automations', 'reports', 'plan', 'settings', 'support'],

  health_wellness: ['dashboard', 'lia', 'calendar', 'medical_records', 'financial', 'files', 'crm', 'plan', 'settings', 'support'],

  real_estate: ['dashboard', 'lia', 'crm', 'properties', 'calendar', 'files', 'financial', 'automations', 'plan', 'settings', 'support'],

  retail: ['dashboard', 'lia', 'stock', 'sales', 'financial', 'automations', 'team', 'plan', 'settings', 'support'],

  food: ['dashboard', 'lia', 'stock', 'sales', 'financial', 'team', 'plan', 'settings', 'support'],

  logistics: ['dashboard', 'lia', 'logistics', 'stock', 'financial', 'team', 'automations', 'plan', 'settings', 'support'],

  tech: ['dashboard', 'lia', 'projects', 'automations', 'team', 'files', 'crm', 'plan', 'settings', 'support'],

  creative: ['dashboard', 'lia', 'projects', 'files', 'crm', 'calendar', 'plan', 'settings', 'support'],

  business_services: ['dashboard', 'lia', 'crm', 'financial', 'reports', 'files', 'team', 'automations', 'plan', 'settings', 'support'],

  education: ['dashboard', 'lia', 'calendar', 'files', 'crm', 'financial', 'plan', 'settings', 'support'],

  other: ['dashboard', 'lia', 'crm', 'calendar', 'files', 'financial', 'plan', 'settings', 'support'], // Generic default
};

// Helper to get ordered module definitions based on a list of IDs
export const getModules = (activeIds: ModuleId[]): ModuleDefinition[] => {
  // Filter out invalid IDs and map to definitions
  const active = activeIds
    .filter(id => MODULE_REGISTRY[id])
    .map(id => MODULE_REGISTRY[id]);

  // Ensure core modules are always present if missing (safety check)
  const coreModules = Object.values(MODULE_REGISTRY).filter(m => m.isCore);

  // Combine and deduplicate
  const uniqueMap = new Map<ModuleId, ModuleDefinition>();
  [...active, ...coreModules].forEach(m => uniqueMap.set(m.id, m));

  // Re-sort based on a preferred order (optional, but keeps sidebar tidy)
  const preferredOrder: ModuleId[] = [
    'dashboard', 'crm', 'lia', 'calendar', 'files',
    'projects', 'stock', 'sales', 'properties', 'medical_records', 'logistics',
    'automations', 'financial', 'reports', 'team',
    'settings', 'integrations', 'plan', 'support'
  ];

  return preferredOrder
    .filter(id => uniqueMap.has(id))
    .map(id => uniqueMap.get(id)!);
};
