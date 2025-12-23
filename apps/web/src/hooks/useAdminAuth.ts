import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = [
  "luminnus.lia.ai@gmail.com", // email autorizado como admin
];

export function useAdminAuth() {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasActivePlan, setHasActivePlan] = useState<boolean | null>(null);

  // Verificação baseada na role do AuthContext OU email hardcoded
  const isAdmin = role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email));

  // Verifica se o usuário tem plano ativo
  useEffect(() => {
    const checkUserPlan = async () => {
      if (!user || isAdmin) {
        setHasActivePlan(null);
        return;
      }

      try {
        const { data } = await supabase
          .from('planos')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'ativo')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setHasActivePlan(!!data);
      } catch (error) {
        console.error('Erro ao verificar plano:', error);
        setHasActivePlan(false);
      }
    };

    checkUserPlan();
  }, [user, isAdmin]);

  useEffect(() => {
    // Se ainda estiver carregando, não faz nada
    if (loading) return;

    // Proteção: só redireciona se estiver em rota de admin
    if (!location.pathname.startsWith("/admin-dashboard")) return;

    // Se não tiver usuário autenticado e estiver tentando acessar admin
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Redireciona não-admin para dashboard normal se tentar acessar área admin
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate, location.pathname, isAdmin]);

  return {
    isAdmin,
    isLoading: loading,
    adminEmail: user?.email || "",
    hasActivePlan,
  };
}
