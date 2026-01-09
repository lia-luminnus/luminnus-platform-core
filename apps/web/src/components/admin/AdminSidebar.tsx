import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Settings,
  Wrench,
  MessageSquare,
  CreditCard,
  Code,
  LogOut,
  Menu,
  X,
  Bot,
  AlertTriangle,
  FileText,
  Building2,
  Plug,
  BarChart3,
  Headphones,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "lia-viva", label: "LIA (Painel Completo)", icon: Sparkles, badge: "Premium" },
  { id: "users", label: "Gerenciar Usuários", icon: Users },
  { id: "companies", label: "Empresas", icon: Building2, badge: "Novo" },
  { id: "lia-core-updates", label: "LIA Core Updates", icon: Sparkles, badge: "Novo" },
  { id: "tools", label: "Ferramentas e Testes", icon: Wrench },
  { id: "history", label: "Histórico de Interações", icon: MessageSquare },
  { id: "plans", label: "Planos e Permissões", icon: CreditCard },
  { id: "integrations", label: "Integrações", icon: Plug, badge: "Novo" },
  { id: "metrics", label: "Métricas", icon: BarChart3, badge: "Novo" },
  { id: "support", label: "Suporte", icon: Headphones, badge: "Novo" },
  { id: "logs", label: "Logs", icon: FileText, badge: "Novo" },
  { id: "errors", label: "Erros", icon: AlertTriangle, badge: "Novo" },
  { id: "technical", label: "Configurações Técnicas", icon: Code },
  { id: "lia-config", label: "Configurações da LIA", icon: Settings },
];

export const AdminSidebar = ({
  activeSection,
  onSectionChange,
}: AdminSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, session } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    console.log('[AdminSidebar] Iniciando logout...');
    await signOut();
    console.log('[AdminSidebar] Logout completo, redirecionando para home');
    navigate("/");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 text-white transition-transform duration-300 ease-in-out shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-white/20 p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">LIA Admin</h1>
              <p className="text-sm text-white/70">Painel de Controle</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4 pb-10">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500 text-white rounded-full animate-pulse shadow-lg">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer - Logout */}
          <div className="border-t border-white/20 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair do Admin
            </Button>
            <Button
              variant="secondary"
              className="mt-2 w-full justify-start bg-indigo-500/20 text-white hover:bg-indigo-500/40 border border-indigo-400/30 transition-all duration-200"
              onClick={() => {
                // Redireciona para o Dashboard cliente (porta 3001) via AuthBridge para sincronizar tokens
                if (session) {
                  const bridgeUrl = `http://localhost:3001/#/auth-bridge?access_token=${session.access_token}&refresh_token=${session.refresh_token}&admin_access=true`;
                  window.location.href = bridgeUrl;
                } else {
                  window.location.href = "http://localhost:3001";
                }
              }}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard Cliente
            </Button>
          </div>
        </div>
      </aside >

      {/* Overlay for mobile */}
      {
        isOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )
      }
    </>
  );
};