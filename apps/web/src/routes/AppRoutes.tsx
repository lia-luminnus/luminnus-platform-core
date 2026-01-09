import { Routes, Route } from "react-router-dom";
import PrivateRoute from "@/components/PrivateRoute";

// Main Site Pages
import Index from "@/pages/Index";
import Plans from "@/pages/Plans";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import ClientArea from "@/pages/ClientArea";
import MyAccount from "@/pages/MyAccount";
import NotFound from "@/pages/NotFound";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import AdminConfig from "@/pages/AdminConfig";
import AdminDashboard from "@/pages/AdminDashboard";
import Files from "@/pages/Files";
import OAuthCallback from "@/pages/OAuthCallback";

/**
 * AppRoutes Component
 *
 * Centralized routing configuration with:
 * - Public routes (accessible without authentication)
 * - Admin routes (requires admin role)
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* ==================== PUBLIC ROUTES ==================== */}

      {/* Main Site Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/planos" element={<Plans />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
      <Route path="/area-do-cliente" element={<ClientArea />} />
      <Route path="/minha-conta" element={<MyAccount />} />
      <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
      <Route path="/termos-de-uso" element={<TermsOfService />} />

      {/* ==================== CLIENT FILES DASHBOARD ==================== */}
      <Route path="/files" element={<Files />} />

      {/* ==================== ADMIN SYSTEM ROUTES ==================== */}

      {/* Rota secreta de admin - protegida por senha */}
      <Route path="/config-lia-admin" element={<AdminConfig />} />
      {/* Painel Admin completo - protegido por email autorizado */}
      <Route path="/admin-dashboard" element={<AdminDashboard />} />

      {/* ==================== CATCH-ALL ROUTE ==================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


export default AppRoutes;
