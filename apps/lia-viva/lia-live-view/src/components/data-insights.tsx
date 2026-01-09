import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, BarChart3, Sparkles } from 'lucide-react';

const LIA_VERSION = '4.2.0';
const LIA_CODENAME = 'Luminous';

export function DataInsights() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      const res = await fetch('http://localhost:3000/api/metrics');
      const data = await res.json();
      if (data.success) setMetrics(data.metrics);
      setLoading(false);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setLoading(false);
    }
  }

  if (loading || !metrics) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-[#00f3ff] animate-pulse">Loading metrics...</div>
      </div>
    );
  }

  const formatValue = (val: number, divisor: number, suffix: string) => {
    return (val / divisor).toFixed(1) + suffix;
  };

  const metricCards = [
    { label: 'Total Revenue', value: '$' + formatValue(metrics.totalRevenue, 1000000, 'M'), change: '+' + metrics.revenueChange.toFixed(1) + '%', trend: 'up', icon: DollarSign },
    { label: 'Active Users', value: formatValue(metrics.activeUsers, 1000, 'K'), change: '+' + metrics.usersChange.toFixed(1) + '%', trend: 'up', icon: Users },
    { label: 'AI Queries', value: formatValue(metrics.aiQueries, 1000000, 'M'), change: '+' + metrics.queriesChange.toFixed(1) + '%', trend: 'up', icon: Activity },
    { label: 'Efficiency', value: metrics.efficiency.toFixed(1) + '%', change: metrics.efficiencyChange.toFixed(1) + '%', trend: metrics.efficiencyChange >= 0 ? 'up' : 'down', icon: BarChart3 }
  ];

  return (
    <div className="h-full w-full overflow-y-auto p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#00f3ff] mb-2">Data Insights</h2>
          <p className="text-[rgba(224,247,255,0.6)]">Real-time analytics and performance metrics</p>
        </div>
        <div className="glass-panel neon-border rounded-xl px-6 py-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#00f3ff]" />
            <div>
              <p className="text-xs text-[rgba(224,247,255,0.6)]">LIA Version</p>
              <p className="text-lg font-bold text-[#00f3ff]">{LIA_VERSION}</p>
              <p className="text-xs text-[rgba(188,19,254,0.8)]">{LIA_CODENAME}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <div key={index} className="glass-panel neon-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.3)] flex items-center justify-center">
                <metric.icon className="w-6 h-6 text-[#00f3ff]" />
              </div>
              <div className={'flex items-center gap-1 text-sm font-mono ' + (metric.trend === 'up' ? 'text-[#00ff88]' : 'text-[#ff4444]')}>
                {metric.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {metric.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-[#e0f7ff] mb-1">{metric.value}</p>
            <p className="text-sm text-[rgba(224,247,255,0.5)]">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
