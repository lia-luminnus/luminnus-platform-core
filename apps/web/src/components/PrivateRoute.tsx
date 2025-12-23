import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  children: ReactNode;
  role?: "cliente" | "admin";
  redirectTo?: string;
}

/**
 * PrivateRoute component for protecting routes based on authentication and role
 *
 * @param children - The component to render if authorized
 * @param role - Optional role requirement ("cliente" or "admin")
 * @param redirectTo - Optional custom redirect path (default: /imobiliaria/login)
 */
const PrivateRoute = ({ children, role, redirectTo = "/imobiliaria/login" }: PrivateRouteProps) => {
  const { user, loading, role: userRole } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticacao...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role if specified
  if (role) {
    // Admin routes: only admins can access
    if (role === "admin" && userRole !== "admin") {
      return <Navigate to="/cliente" replace />;
    }
    // Cliente routes: both clientes and admins can access
    // (admins can view cliente area for support purposes)
    if (role === "cliente" && userRole !== "cliente" && userRole !== "admin") {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

export default PrivateRoute;
