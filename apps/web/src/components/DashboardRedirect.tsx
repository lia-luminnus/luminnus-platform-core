import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail, AUTH_URLS } from "@/config/auth";
import { useAuth } from "@/contexts/AuthContext";

const DashboardRedirect = () => {
    const { session, loading } = useAuth();

    useEffect(() => {
        // Aguardar o AuthContext carregar a sessão
        if (loading) {
            console.log("[DashboardRedirect] Aguardando AuthContext carregar...");
            return;
        }

        const transferSessionAndRedirect = async () => {
            console.log("[DashboardRedirect] Iniciando transferência de sessão...");
            const dashboardUrl = AUTH_URLS.DASHBOARD;

            // Usar a sessão do AuthContext (mais confiável que getSession() direto)
            let currentSession = session;

            // Fallback: Se não veio do context, tenta direto
            if (!currentSession) {
                console.log("[DashboardRedirect] Sessão não no context, tentando getSession()...");
                const { data } = await supabase.auth.getSession();
                currentSession = data.session;
            }

            // 🔄 CRÍTICO: Forçar refresh do token para garantir que está válido
            if (currentSession) {
                console.log("[DashboardRedirect] 🔄 Forçando refresh de token antes do redirect...");
                try {
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshData.session && !refreshError) {
                        currentSession = refreshData.session;
                        console.log("[DashboardRedirect] ✅ Token atualizado com sucesso!");
                    } else if (refreshError) {
                        console.warn("[DashboardRedirect] ⚠️ Falha no refresh:", refreshError.message);
                    }
                } catch (err) {
                    console.warn("[DashboardRedirect] ⚠️ Exceção no refresh:", err);
                }
            }

            const searchParams = new URLSearchParams(window.location.search);

            if (currentSession) {
                console.log("[DashboardRedirect] ✅ Sessão encontrada, anexando tokens.");
                searchParams.set("access_token", currentSession.access_token);
                searchParams.set("refresh_token", currentSession.refresh_token);
                searchParams.set("source", "auth_bridge");
            } else {
                console.warn("[DashboardRedirect] ⚠️ Alerta: Redirecionando sem sessão.");
            }

            // Preservar admin_access se presente na URL original
            const originalParams = new URLSearchParams(window.location.search);
            if (originalParams.has('admin_access')) {
                searchParams.set("admin_access", originalParams.get('admin_access')!);
                console.log("[DashboardRedirect] ✅ Admin access detectado, preservando parâmetro.");
            }

            const finalQuery = searchParams.toString();

            // DashboardAuthContext expects tokens in HashRouter format:
            // Method 1: /#/?access_token=... (preferred)
            const baseRedirect = dashboardUrl || "/";
            const finalUrl = finalQuery
                ? `${baseRedirect}${baseRedirect.endsWith('/') ? '' : '/'}#/?${finalQuery}`
                : dashboardUrl;

            console.log("[DashboardRedirect] Redirecionando para:", finalUrl);
            console.log("[DashboardRedirect] Tokens incluídos:", {
                hasAccessToken: searchParams.has('access_token'),
                hasRefreshToken: searchParams.has('refresh_token'),
                source: searchParams.get('source'),
                adminAccess: searchParams.get('admin_access')
            });
            window.location.href = finalUrl;
        };

        transferSessionAndRedirect();
    }, [session, loading]);

    return (
        <div className="flex h-screen items-center justify-center bg-[#0A0F1A]">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white font-medium">Redirecionando para o seu Dashboard...</p>
                <p className="text-white/50 text-sm mt-2">Sincronizando conta de acesso segura</p>
            </div>
        </div>
    );
};

export default DashboardRedirect;

