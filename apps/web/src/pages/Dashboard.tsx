import { useEffect } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Loader2 } from 'lucide-react';

const ADMIN_EMAILS = ["luminnus.lia.ai@gmail.com"];
import DashboardSidebar from '@/components/DashboardSidebar';
import DashboardUserMenu from '@/components/DashboardUserMenu';
import DashboardHome from '@/components/dashboard/DashboardHome';
import DashboardStartHome from '@/components/dashboard/DashboardStartHome';
import DashboardPlusHome from '@/components/dashboard/DashboardPlusHome';
import DashboardProHome from '@/components/dashboard/DashboardProHome';
import DashboardConversas from '@/components/dashboard/DashboardConversas';
import DashboardAgenda from '@/components/dashboard/DashboardAgenda';
import DashboardChat from '@/components/dashboard/DashboardChat';
import DashboardPlano from '@/components/dashboard/DashboardPlano';
import DashboardConfiguracoes from '@/components/dashboard/DashboardConfiguracoes';
import DashboardIntegracoes from '@/components/dashboard/DashboardIntegracoes';

/**
 * PÁGINA: Dashboard
 *
 * Dashboard principal do cliente com:
 * - Sidebar fixa à esquerda com navegação
 * - UserMenu no topo direito
 * - Área de conteúdo dinâmico baseado na rota
 * - Proteção de rota (apenas usuários autenticados)
 */
const Dashboard = () => {
  const { user, loading } = useAuth();
  const { userPlan, loading: planLoading } = useUserPlan();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * VERIFICAÇÃO DE AUTENTICAÇÃO E ROLE
   * - Redireciona para /auth se não estiver logado
   * - Redireciona admins para /admin-dashboard
   */
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user?.email && ADMIN_EMAILS.includes(user.email)) {
      // Se for admin, mas estiver tentando acessar o dashboard especificamente, permite.
      // Caso contrário, se estiver na rota de "/" ou "/dashboard" sem sub-rota, manda para o admin.
      if (location.pathname === '/' || location.pathname === '/dashboard/') {
        navigate('/admin-dashboard');
      }
    }
  }, [user, loading, navigate, location.pathname]);

  /**
   * ROTEAMENTO BASEADO EM PLANO
   * Redireciona o usuário para o dashboard específico do plano após autenticação
   */
  useEffect(() => {
    if (user && !loading && !planLoading) {
      // Verifica se está na rota raiz do dashboard
      if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
        if (userPlan && userPlan.status === 'ativo') {
          // Redireciona baseado no plano (fazendo match com o plano do core ou legacy)
          const planName = userPlan.plano_nome.toLowerCase();

          if (planName.includes('plus')) {
            navigate('/dashboard/plus');
          } else if (planName.includes('pro')) {
            navigate('/dashboard/pro');
          } else {
            // Plano Start ou qualquer outro
            navigate('/dashboard/start');
          }
        } else {
          // Sem plano ativo, redireciona para Start (padrão)
          navigate('/dashboard/start');
        }
      }
    }
  }, [user, loading, planLoading, userPlan, location.pathname, navigate]);

  /**
   * LOADING STATE
   * Mostra spinner enquanto verifica autenticação e plano
   */
  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0B0F] via-[#1a1a2e] to-[#0B0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  /**
   * PROTEÇÃO ADICIONAL
   * Se não houver usuário após o loading, não renderiza nada
   */
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B0F] via-[#1a1a2e] to-[#0B0B0F]">
      {/* SIDEBAR */}
      <DashboardSidebar />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="ml-64 min-h-screen">
        {/* HEADER COM USER MENU */}
        <header className="sticky top-0 z-40 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-end px-8 py-4">
            <DashboardUserMenu />
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO */}
        <main className="p-8">
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/start" element={<DashboardStartHome />} />
            <Route path="/plus" element={<DashboardPlusHome />} />
            <Route path="/pro" element={<DashboardProHome />} />
            <Route path="/conversas" element={<DashboardConversas />} />
            <Route path="/agenda" element={<DashboardAgenda />} />
            <Route path="/chat" element={<DashboardChat />} />
            <Route path="/plano" element={<DashboardPlano />} />
            <Route path="/configuracoes" element={<DashboardConfiguracoes />} />
            <Route path="/integracoes" element={<DashboardIntegracoes />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
