import { useEffect } from 'react';

const Onboarding = () => {
    useEffect(() => {
        const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3001';
        window.location.href = `${DASHBOARD_URL}/onboarding`;
    }, []);

    return null;
};

export default Onboarding;
