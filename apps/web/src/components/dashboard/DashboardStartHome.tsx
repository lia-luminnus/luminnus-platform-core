import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Calendar, Bot, TrendingUp, Clock, CheckCircle2, ArrowUpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * COMPONENTE: DashboardStartHome
 *
 * Página inicial do dashboard para usuários do Plano Start
 * Exibe overview com foco em features básicas e upgrade
 */
const DashboardStartHome = () => {
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
          Plano Start - Comece sua jornada de automação
        </p>
      </div>

      {/* PLANO ATUAL */}
      {hasActivePlan && userPlan && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-lg border border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Plano {userPlan.plano_nome}
                </CardTitle>
                <CardDescription className="text-white/60 mt-1">
                  Status: {userPlan.status === 'ativo' ? 'Ativo' : userPlan.status}
                </CardDescription>
              </div>
              <Link to="/planos">
                <Button className="bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:opacity-90 text-white">
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Fazer Upgrade
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* CARDS DE ESTATÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Conversas */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Conversas
              </CardTitle>
              <MessageSquare className="w-4 h-4 text-[#00C2FF]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0 / 10</div>
            <p className="text-xs text-white/60 mt-1">Limite do plano Start</p>
          </CardContent>
        </Card>

        {/* Agendamentos */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#6A00FF]/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Agendamentos
              </CardTitle>
              <Calendar className="w-4 h-4 text-[#6A00FF]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0 / 20</div>
            <p className="text-xs text-white/60 mt-1">Próximos 7 dias</p>
          </CardContent>
        </Card>

        {/* Tempo economizado */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-green-500/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Tempo Economizado
              </CardTitle>
              <Clock className="w-4 h-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0h</div>
            <p className="text-xs text-white/60 mt-1">Este mês</p>
          </CardContent>
        </Card>

        {/* Taxa de resposta */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-yellow-500/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Taxa de Resposta
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">100%</div>
            <p className="text-xs text-white/60 mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chat com a Lia */}
          <Link to="/dashboard/chat">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">Chat com a Lia</CardTitle>
                    <CardDescription className="text-white/60 text-sm">
                      Converse agora
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
                    <CardTitle className="text-white text-lg">Conversas</CardTitle>
                    <CardDescription className="text-white/60 text-sm">
                      Ver histórico
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
                    <CardTitle className="text-white text-lg">Agenda</CardTitle>
                    <CardDescription className="text-white/60 text-sm">
                      Ver agendamentos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* UPGRADE BANNER */}
      <Card className="bg-gradient-to-r from-[#6A00FF]/20 to-[#00C2FF]/20 backdrop-blur-lg border border-[#00C2FF]/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5" />
            Desbloqueie mais recursos
          </CardTitle>
          <CardDescription className="text-white/80 mt-2">
            Faça upgrade para o Plano Plus e tenha acesso a múltiplos canais, automação avançada e integrações ilimitadas.
          </CardDescription>
          <div className="mt-4">
            <Link to="/planos">
              <Button className="bg-white text-[#6A00FF] hover:bg-white/90 font-semibold">
                Ver Planos
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

export default DashboardStartHome;
