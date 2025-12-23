import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { UserCircle, User, LogOut, ChevronDown, CreditCard, LayoutDashboard } from 'lucide-react';
const ADMIN_EMAILS = ["luminnus.lia.ai@gmail.com"];

/**
 * COMPONENTE: DashboardUserMenu
 *
 * Menu de usuário exibido no topo direito do dashboard.
 * Mostra avatar e, ao clicar, exibe dropdown com:
 * - Nome e e-mail
 * - Ver Perfil
 * - Sair da Conta
 */
const DashboardUserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, session, signOut } = useAuth();
  const { userPlan } = useUserPlan();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * EFEITO: FECHAR MENU AO CLICAR FORA
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * FUNÇÃO: HANDLE LOGOUT
   */
  const handleLogout = async () => {
    await signOut();
    setIsOpen(false);
    navigate('/');
  };

  /**
   * FUNÇÃO: HANDLE VIEW PROFILE
   */
  const handleViewProfile = () => {
    setIsOpen(false);
    navigate('/dashboard/configuracoes');
  };

  /**
   * EXTRAÇÃO DE DADOS DO USUÁRIO
   */
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';

  // Pega as iniciais do nome para o avatar
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  /**
   * FUNÇÃO: FORMATAÇÃO DO STATUS DO PLANO
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'text-green-400 bg-green-400/10';
      case 'inativo':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'expirado':
        return 'text-red-400 bg-red-400/10';
      case 'cancelado':
        return 'text-gray-400 bg-gray-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'inativo':
        return 'Inativo';
      case 'expirado':
        return 'Expirado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* BOTÃO DE AVATAR */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 border border-white/10 hover:border-white/20"
        aria-label="Menu de usuário"
      >
        {/* Avatar com iniciais */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white font-semibold">
          {initials}
        </div>

        {/* Nome do usuário (oculto em telas pequenas) */}
        <div className="hidden md:block text-left">
          <p className="text-white text-sm font-medium truncate max-w-[150px]">{userName}</p>
          <p className="text-white/60 text-xs truncate max-w-[150px]">{userEmail}</p>
        </div>

        {/* Ícone de dropdown */}
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-2xl overflow-hidden animate-fade-in z-50">
          {/* HEADER DO MENU - INFORMAÇÕES DO USUÁRIO */}
          <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#6A00FF]/20 to-[#00C2FF]/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white font-semibold text-lg">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{userName}</p>
                <p className="text-white/60 text-sm truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* INFORMAÇÕES DO PLANO */}
          {userPlan && (
            <div className="px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#00C2FF]" />
                  <div>
                    <p className="text-white text-sm font-medium">Plano {userPlan.plano_nome}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(userPlan.status)}`}>
                      {getStatusLabel(userPlan.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OPÇÕES DO MENU */}
          <div className="py-2">
            {/* VER PERFIL */}
            <button
              onClick={handleViewProfile}
              className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-200 w-full text-left"
            >
              <User className="w-5 h-5 text-[#00C2FF]" />
              <span>Ver Perfil</span>
            </button>

            {/* ÁREA DO CLIENTE EXTERNA (MOSTRADO PARA ADMINS) */}
            {user?.email && ADMIN_EMAILS.includes(user.email) && (
              <button
                onClick={() => {
                  if (session) {
                    const bridgeUrl = `http://localhost:3000/#/auth-bridge?access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
                    window.location.href = bridgeUrl;
                  } else {
                    window.location.href = "http://localhost:3000";
                  }
                }}
                className="flex items-center gap-3 px-4 py-3 text-[#00C2FF] hover:bg-white/10 transition-colors duration-200 w-full text-left font-medium"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Ir para Dashboard (:3000)</span>
              </button>
            )}

            {/* ÁREA DO CLIENTE */}
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/dashboard/plano');
              }}
              className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-200 w-full text-left"
            >
              <CreditCard className="w-5 h-5 text-[#00C2FF]" />
              <span>Meu Plano</span>
            </button>

            {/* DIVISOR */}
            <div className="my-2 border-t border-white/10"></div>

            {/* SAIR DA CONTA */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors duration-200 w-full text-left"
            >
              <LogOut className="w-5 h-5" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      )
      }
    </div >
  );
};

export default DashboardUserMenu;
