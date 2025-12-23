import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, TrendingUp, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: string;
}

const StatsCard = ({ title, value, description, icon, trend }: StatsCardProps) => (
  <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-purple-100 dark:border-purple-900/30">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend && (
        <div className="mt-2 flex items-center text-xs text-green-600 dark:text-green-400">
          <TrendingUp className="mr-1 h-3 w-3" />
          {trend}
        </div>
      )}
    </CardContent>
  </Card>
);

export const AdminOverview = () => {
  // Query: Total de usuários
  const { data: totalUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-total-users"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Query: Total de mensagens
  const { data: totalMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ["admin-total-messages"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Query: Plano mais usado
  const { data: mostUsedPlan, isLoading: loadingPlans } = useQuery({
    queryKey: ["admin-most-used-plan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("plan_type");

      if (error) throw error;

      // Conta ocorrências de cada plano
      const planCounts: Record<string, number> = {};
      data?.forEach((profile) => {
        const plan = profile.plan_type || "free";
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      });

      // Encontra o plano mais usado
      const mostUsed = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0];
      return mostUsed ? { plan: mostUsed[0], count: mostUsed[1] } : { plan: "N/A", count: 0 };
    },
  });

  // Query: Usuários ativos nos últimos 7 dias
  const { data: activeUsers, isLoading: loadingActive } = useQuery({
    queryKey: ["admin-active-users"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("chat_messages")
        .select("conversation_id")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) throw error;

      // Conta conversas únicas (aproximação de usuários ativos)
      const uniqueConversations = new Set(data?.map((msg) => msg.conversation_id));
      return uniqueConversations.size;
    },
  });

  // Query: Crescimento mensal (últimos 6 meses)
  const { data: monthlyGrowth, isLoading: loadingGrowth } = useQuery({
    queryKey: ["admin-monthly-growth"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Agrupa por mês
      const monthCounts: Record<string, number> = {};
      data?.forEach((profile) => {
        const month = new Date(profile.created_at).toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });

      return Object.entries(monthCounts).slice(-6); // Últimos 6 meses
    },
  });

  const isLoading = loadingUsers || loadingMessages || loadingPlans || loadingActive;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent">Visão Geral</h2>
        <p className="text-muted-foreground">
          Estatísticas gerais do sistema LIA
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[100px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[60px]" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total de Usuários"
              value={totalUsers || 0}
              description="Usuários cadastrados na plataforma"
              icon={<Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              trend="+12% este mês"
            />
            <StatsCard
              title="Total de Mensagens"
              value={totalMessages || 0}
              description="Mensagens trocadas com a LIA"
              icon={<MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              trend="+23% este mês"
            />
            <StatsCard
              title="Plano Mais Usado"
              value={mostUsedPlan?.plan.toUpperCase() || "N/A"}
              description={`${mostUsedPlan?.count || 0} usuários neste plano`}
              icon={<CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
            />
            <StatsCard
              title="Usuários Ativos (7d)"
              value={activeUsers || 0}
              description="Usuários ativos nos últimos 7 dias"
              icon={<TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
              trend="+8% esta semana"
            />
          </>
        )}
      </div>

      {/* Growth Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Crescimento Mensal</CardTitle>
          <CardDescription>Novos usuários cadastrados por mês</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingGrowth ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="space-y-3">
              {monthlyGrowth?.map(([month, count]) => (
                <div key={month} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-muted-foreground">
                    {month}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 rounded-lg bg-gradient-to-r from-purple-500 to-purple-300 dark:from-purple-600 dark:to-purple-400" style={{ width: `${(count / (monthlyGrowth?.[0]?.[1] || 1)) * 100}%` }}>
                      <div className="flex h-full items-center justify-end px-3 text-sm font-bold text-white">
                        {count}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!monthlyGrowth || monthlyGrowth.length === 0) && (
                <p className="text-center text-sm text-muted-foreground">
                  Sem dados de crescimento disponíveis
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
          <CardDescription>Atalhos para tarefas comuns</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md">
            <div className="font-semibold text-foreground">Ver Logs</div>
            <div className="text-xs text-muted-foreground">Últimas atividades</div>
          </button>
          <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md">
            <div className="font-semibold text-foreground">Backup DB</div>
            <div className="text-xs text-muted-foreground">Exportar dados</div>
          </button>
          <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md">
            <div className="font-semibold text-foreground">Testar LIA</div>
            <div className="text-xs text-muted-foreground">Enviar comando</div>
          </button>
          <button className="rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md">
            <div className="font-semibold text-foreground">Relatórios</div>
            <div className="text-xs text-muted-foreground">Gerar PDF</div>
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
