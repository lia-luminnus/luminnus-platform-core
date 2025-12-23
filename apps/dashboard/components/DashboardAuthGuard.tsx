import React, { useEffect, useState } from 'react';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { Loader2 } from 'lucide-react';

const ADMIN_EMAILS = ["luminnus.lia.ai@gmail.com"];

interface AuthGuardProps {
    children: React.ReactNode;
}

export const DashboardAuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { user, plan, loading, initialized, profile, onboardingCompleted } = useDashboardAuth();
    const [waitExpired, setWaitExpired] = useState(false);

    // Safety timeout - if we're still waiting after 15s, proceed with whatever we have
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!initialized || profile === null) {
                console.warn('[DashboardAuthGuard] Safety timeout expired');
                setWaitExpired(true);
            }
        }, 15000);
        return () => clearTimeout(timeout);
    }, [initialized, profile]);

    // 1. Still loading initially - show spinner
    if ((loading || !initialized) && !waitExpired) {
        console.log('[DashboardAuthGuard] Loading...', { loading, initialized, waitExpired });
        return (
            <div className="flex h-screen items-center justify-center bg-[#0A0F1A]">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    // 2. Not authenticated -> redirect to main site login
    if (!user) {
        console.log('[DashboardAuthGuard] No user, redirecting to login');
        window.location.href = 'http://localhost:8080/auth';
        return (
            <div className="flex h-screen items-center justify-center bg-[#0A0F1A]">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="ml-4 text-white">Redirecionando para login...</p>
            </div>
        );
    }

    // 3. Profile is still loading (but user exists) - brief wait
    // Note: We don't block indefinitely; after initialized is true, we proceed
    if (profile === null && !waitExpired) {
        console.log('[DashboardAuthGuard] Waiting for profile (max 5s more)...');
        // We already have user, so profile should come soon from refreshProfile
        return (
            <div className="flex h-screen items-center justify-center bg-[#0A0F1A]">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    // 4. Admin/CEO -> Full access bypass (no plan check)
    const isCeo = user.email && ADMIN_EMAILS.includes(user.email);
    console.log('[DashboardAuthGuard] Access granted:', {
        email: user.email,
        isCeo,
        plan: plan?.id,
        onboardingCompleted,
        profileId: profile?.id || 'none'
    });

    if (isCeo) {
        console.log('[DashboardAuthGuard] CEO bypass active for:', user.email);
        return <>{children}</>;
    }

    // 5. Regular user - allow access (onboarding/plan checks happen in routing)
    return <>{children}</>;
};
