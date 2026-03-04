
import { ModuleDefinition, type ModuleId } from '../types';
export type { ModuleId };

// 1. Registry of ALL available modules
export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  dashboard: { id: 'dashboard', translationKey: 'dashboard', icon: 'dashboard', path: '/', isCore: true },
  lia: { id: 'lia', translationKey: 'lia', icon: 'forum', path: '/lia' },
  calendar: { id: 'calendar', translationKey: 'calendar', icon: 'calendar_month', path: '/calendar' },
  crm: { id: 'crm', translationKey: 'crm', icon: 'handshake', path: '/crm' },
  files: { id: 'files', translationKey: 'files', icon: 'folder_open', path: '/files' },
  financial: { id: 'financial', translationKey: 'financial', icon: 'monitoring', path: '/financial' },
  automations: { id: 'automations', translationKey: 'automations', icon: 'bolt', path: '/automations' },
  team: { id: 'team', translationKey: 'team', icon: 'group', path: '/team' },

  // New Modular Options
  stock: { id: 'stock', translationKey: 'stock', icon: 'inventory_2', path: '/stock' },
  // projects: { id: 'projects', translationKey: 'projects', icon: 'rocket_launch', path: '/projects' },
  logistics: { id: 'logistics', translationKey: 'logistics', icon: 'local_shipping', path: '/logistics' },
  properties: { id: 'properties', translationKey: 'properties', icon: 'apartment', path: '/properties' },
  medical_records: { id: 'medical_records', translationKey: 'medicalRecords', icon: 'medical_services', path: '/records' },
  sales: { id: 'sales', translationKey: 'sales', icon: 'point_of_sale', path: '/sales' },
  reports: { id: 'reports', translationKey: 'reports', icon: 'bar_chart', path: '/reports' },
  // WhatsApp Agent — oculto do lançamento (código mantido, removido dos presets)
  whatsapp_agent: { id: 'whatsapp_agent', translationKey: 'whatsappAgent', icon: 'chat', path: '/whatsapp' },

  // Core System
  plan: { id: 'plan', translationKey: 'plan', icon: 'credit_card', path: '/plan', isCore: true },
  settings: { id: 'settings', translationKey: 'settings', icon: 'settings', path: '/settings', isCore: true },
  support: { id: 'support', translationKey: 'support', icon: 'support_agent', path: '/support', isCore: true },
  integrations: { id: 'integrations', translationKey: 'integrations', icon: 'extension', path: '/integrations', isCore: true },
};

// 2. Presets: Defines which modules are active by default for each profession
// Keys match the normalized segment_keys used in Onboarding and database
// v2.0: whatsapp_agent = LIA (Treinamento) — hub multi-canal (WhatsApp oculto dentro do componente)
export const CATEGORY_PRESETS: Record<string, ModuleId[]> = {
  // Serviços Técnicos
  services_technical: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'calendar', 'crm', 'plan', 'settings', 'support'],

  // Profissionais Liberais
  professionals: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Saúde & Bem-Estar
  health_wellbeing: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'calendar', 'crm', 'plan', 'settings', 'support'],

  // Imobiliária & Construção
  real_estate_construction: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Comércio & Lojas
  commerce_retail: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Alimentação & Restaurantes
  food_restaurants: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Transporte & Logística
  transport_logistics: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Tecnologia & Software
  tech_software: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Conteúdo & Criativos
  content_creatives: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Serviços Empresariais
  business_services: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Educação & Treinamento
  education_training: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'calendar', 'crm', 'plan', 'settings', 'support'],

  // Outros (Personalizado)
  custom_other: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],

  // Legacy keys (backward compatibility)
  technical_services: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'calendar', 'crm', 'plan', 'settings', 'support'],
  liberal_professionals: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
  health_wellness: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'calendar', 'crm', 'plan', 'settings', 'support'],
  real_estate: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
  retail: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
  food: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
  logistics: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
  tech: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
  creative: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
  education: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'calendar', 'crm', 'plan', 'settings', 'support'],
  other: ['dashboard', 'integrations', 'lia', 'whatsapp_agent', 'crm', 'calendar', 'plan', 'settings', 'support'],
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

  // Re-sort based on a preferred order
  const preferredOrder: ModuleId[] = [
    'dashboard', 'integrations', 'crm', 'lia', 'whatsapp_agent', 'calendar', 'files',
    'stock', 'sales', 'properties', 'medical_records', 'logistics',
    'automations', 'financial', 'reports', 'team',
    'settings', 'plan', 'support'
  ];

  return preferredOrder
    .filter(id => uniqueMap.has(id))
    .map(id => uniqueMap.get(id)!);
};
