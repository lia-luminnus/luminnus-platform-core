import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import PrivateRoute from "@/components/PrivateRoute";
import { Loader2 } from "lucide-react";

// Loading component for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0B0B0F]">
    <Loader2 className="w-8 h-8 text-[#00C2FF] animate-spin" />
  </div>
);

// Main Site Pages
const Index = lazy(() => import("@/pages/Index"));
const Plans = lazy(() => import("@/pages/Plans"));
const Auth = lazy(() => import("@/pages/Auth"));
const ClientArea = lazy(() => import("@/pages/ClientArea"));
const MyAccount = lazy(() => import("@/pages/MyAccount"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const AdminConfig = lazy(() => import("@/pages/AdminConfig"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Files = lazy(() => import("@/pages/Files"));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Discovery = lazy(() => import("@/pages/Discovery"));
const DashboardRedirect = lazy(() => import("@/components/DashboardRedirect"));

/**
 * AppRoutes Component
 *
 * Centralized routing configuration with Lazy Loading:
 * - Public routes (accessible without authentication)
 * - Admin routes (requires admin role)
 * - All pages loaded on-demand via Suspense
 */
const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ==================== PUBLIC ROUTES ==================== */}

        {/* Main Site Routes */}
        <Route path="/" element={<Index />} />
        <Route path="/planos" element={<Plans />} />
        <Route path="/descubra" element={<Discovery />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        {/* <Route path="/dashboard/*" element={<Dashboard />} /> */}
        <Route path="/area-do-cliente" element={<ClientArea />} />
        <Route path="/minha-conta" element={<MyAccount />} />
        <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
        <Route path="/termos-de-uso" element={<TermsOfService />} />

        {/* ==================== CLIENT FILES DASHBOARD ==================== */}
        <Route path="/files" element={<Files />} />

        {/* ==================== ADMIN SYSTEM ROUTES ==================== */}

        {/* Rota secreta de admin - protegida por senha */}
        <Route path="/config-lia-admin" element={<AdminConfig />} />
        {/* Painel Admin completo - protegido por email authorized */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* ==================== CATCH-ALL ROUTE ==================== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
