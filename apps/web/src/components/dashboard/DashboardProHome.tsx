import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Calendar, Bot, Crown, Infinity, Zap, Users, BarChart, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * COMPONENTE: DashboardProHome
 *
 * Página inicial do dashboard para usuários do Plano Pro
 * Exibe overview com recursos ilimitados e premium
 */
const DashboardProHome = () => {
  const { user } = useAuth();
  const { userPlan, hasActivePlan } = useUserPlan();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Bem-vindo(a), {userName}!
        </h1>
        <p className="text-white/60">
          Plano Pro - Recursos ilimitados e suporte dedicado 24/7
        </p>
      </div>

      {/* PLANO ATUAL */}
      {hasActivePlan && userPlan && (
        <Card className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-lg border border-yellow-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  Plano {userPlan.plano_nome} - Premium
                </CardTitle>
                <CardDescription className="text-white/60 mt-1">
                  Status: {userPlan.status === 'ativo' ? 'Ativo' : userPlan.status} • Tudo Ilimitado • Suporte VIP 24/7
                </CardDescription>
              </div>
              <Link
                to="/dashboard/plano"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white text-sm font-medium transition-all"
              >
                Ver Detalhes
              </Link>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Conversas */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-yellow-500/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Conversas
              </CardTitle>
              <MessageSquare className="w-4 h-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              0
              <Infinity className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-xs text-white/60 mt-1">Ilimitadas</p>
          </CardContent>
        </Card>

        {/* Agendamentos */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-orange-500/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Agendamentos
              </CardTitle>
              <Calendar className="w-4 h-4 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              0
              <Infinity className="w-5 h-5 text-orange-400" />
            </div>
            <p className="text-xs text-white/60 mt-1">Ilimitados</p>
          </CardContent>
        </Card>

        {/* Canais Ativos */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-500/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Canais Ativos
              </CardTitle>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              0
              <Infinity className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-xs text-white/60 mt-1">Todos os canais</p>
          </CardContent>
        </Card>

        {/* Taxa de conversão */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-cyan-500/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Taxa de Conversão
              </CardTitle>
              <BarChart className="w-4 h-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0%</div>
            <p className="text-xs text-white/60 mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* RECURSOS PRO */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          Recursos Premium Exclusivos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-lg border border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-yellow-400" />
                IA Customizada
              </CardTitle>
              <CardDescription className="text-white/70 mt-2">
                Modelos de IA personalizados treinados especificamente para seu negócio
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-lg border border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Infinity className="w-5 h-5 text-orange-400" />
                Tudo Ilimitado
              </CardTitle>
              <CardDescription className="text-white/70 mt-2">
                Conversas, agendamentos, canais e integrações sem nenhum limite
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg border border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                API Dedicada
              </CardTitle>
              <CardDescription className="text-white/70 mt-2">
                Acesso à API completa para integração total com seus sistemas
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Chat com a Lia */}
          <Link to="/dashboard/chat">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">IA Custom</CardTitle>
                    <CardDescription className="text-white/60 text-xs">
                      Premium
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Ver Conversas */}
          <Link to="/dashboard/conversas">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#6A00FF]/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Conversas</CardTitle>
                    <CardDescription className="text-white/60 text-xs">
                      Ilimitadas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Ver Agenda */}
          <Link to="/dashboard/agenda">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-green-500/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Agenda</CardTitle>
                    <CardDescription className="text-white/60 text-xs">
                      Ilimitada
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Integrações */}
          <Link to="/dashboard/integracoes">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-orange-500/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Integrações</CardTitle>
                    <CardDescription className="text-white/60 text-xs">
                      + API
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* Configurações Avançadas */}
          <Link to="/dashboard/configuracoes">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Config</CardTitle>
                    <CardDescription className="text-white/60 text-xs">
                      Avançada
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* VIP SUPPORT BANNER */}
      <Card className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 backdrop-blur-lg border border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            Suporte VIP Dedicado 24/7
          </CardTitle>
          <CardDescription className="text-white/80 mt-2">
            Seu gerente de conta dedicado está disponível 24/7 para ajudá-lo. Tempo de resposta: menos de 1 hora.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default DashboardProHome;
