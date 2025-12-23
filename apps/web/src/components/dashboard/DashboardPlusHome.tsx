import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Calendar, Bot, TrendingUp, Clock, CheckCircle2, Zap, Users, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * COMPONENTE: DashboardPlusHome
 *
 * Página inicial do dashboard para usuários do Plano Plus
 * Exibe overview com recursos avançados e múltiplos canais
 */
const DashboardPlusHome = () => {
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
          Plano Plus - Automação avançada com múltiplos canais
        </p>
      </div>

      {/* PLANO ATUAL */}
      {hasActivePlan && userPlan && (
        <Card className="bg-gradient-to-r from-[#6A00FF]/20 to-[#00C2FF]/20 backdrop-blur-lg border border-[#6A00FF]/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#6A00FF]" />
                  Plano {userPlan.plano_nome}
                </CardTitle>
                <CardDescription className="text-white/60 mt-1">
                  Status: {userPlan.status === 'ativo' ? 'Ativo' : userPlan.status} • Recursos Avançados Desbloqueados
                </CardDescription>
              </div>
              <Link
                to="/dashboard/plano"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
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
            <div className="text-2xl font-bold text-white">0 / 100</div>
            <p className="text-xs text-white/60 mt-1">Limite expandido</p>
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
            <div className="text-2xl font-bold text-white">0 / 100</div>
            <p className="text-xs text-white/60 mt-1">Próximos 7 dias</p>
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
            <div className="text-2xl font-bold text-white">0 / 3</div>
            <p className="text-xs text-white/60 mt-1">WhatsApp, Telegram, etc</p>
          </CardContent>
        </Card>

        {/* Taxa de conversão */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-yellow-500/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-medium">
                Taxa de Conversão
              </CardTitle>
              <BarChart className="w-4 h-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0%</div>
            <p className="text-xs text-white/60 mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* RECURSOS PLUS */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Recursos Plus Ativos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-[#6A00FF]/10 to-purple-500/10 backdrop-blur-lg border border-[#6A00FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#6A00FF]" />
                Automação Avançada
              </CardTitle>
              <CardDescription className="text-white/70 mt-2">
                Crie fluxos personalizados com IA e automação inteligente para responder seus clientes 24/7
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-[#00C2FF]/10 to-cyan-500/10 backdrop-blur-lg border border-[#00C2FF]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00C2FF]" />
                Múltiplos Canais
              </CardTitle>
              <CardDescription className="text-white/70 mt-2">
                Conecte até 3 canais simultaneamente (WhatsApp, Telegram, Instagram) em um único painel
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* AÇÕES RÁPIDAS */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Chat com a Lia */}
          <Link to="/dashboard/chat">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/50 transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Chat IA</CardTitle>
                    <CardDescription className="text-white/60 text-xs">
                      Avançado
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
                      Histórico
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
                      Agendamentos
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
                      Ilimitadas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPlusHome;
