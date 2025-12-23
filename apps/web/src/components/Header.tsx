import { useState } from "react";
import { Menu, X, User, LogOut, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AccountMenu from "@/components/AccountMenu";
import luminmusLogo from "@/assets/luminnus-logo-new.png";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      setMobileMenuOpen(false);
    }
  };
  const handleHomeClick = () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
      scrollToSection("inicio");
    } else {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById("inicio");
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 100);
    }
    setMobileMenuOpen(false);
  };

  const handleSolutionsClick = () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
      scrollToSection("solucoes");
    } else {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById("solucoes");
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 100);
    }
    setMobileMenuOpen(false);
  };

  const handleContactClick = () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
      scrollToSection("contato");
    } else {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById("contato");
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }, 100);
    }
    setMobileMenuOpen(false);
  };

  /**
   * FUNÇÃO DE LOGOUT
   * Desloga o usuário e redireciona para a página inicial
   */
  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate('/');
  };
  return <header className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md shadow-lg border-b border-white/10">
    <div className="container mx-auto px-4 lg:px-8">
      <div className="flex items-center justify-between h-20 lg:h-24">
        {/* Logo */}
        <button onClick={handleHomeClick} className="flex items-center cursor-pointer bg-transparent border-0 p-0">
          <img src={luminmusLogo} alt="Luminnus - Inteligência & Soluções" className="h-20 lg:h-32 w-auto object-contain transition-all hover:scale-105" />
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <button onClick={handleHomeClick} className="text-white hover:text-accent transition-all font-medium drop-shadow-md">
            {t('nav_inicio')}
          </button>
          <button onClick={handleSolutionsClick} className="text-white hover:text-accent transition-all font-medium drop-shadow-md">
            {t('nav_solucoes')}
          </button>
          <Link to="/planos" className="text-white hover:text-accent transition-all font-medium drop-shadow-md">
            {t('nav_planos')}
          </Link>
          <button onClick={handleContactClick} className="text-white hover:text-accent transition-all font-medium drop-shadow-md">
            {t('nav_contato')}
          </button>
        </nav>

        {/* Action Buttons - Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />

          {/* Se o usuário estiver logado */}
          {user ? (
            <AccountMenu />
          ) : (
            /* Se o usuário NÃO estiver logado */
            <Link
              to="/auth"
              className="bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white font-semibold px-5 py-2 rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              {t('btn_login')}
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && <nav className="md:hidden py-4 space-y-4 animate-fade-in border-t border-white/10 bg-black/40 backdrop-blur-md">
        <button onClick={handleHomeClick} className="block w-full text-left py-2 text-white hover:text-accent transition-colors font-medium">
          {t('nav_inicio')}
        </button>
        <button onClick={handleSolutionsClick} className="block w-full text-left py-2 text-white hover:text-accent transition-colors font-medium">
          {t('nav_solucoes')}
        </button>
        <Link to="/planos" className="block w-full text-left py-2 text-white hover:text-accent transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>
          {t('nav_planos')}
        </Link>
        <button onClick={handleContactClick} className="block w-full text-left py-2 text-white hover:text-accent transition-colors font-medium">
          {t('nav_contato')}
        </button>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex justify-center pb-2">
            <LanguageSwitcher />
          </div>

          {/* Se o usuário estiver logado - Mobile */}
          {user ? (
            <>
              <Link
                to={role === 'admin' ? "/admin-dashboard" : "/dashboard"}
                className="bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white font-semibold px-5 py-2 rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 text-center flex items-center justify-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {role === 'admin' ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Painel Admin
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Área do Cliente
                  </>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2 rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 border border-white/20"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </>
          ) : (
            /* Se o usuário NÃO estiver logado - Mobile */
            <Link
              to="/auth"
              className="bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white font-semibold px-5 py-2 rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('btn_login')}
            </Link>
          )}
        </div>
      </nav>}
    </div>
  </header>;
};
export default Header;