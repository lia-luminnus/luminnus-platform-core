/**
 * Facebook SDK TypeScript declarations
 */

interface FBLoginStatus {
    status: 'connected' | 'not_authorized' | 'unknown';
    authResponse?: {
        accessToken: string;
        userID: string;
        expiresIn: number;
        signedRequest: string;
        graphDomain?: string;
    };
}

interface FBLoginOptions {
    scope?: string;
    return_scopes?: boolean;
    enable_profile_selector?: boolean;
    profile_selector_ids?: string;
    auth_type?: string;
    extras?: {
        setup?: {
            phone_number?: string;
        };
    };
}

interface FBSDK {
    init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
    }) => void;
    login: (
        callback: (response: FBLoginStatus) => void,
        options?: FBLoginOptions
    ) => void;
    logout: (callback?: () => void) => void;
    getLoginStatus: (callback: (response: FBLoginStatus) => void) => void;
}

declare global {
    interface Window {
        FB?: FBSDK;
        fbAsyncInit?: () => void;
    }
}

export { };
