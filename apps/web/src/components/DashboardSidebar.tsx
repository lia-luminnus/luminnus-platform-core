import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  MessageSquare,
  Calendar,
  Bot,
  CreditCard,
  Settings,
  Grid3x3,
  LogOut
} from 'lucide-react';

/**
 * COMPONENTE: DashboardSidebar
 *
 * Sidebar fixa à esquerda do dashboard com menu de navegação.
 * Contém links para todas as seções do dashboard.
 */

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const DashboardSidebar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems: MenuItem[] = [
    {
      path: '/dashboard',
      label: 'Início',
      icon: <Home className="w-5 h-5" />
    },
    {
      path: '/dashboard/conversas',
      label: 'Conversas com a Lia',
      icon: <MessageSquare className="w-5 h-5" />
    },
    {
      path: '/dashboard/agenda',
      label: 'Agenda',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      path: '/dashboard/chat',
      label: 'Chat com a Lia',
      icon: <Bot className="w-5 h-5" />
    },
    {
      path: '/dashboard/plano',
      label: 'Meu Plano',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      path: '/dashboard/configuracoes',
      label: 'Configurações da Conta',
      icon: <Settings className="w-5 h-5" />
    },
    {
      path: '/dashboard/integracoes',
      label: 'Integrações',
      icon: <Grid3x3 className="w-5 h-5" />
    }
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0B0B0F]/80 backdrop-blur-xl border-r border-white/10 flex flex-col">
      {/* LOGO/HEADER */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-white/60 mt-1">Área do Cliente</p>
      </div>

      {/* MENU ITEMS */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white shadow-lg shadow-[#6A00FF]/20'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* LOGOUT BUTTON */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
