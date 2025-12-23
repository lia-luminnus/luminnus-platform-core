import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, LogOut, Settings, UserCircle, Shield } from 'lucide-react';

/**
 * COMPONENTE: AccountMenu
 *
 * Menu dropdown exibido quando o usuário está logado.
 * Exibe um ícone de usuário que, ao ser clicado, mostra um menu com:
 * - Minha Conta (informações do usuário)
 * - Área do Cliente
 * - Sair da Conta
 *
 * Props: Nenhuma
 */
const AccountMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * EFEITO: FECHAR MENU AO CLICAR FORA
   * Detecta cliques fora do menu e o fecha automaticamente
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
   * Desloga o usuário (signOut faz o redirect automaticamente)
   */
  const handleLogout = async () => {
    setIsOpen(false);
    await signOut(); // signOut já faz window.location.href = '/'
  };

  /**
   * FUNÇÃO: HANDLE MENU CLICK
   * Fecha o menu ao clicar em qualquer item
   */
  const handleMenuClick = () => {
    setIsOpen(false);
  };

  /**
   * EXTRAÇÃO DE DADOS DO USUÁRIO
   * Pega o nome e email do usuário
   */
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';

  return (
    <div className="relative" ref={menuRef}>
      {/* BOTÃO DE AVATAR */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:shadow-lg hover:scale-105 transition-all duration-300 border-2 border-white/20"
        aria-label="Menu de conta"
      >
        <UserCircle className="w-6 h-6 text-white" />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#1a1a2e]/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-2xl overflow-hidden animate-fade-in z-50">
          {/* HEADER DO MENU - INFORMAÇÕES DO USUÁRIO */}
          <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#6A00FF]/20 to-[#00C2FF]/20">
            <p className="text-white font-semibold truncate">{userName}</p>
            <p className="text-white/60 text-sm truncate">{userEmail}</p>
          </div>

          {/* OPÇÕES DO MENU */}
          <div className="py-2">
            {/* MINHA CONTA */}
            <Link
              to="/minha-conta"
              onClick={handleMenuClick}
              className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-200"
            >
              <Settings className="w-5 h-5 text-[#00C2FF]" />
              <span>Minha Conta</span>
            </Link>

            {/* ÁREA DO CLIENTE / PAINEL ADMIN */}
            {role === 'admin' ? (
              <Link
                to="/admin-dashboard"
                onClick={handleMenuClick}
                className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-200"
              >
                <Shield className="w-5 h-5 text-[#00C2FF]" />
                <span>Painel Admin</span>
              </Link>
            ) : (
              <button
                onClick={async () => {
                  handleMenuClick();
                  // Get current session to transfer to dashboard app
                  const { data: { session } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getSession());
                  if (session) {
                    // Redirect to modular dashboard at port 3000 with auth bridge
                    const bridgeUrl = `http://localhost:3000/#/auth-bridge?access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
                    window.location.href = bridgeUrl;
                  } else {
                    // No session, redirect to login
                    navigate('/auth');
                  }
                }}
                className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors duration-200 w-full text-left"
              >
                <User className="w-5 h-5 text-[#00C2FF]" />
                <span>Área do Cliente</span>
              </button>
            )}

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
      )}
    </div>
  );
};

export default AccountMenu;
