// ======================================================================
// 📊 METRICS SERVICE - Métricas em tempo real para Data Insights
// ======================================================================

interface Metrics {
  totalRevenue: number;
  revenueChange: number;
  activeUsers: number;
  usersChange: number;
  aiQueries: number;
  queriesChange: number;
  efficiency: number;
  efficiencyChange: number;
}

interface RevenueTrendData {
  labels: string[];
  values: number[];
}

interface QueryDistributionData {
  labels: string[];
  gptQueries: number[];
  geminiQueries: number[];
}

// Armazenamento em memória (poderia ser banco de dados)
let metricsData = {
  totalRevenue: 1200000,
  activeUsers: 48200,
  aiQueries: 2400000,
  efficiency: 94.2,
  revenueTrend: [] as number[],
  queryHistory: {
    gpt: [] as number[],
    gemini: [] as number[]
  },
  lastUpdate: Date.now()
};

// Inicializar dados históricos
function initializeHistoricalData() {
  const days = 30;
  for (let i = 0; i < days; i++) {
    metricsData.revenueTrend.push(800000 + Math.random() * 600000);
    metricsData.queryHistory.gpt.push(1000000 + Math.random() * 500000);
    metricsData.queryHistory.gemini.push(800000 + Math.random() * 400000);
  }
}

initializeHistoricalData();

/**
 * Retorna métricas principais
 */
export function getMetrics(): Metrics {
  // Calcular mudanças baseadas nos últimos 7 dias
  const recentRevenue = metricsData.revenueTrend.slice(-7);
  const previousRevenue = metricsData.revenueTrend.slice(-14, -7);
  const revenueChange = calculatePercentChange(
    average(recentRevenue),
    average(previousRevenue)
  );

  return {
    totalRevenue: metricsData.totalRevenue,
    revenueChange,
    activeUsers: metricsData.activeUsers,
    usersChange: 8.3, // Mock - poderia vir de analytics real
    aiQueries: metricsData.aiQueries,
    queriesChange: 24.7, // Mock
    efficiency: metricsData.efficiency,
    efficiencyChange: -2.1 // Mock
  };
}

/**
 * Retorna dados de tendência de receita
 */
export function getRevenueTrend(days: number = 30): RevenueTrendData {
  const data = metricsData.revenueTrend.slice(-days);
  const labels = generateDateLabels(days);

  return {
    labels,
    values: data
  };
}

/**
 * Retorna distribuição de queries
 */
export function getQueryDistribution(days: number = 7): QueryDistributionData {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const gptData = metricsData.queryHistory.gpt.slice(-days);
  const geminiData = metricsData.queryHistory.gemini.slice(-days);

  return {
    labels,
    gptQueries: gptData,
    geminiQueries: geminiData
  };
}

/**
 * Incrementa contadores
 */
export function incrementAIQuery(model: 'gpt' | 'gemini') {
  metricsData.aiQueries++;

  const today = new Date().getDay();
  if (model === 'gpt') {
    if (!metricsData.queryHistory.gpt[today]) {
      metricsData.queryHistory.gpt[today] = 0;
    }
    metricsData.queryHistory.gpt[today]++;
  } else {
    if (!metricsData.queryHistory.gemini[today]) {
      metricsData.queryHistory.gemini[today] = 0;
    }
    metricsData.queryHistory.gemini[today]++;
  }
}

/**
 * Adiciona receita
 */
export function addRevenue(amount: number) {
  metricsData.totalRevenue += amount;
  metricsData.revenueTrend.push(metricsData.totalRevenue);

  // Manter apenas últimos 90 dias
  if (metricsData.revenueTrend.length > 90) {
    metricsData.revenueTrend.shift();
  }
}

/**
 * Atualiza eficiência
 */
export function updateEfficiency(value: number) {
  metricsData.efficiency = value;
}

// Helper functions
function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function generateDateLabels(days: number): string[] {
  const labels: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  return labels;
}
