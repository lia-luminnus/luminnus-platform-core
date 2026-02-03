import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail, AUTH_URLS } from "@/config/auth";

const DashboardRedirect = () => {
    useEffect(() => {
        const transferSessionAndRedirect = async () => {
            console.log("[DashboardRedirect] Iniciando transferência de sessão...");
            const dashboardUrl = AUTH_URLS.DASHBOARD;

            // Tentar obter sessão via Supabase
            let { data: { session } } = await supabase.auth.getSession();

            // Se não houver sessão no Supabase, tentar por um breve momento (race condition)
            if (!session) {
                console.log("[DashboardRedirect] Sessão não encontrada no getSession(), aguardando 500ms...");
                await new Promise(resolve => setTimeout(resolve, 500));
                const retry = await supabase.auth.getSession();
                session = retry.data.session;
            }

            const targetUrl = dashboardUrl;
            const searchParams = new URLSearchParams(window.location.search);

            if (session) {
                console.log("[DashboardRedirect] Sessão encontrada, anexando tokens.");
                searchParams.set("access_token", session.access_token);
                searchParams.set("refresh_token", session.refresh_token);
                searchParams.set("source", "auth_bridge");
            } else {
                console.warn("[DashboardRedirect] Alerta: Redirecionando sem sessão.");
            }

            const finalQuery = searchParams.toString();

            // Se targetUrl for vazio (produção sem VITE_DASHBOARD_URL), fallback para root
            const baseRedirect = targetUrl || "/";
            const finalUrl = finalQuery ? `${baseRedirect}${baseRedirect.endsWith('/') ? '' : '/'}#/?${finalQuery}` : targetUrl;

            console.log("[DashboardRedirect] Redirecionando para:", finalUrl);
            window.location.href = finalUrl;
        };

        transferSessionAndRedirect();
    }, []);

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
