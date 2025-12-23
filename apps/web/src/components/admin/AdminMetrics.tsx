/**
 * COMPONENTE: AdminMetrics
 *
 * Painel completo para visualização de métricas e analytics
 * Integração com provedores:
 * - OpenAI (GPT-4o-mini)
 * - Cartesia (TTS)
 * - Render (Servidor)
 * - Cloudflare (Workers)
 * - Supabase (Database)
 *
 * Features:
 * - Painel geral unificado
 * - Abas por provedor
 * - Gráficos interativos
 * - Alertas e notificações
 * - Cálculos de custo
 * - Previsões de consumo
 */

import { useState } from "react";
import {
  BarChart3,
  Zap,
  Mic,
  Server,
  Cloud,
  Database,
  LayoutDashboard,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MetricsDashboard,
  OpenAIMetricsTab,
  CartesiaMetricsTab,
  RenderMetricsTab,
  CloudflareMetricsTab,
  SupabaseMetricsTab,
} from "./metrics";

type MetricsTab = 'dashboard' | 'openai' | 'cartesia' | 'render' | 'cloudflare' | 'supabase';

const AdminMetrics = () => {
  const [activeTab, setActiveTab] = useState<MetricsTab>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Painel Geral',
      icon: LayoutDashboard,
      color: 'text-muted-foreground dark:text-purple-400',
    },
    {
      id: 'openai' as const,
      label: 'OpenAI',
      icon: Zap,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'cartesia' as const,
      label: 'Cartesia',
      icon: Mic,
      color: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      id: 'render' as const,
      label: 'Render',
      icon: Server,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'cloudflare' as const,
      label: 'Cloudflare',
      icon: Cloud,
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      id: 'supabase' as const,
      label: 'Supabase',
      icon: Database,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-900 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent mb-2 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          Métricas e Analytics
        </h1>
        <p className="text-muted-foreground">
          Acompanhe o consumo, custos e desempenho de todos os provedores da LIA
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MetricsTab)}>
        <TabsList className="grid grid-cols-6 w-full h-auto p-1 bg-muted">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 py-2.5 px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <tab.icon className={`w-4 h-4 ${tab.color}`} />
              <span className="hidden md:inline text-sm">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Conteúdo das Tabs */}
        <div className="mt-6">
          <TabsContent value="dashboard" className="m-0">
            <MetricsDashboard />
          </TabsContent>

          <TabsContent value="openai" className="m-0">
            <OpenAIMetricsTab />
          </TabsContent>

          <TabsContent value="cartesia" className="m-0">
            <CartesiaMetricsTab />
          </TabsContent>

          <TabsContent value="render" className="m-0">
            <RenderMetricsTab />
          </TabsContent>

          <TabsContent value="cloudflare" className="m-0">
            <CloudflareMetricsTab />
          </TabsContent>

          <TabsContent value="supabase" className="m-0">
            <SupabaseMetricsTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Informações adicionais */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
        <p>
          Métricas atualizadas em tempo real. Dados dos últimos 30 dias.
        </p>
        <p className="mt-1">
          Preços baseados em: OpenAI (GPT-4o-mini), Cartesia TTS, Render, Cloudflare Workers, Supabase
        </p>
      </div>
    </div>
  );
};

export default AdminMetrics;
