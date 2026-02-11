/**
 * Twilio Multi-Tenant Types
 * Tipos para o sistema de subcontas Twilio
 */

// ==========================================================
// DATABASE MODELS
// ==========================================================

export type OnboardingStatus =
    | 'pending'
    | 'provisioning'
    | 'number_search'
    | 'number_acquired'
    | 'webhook_configured'
    | 'active'
    | 'failed'
    | 'suspended';

export type OnboardingFlow = 'new_number' | 'byon';

export type BillingMode = 'start_plan' | 'plus_plan' | 'enterprise';

export type ProviderType = 'meta' | 'twilio';

export interface TwilioSubaccount {
    id: string;
    tenant_id: string;
    twilio_account_sid: string;
    twilio_auth_token_encrypted: string;
    twilio_phone_number: string | null;
    twilio_phone_sid: string | null;
    onboarding_status: OnboardingStatus;
    onboarding_flow: OnboardingFlow;
    onboarding_error: string | null;
    onboarding_steps_json: OnboardingStep[];
    billing_mode: BillingMode;
    webhook_url: string | null;
    webhook_configured_at: string | null;
    meta_waba_id: string | null;
    meta_phone_number_id: string | null;
    meta_business_id: string | null;
    friendly_name: string | null;
    created_at: string;
    updated_at: string;
    activated_at: string | null;
    suspended_at: string | null;
}

export interface OnboardingStep {
    step: string;
    old_status: string;
    new_status: string;
    timestamp: string;
    details: Record<string, any>;
}

export interface OnboardingLog {
    id: string;
    tenant_id: string;
    subaccount_id: string;
    action: string;
    status: 'pending' | 'success' | 'failed' | 'rolled_back';
    details_json: Record<string, any>;
    error_message: string | null;
    created_at: string;
}

export interface TwilioUsageDaily {
    id: string;
    tenant_id: string;
    subaccount_id: string;
    date: string;
    messages_sent: number;
    messages_received: number;
    cost_usd: number;
    created_at: string;
    updated_at: string;
}

// ==========================================================
// SERVICE TYPES
// ==========================================================

export interface SubaccountCreateResult {
    success: boolean;
    subaccountSid?: string;
    authToken?: string;
    friendlyName?: string;
    error?: string;
}

export interface NumberSearchOptions {
    countryCode: string;           // 'PT', 'BR', 'US'
    areaCode?: string;             // '351', '11'
    contains?: string;             // partial match
    smsEnabled?: boolean;
    mmsEnabled?: boolean;
    limit?: number;
}

export interface AvailableNumber {
    phoneNumber: string;           // +351912345678
    friendlyName: string;
    locality: string;
    region: string;
    country: string;
    capabilities: {
        voice: boolean;
        sms: boolean;
        mms: boolean;
    };
    price: string;                  // Monthly price
}

export interface NumberPurchaseResult {
    success: boolean;
    phoneSid?: string;
    phoneNumber?: string;
    error?: string;
}

export interface ProvisionResult {
    success: boolean;
    subaccountSid?: string;
    phoneNumber?: string;
    phoneSid?: string;
    webhookUrl?: string;
    steps: ProvisionStep[];
    error?: string;
}

export interface ProvisionStep {
    step: string;
    status: 'success' | 'failed' | 'skipped';
    details?: string;
    timestamp: string;
}

export interface ByonInitResult {
    success: boolean;
    redirectUrl?: string;
    state?: string;
    error?: string;
}

export interface MasterHealthResult {
    healthy: boolean;
    accountSid: string;
    friendlyName: string;
    status: string;
    balance?: {
        currency: string;
        balance: string;
    };
    error?: string;
}

export interface ConsumerReport {
    tenant_id: string;
    friendly_name: string;
    twilio_phone_number: string;
    billing_mode: string;
    total_sent: number;
    total_received: number;
    total_cost: number;
}

export interface TwilioMessageResult {
    success: boolean;
    messageSid?: string;
    status?: string;
    error?: string;
}

// ==========================================================
// WEBHOOK TYPES
// ==========================================================

export interface TwilioWebhookPayload {
    AccountSid: string;
    ApiVersion: string;
    Body?: string;
    From: string;
    To: string;
    MessageSid: string;
    NumMedia?: string;
    NumSegments?: string;
    SmsMessageSid?: string;
    SmsSid?: string;
    SmsStatus?: string;
    ProfileName?: string;
    WaId?: string;
    // Media fields (when NumMedia > 0)
    MediaContentType0?: string;
    MediaUrl0?: string;
    [key: string]: string | undefined;
}

export interface TwilioStatusCallback {
    AccountSid: string;
    MessageSid: string;
    MessageStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
    To: string;
    From: string;
    ErrorCode?: string;
    ErrorMessage?: string;
}

// ==========================================================
// API REQUEST/RESPONSE TYPES
// ==========================================================

export interface OnboardNewNumberRequest {
    tenant_id: string;
    country_code: string;          // 'PT' | 'BR'
    billing_mode?: BillingMode;
    friendly_name?: string;
}

export interface OnboardByonRequest {
    tenant_id: string;
    billing_mode?: BillingMode;
    friendly_name?: string;
}

export interface SearchNumbersRequest {
    country_code: string;
    area_code?: string;
    contains?: string;
    limit?: number;
}

export interface SubaccountStatusResponse {
    tenant_id: string;
    onboarding_status: OnboardingStatus;
    onboarding_flow: OnboardingFlow;
    phone_number: string | null;
    billing_mode: BillingMode;
    webhook_configured: boolean;
    activated_at: string | null;
    error: string | null;
    steps: OnboardingStep[];
}

export interface AdminBalanceResponse {
    currency: string;
    balance: string;
    account_sid: string;
    friendly_name: string;
}

export interface AdminHealthResponse {
    healthy: boolean;
    account_sid: string;
    friendly_name: string;
    status: string;
    balance: {
        currency: string;
        balance: string;
    } | null;
    timestamp: string;
}
