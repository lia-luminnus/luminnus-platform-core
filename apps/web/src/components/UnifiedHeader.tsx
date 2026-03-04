import { useState } from "react";
import { Menu, X, User, LogOut, Shield } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AccountMenu from "@/components/AccountMenu";
import luminmusLogo from "@/assets/luminnus-logo-new.png";

const UnifiedHeader = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { user, signOut, role } = useAuth();
  const { hasActivePlan } = useUserPlan();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleHowItWorksClick = () => {
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
      scrollToSection("como-funciona");
    } else {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById("como-funciona");
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

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut(); // signOut já faz window.location.href = '/'
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md shadow-lg border-b border-white/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20 lg:h-24">
          {/* Logo */}
          <button
            onClick={handleHomeClick}
            className="flex items-center cursor-pointer bg-transparent border-0 p-0"
          >
            <img
              src={luminmusLogo}
              alt="Luminnus - Inteligência & Soluções"
              className="h-20 lg:h-32 w-auto object-contain transition-all hover:scale-105"
            />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center space-x-6">
              <button
                onClick={handleHomeClick}
                className={`transition-all font-medium drop-shadow-md ${location.pathname === '/' ? 'text-accent' : 'text-white hover:text-accent'
                  }`}
              >
                {t('nav_inicio')}
              </button>
              <button
                onClick={handleHowItWorksClick}
                className="text-white hover:text-accent transition-all font-medium drop-shadow-md"
              >
                {t('nav_how_it_works')}
              </button>
              <Link
                to="/planos"
                className={`transition-all font-medium drop-shadow-md ${location.pathname === '/planos' ? 'text-accent' : 'text-white hover:text-accent'
                  }`}
              >
                {t('nav_planos')}
              </Link>
            </nav>
          </div>

          {/* Action Buttons - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />

            {user ? (
              <AccountMenu />
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/auth"
                  className="text-white font-medium hover:text-accent transition-colors px-2"
                >
                  {t('btn_login')}
                </Link>
                <Link
                  to="/planos"
                  className="bg-gradient-to-r from-[#FF2E9E] to-[#F97316] text-white font-semibold px-5 py-2 rounded-full shadow-lg hover:shadow-[#FF2E9E]/25 hover:scale-105 transition-all duration-300"
                >
                  {t('btn_test_free_nav')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="p-2 text-white">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background/95 backdrop-blur-md">
              <nav className="flex flex-col gap-6 mt-8">
                {/* Mobile Navigation */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleHomeClick}
                    className={`transition-colors font-medium text-left py-2 ${location.pathname === '/' ? 'text-accent' : 'text-foreground hover:text-accent'
                      }`}
                  >
                    {t('nav_inicio')}
                  </button>
                  <button
                    onClick={handleHowItWorksClick}
                    className="text-foreground hover:text-accent transition-colors font-medium text-left py-2"
                  >
                    {t('nav_how_it_works')}
                  </button>
                  <Link
                    to="/planos"
                    className={`font-medium py-2 transition-colors ${location.pathname === '/planos' ? 'text-accent' : 'text-foreground hover:text-accent'
                      }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('nav_planos')}
                  </Link>
                </div>

                {/* Mobile Actions */}
                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-end">
                    <LanguageSwitcher />
                  </div>

                  {user ? (
                    <>
                      {role === 'admin' ? (
                        <Link
                          to="/admin-dashboard"
                          className="bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white font-semibold px-5 py-3 rounded-md shadow-md hover:shadow-lg transition-all duration-300 text-center flex items-center justify-center gap-2"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          {t('admin_panel')}
                        </Link>
                      ) : hasActivePlan ? (
                        <Link
                          to="/dashboard"
                          className="bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white font-semibold px-5 py-3 rounded-md shadow-md hover:shadow-lg transition-all duration-300 text-center flex items-center justify-center gap-2"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          {t('client_area')}
                        </Link>
                      ) : null}
                      <button
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 text-foreground font-semibold px-5 py-3 rounded-md shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 border border-border"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('logout')}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Link
                        to="/auth"
                        className="bg-white/10 hover:bg-white/20 text-foreground font-semibold px-5 py-3 rounded-md shadow-md hover:shadow-lg transition-all duration-300 text-center border border-border"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t('btn_login')}
                      </Link>
                      <Link
                        to="/planos"
                        className="bg-gradient-to-r from-[#FF2E9E] to-[#F97316] text-white font-semibold px-5 py-3 rounded-md shadow-md hover:shadow-lg transition-all duration-300 text-center"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t('btn_test_free_nav')}
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default UnifiedHeader;
