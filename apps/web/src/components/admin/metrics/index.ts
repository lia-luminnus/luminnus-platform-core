/**
 * Exportações dos componentes de métricas
 */

// Componentes reutilizáveis
export { default as MetricCard } from './MetricCard';
export { default as StatusIndicator } from './StatusIndicator';
export { default as AlertBadge } from './AlertBadge';
export { default as MetricsLineChart } from './MetricsLineChart';
export { default as MetricsBarChart } from './MetricsBarChart';
export { default as MetricsTable } from './MetricsTable';

// Painel principal
export { default as MetricsDashboard } from './MetricsDashboard';

// Abas por provedor
export { default as OpenAIMetricsTab } from './tabs/OpenAIMetricsTab';
export { default as GeminiMetricsTab } from './tabs/GeminiMetricsTab';
export { default as RenderMetricsTab } from './tabs/RenderMetricsTab';
export { default as CloudflareMetricsTab } from './tabs/CloudflareMetricsTab';
export { default as SupabaseMetricsTab } from './tabs/SupabaseMetricsTab';
