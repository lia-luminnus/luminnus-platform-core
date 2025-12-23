import { useUserPlan } from '@/hooks/useUserPlan';
import { plans } from '@/data/plansData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CreditCard, Calendar, TrendingUp, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * COMPONENTE: DashboardPlano
 *
 * Página com informações do plano atual e opção de upgrade
 */
const DashboardPlano = () => {
  const { userPlan, hasActivePlan, loading } = useUserPlan();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C2FF]"></div>
      </div>
    );
  }

  // Busca informações do plano
  const planInfo = hasActivePlan && userPlan
    ? plans.find(p => p.name === userPlan.plano_nome)
    : null;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Meu Plano
        </h1>
        <p className="text-white/60">
          Gerencie sua assinatura e veja os benefícios
        </p>
      </div>

      {hasActivePlan && userPlan && planInfo ? (
        <>
          {/* PLANO ATUAL */}
          <Card className="bg-gradient-to-r from-[#6A00FF]/10 to-[#00C2FF]/10 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-2xl flex items-center gap-3">
                    <Crown className="w-7 h-7 text-yellow-400" />
                    Plano {userPlan.plano_nome}
                  </CardTitle>
                  <CardDescription className="text-white/60 mt-2 text-lg">
                    {planInfo.description}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{planInfo.price}</div>
                  <div className="text-white/60">{planInfo.period}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">
                  Status: {userPlan.status === 'ativo' ? 'Ativo' : userPlan.status}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* RECURSOS DO PLANO */}
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recursos Incluídos</CardTitle>
              <CardDescription className="text-white/60">
                Tudo o que você tem acesso no seu plano atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {planInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-[#00C2FF] flex-shrink-0 mt-0.5" />
                    <span className="text-white/90 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* INFORMAÇÕES ADICIONAIS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-[#00C2FF]" />
                  <CardTitle className="text-white text-sm">Forma de Pagamento</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-sm">Cartão •••• 1234</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#6A00FF]" />
                  <CardTitle className="text-white text-sm">Próxima Cobrança</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-sm">Em 30 dias</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <CardTitle className="text-white text-sm">Cliente desde</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-white/60 text-sm">
                  {new Date(userPlan.created_at).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* UPGRADE */}
          {userPlan.plano_nome !== 'Pro' && (
            <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-lg border border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  Quer mais recursos?
                </CardTitle>
                <CardDescription className="text-white/60">
                  Faça upgrade para desbloquear todo o potencial da Lia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/planos">
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white">
                    Ver Planos Disponíveis
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* SEM PLANO ATIVO */
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="w-16 h-16 text-white/40 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum plano ativo
            </h3>
            <p className="text-white/60 text-center max-w-md mb-6">
              Você ainda não possui um plano ativo. Escolha o plano ideal para você e comece a usar a Lia!
            </p>
            <Link to="/planos">
              <Button className="bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:opacity-90 text-white">
                Ver Planos Disponíveis
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPlano;
