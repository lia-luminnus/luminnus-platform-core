import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminLiaConfig } from "@/components/admin/AdminLiaConfig";
import { AdminTools } from "@/components/admin/AdminTools";
import { AdminHistory } from "@/components/admin/AdminHistory";
import { AdminPlans } from "@/components/admin/AdminPlans";
import { AdminTechnical } from "@/components/admin/AdminTechnical";
import AdminLiaChat from "@/components/admin/AdminLiaChat";
import AdminErrors from "@/components/admin/AdminErrors";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminCompanies from "@/components/admin/AdminCompanies";
import AdminIntegrations from "@/components/admin/AdminIntegrations";
import AdminMetrics from "@/components/admin/AdminMetrics";
import AdminSupport from "@/components/admin/AdminSupport";
import AdminLiaCoreUpdates from "@/components/admin/AdminLiaCoreUpdates";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ADMIN_EMAILS = ["luminnus.lia.ai@gmail.com"];

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading, adminEmail } = useAdminAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const navigate = useNavigate();

  // Verificação extra por email (para evitar flash)
  const isAdminByEmail = user?.email && ADMIN_EMAILS.includes(user.email);
  const shouldShowAdmin = isAdmin || isAdminByEmail;

  // Enquanto verifica autenticação
  if (isLoading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-400" />
          <p className="mt-4 text-white/70">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não for admin, redireciona sem mostrar "Acesso Negado"
  if (!shouldShowAdmin) {
    // Usa useEffect para redirecionar de forma limpa
    navigate('/auth', { replace: true });
    return null;
  }

  // Renderiza a seção ativa
  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <AdminOverview />;
      case "lia-chat":
        return <AdminLiaChat />;
      case "users":
        return <AdminUsers />;
      case "companies":
        return <AdminCompanies />;
      case "lia-config":
        return <AdminLiaConfig />;
      case "lia-core-updates":
        return <AdminLiaCoreUpdates />;
      case "tools":
        return <AdminTools />;
      case "history":
        return <AdminHistory />;
      case "plans":
        return <AdminPlans />;
      case "integrations":
        return <AdminIntegrations />;
      case "metrics":
        return <AdminMetrics />;
      case "support":
        return <AdminSupport />;
      case "logs":
        return <AdminLogs />;
      case "errors":
        return <AdminErrors />;
      case "technical":
        return <AdminTechnical />;
      default:
        return <AdminOverview />;
    }
  };

  // Títulos das seções
  const getSectionTitle = () => {
    switch (activeSection) {
      case "overview": return "Visão Geral";
      case "lia-chat": return "Assistente LIA";
      case "users": return "Gerenciar Usuários";
      case "companies": return "Gestão de Empresas";
      case "lia-config": return "Configurações da LIA";
      case "lia-core-updates": return "LIA Core Updates";
      case "tools": return "Ferramentas e Testes";
      case "history": return "Histórico de Interações";
      case "plans": return "Planos e Permissões";
      case "integrations": return "Integrações";
      case "metrics": return "Métricas e Analytics";
      case "support": return "Suporte";
      case "logs": return "Logs do Sistema";
      case "errors": return "Monitoramento de Erros";
      case "technical": return "Configurações Técnicas";
      default: return "Painel Admin";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        {/* Top Bar */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {getSectionTitle()}
              </h1>
              <p className="text-sm text-muted-foreground">
                Logado como: <span className="font-medium">{adminEmail}</span>
              </p>
            </div>
            <div className="hidden items-center gap-4 md:flex">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">Painel Admin</div>
                <div className="text-xs text-muted-foreground">Sistema LIA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {renderSection()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
