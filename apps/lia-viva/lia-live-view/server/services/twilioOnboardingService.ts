/**
 * TwilioOnboardingService
 *
 * Gerencia o ciclo de vida de subcontas Twilio para multi-tenancy:
 * - Criar subcontas
 * - Buscar e comprar números
 * - Configurar webhooks
 * - Monitorar saúde e saldo
 *
 * IMPORTANTE: Todas as operações usam a Conta Master para gerenciar subcontas.
 * As credenciais da subconta são usadas APENAS para envio de mensagens (TwilioMessageService).
 */

import Twilio from 'twilio';
import { TwilioRepository } from '../repositories/TwilioRepository.js';
import { encryptToken, decryptToken } from './twilioEncryption.js';
import type {
    SubaccountCreateResult,
    NumberSearchOptions,
    AvailableNumber,
    NumberPurchaseResult,
    ProvisionResult,
    ProvisionStep,
    MasterHealthResult,
    ConsumerReport,
    OnboardingStatus,
} from '../types/twilio.types.js';

// ==========================================================
// CONFIG
// ==========================================================

const MASTER_ACCOUNT_SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const MASTER_AUTH_TOKEN = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const API_KEY_SID = (process.env.TWILIO_API_KEY_SID || '').trim();
const API_KEY_SECRET = (process.env.TWILIO_API_KEY_SECRET || '').trim();
const WEBHOOK_BASE_URL = (process.env.TWILIO_WEBHOOK_BASE_URL || 'https://api.luminnus.ai/api/twilio/webhook').trim();
const TWILIO_REGION = (process.env.TWILIO_REGION || '').trim();

/**
 * Obter cliente Twilio da Conta Master.
 * IMPORTANTE: Operações de Conta (criar subcontas) EXIGEM Auth Token master.
 * API Keys não têm permissão para criar outras contas.
 */
function getMasterClient(): Twilio.Twilio {
    // 1. Validar presença do par Master (Obrigatório para subcontas)
    if (!MASTER_ACCOUNT_SID || !MASTER_AUTH_TOKEN) {
        console.error('[TwilioOnboarding] ❌ Credenciais Master ausentes no process.env');
        throw new Error('[TwilioOnboarding] TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN são obrigatórios');
    }

    // Diagnóstico de Segurança (Log parcial)
    console.log('[TwilioOnboarding] 🔐 Inicializando Cliente Administrativo:', {
        sid: MASTER_ACCOUNT_SID.substring(0, 12) + '...',
        sid_len: MASTER_ACCOUNT_SID.length,
        token_len: MASTER_AUTH_TOKEN.length,
        method: 'AUTH_TOKEN',
        region: TWILIO_REGION || 'global'
    });

    // SEMPRE usar Auth Token para operações da classe TwilioOnboardingService (Subcontas)
    const options: any = {};
    if (TWILIO_REGION) {
        options.region = TWILIO_REGION;
    }

    return Twilio(MASTER_ACCOUNT_SID, MASTER_AUTH_TOKEN, options);
}

export class TwilioOnboardingService {
    // ========================================================
    // MASTER ACCOUNT — Health & Balance
    // ========================================================

    /**
     * Health check da conta master Twilio
     */
    static async healthCheck(): Promise<MasterHealthResult> {
        try {
            const client = getMasterClient();
            const account = await client.api.accounts(MASTER_ACCOUNT_SID).fetch();

            let balance: { currency: string; balance: string } | undefined;
            try {
                const balanceData = await client.balance.fetch();
                balance = {
                    currency: balanceData.currency,
                    balance: balanceData.balance,
                };
            } catch {
                console.warn('⚠️ [TwilioOnboarding] Não foi possível obter saldo');
            }

            return {
                healthy: account.status === 'active',
                accountSid: account.sid,
                friendlyName: account.friendlyName,
                status: account.status,
                balance,
            };
        } catch (err: any) {
            console.error('❌ [TwilioOnboarding] Health check falhou:', err.message);
            return {
                healthy: false,
                accountSid: MASTER_ACCOUNT_SID,
                friendlyName: 'Unknown',
                status: 'error',
                error: err.message,
            };
        }
    }

    /**
     * Obter saldo da conta master
     */
    static async getMasterBalance(): Promise<{ currency: string; balance: string }> {
        const client = getMasterClient();
        const balanceData = await client.balance.fetch();
        return {
            currency: balanceData.currency,
            balance: balanceData.balance,
        };
    }

    // ========================================================
    // SUBACCOUNT MANAGEMENT
    // ========================================================

    /**
     * Criar uma nova subconta Twilio para um tenant.
     *
     * A subconta herda o billing da conta master, mas isola custos e números.
     */
    static async createSubaccount(
        tenantId: string,
        friendlyName?: string
    ): Promise<SubaccountCreateResult> {
        const TAG = '[TwilioOnboarding.createSubaccount]';

        try {
            // Verificar se já existe
            const existing = await TwilioRepository.getByTenantId(tenantId);
            if (existing) {
                console.log(`${TAG} Subconta já existe para tenant ${tenantId}: ${existing.twilio_account_sid}`);
                return {
                    success: true,
                    subaccountSid: existing.twilio_account_sid,
                    friendlyName: existing.friendly_name || undefined,
                };
            }

            const client = getMasterClient();
            const name = friendlyName || `Luminnus-${tenantId.slice(0, 8)}`;

            console.log(`${TAG} Criando subconta Twilio: ${name}`);

            // Criar subconta via API Twilio
            const subaccount = await client.api.accounts.create({
                friendlyName: name,
            });

            console.log(`✅ ${TAG} Subconta criada: ${subaccount.sid}`);

            // Encriptar auth token antes de salvar
            const encryptedToken = encryptToken(subaccount.authToken);

            // Salvar no banco
            await TwilioRepository.createSubaccount({
                tenant_id: tenantId,
                twilio_account_sid: subaccount.sid,
                twilio_auth_token_encrypted: encryptedToken,
                friendly_name: name,
            });

            // Registrar log
            await TwilioRepository.logAction({
                tenant_id: tenantId,
                action: 'create_subaccount',
                status: 'success',
                details: {
                    sid: subaccount.sid,
                    friendly_name: name,
                },
            });

            return {
                success: true,
                subaccountSid: subaccount.sid,
                authToken: subaccount.authToken,
                friendlyName: name,
            };
        } catch (err: any) {
            console.error(`❌ ${TAG} Erro:`, err.message);
            console.error(`❌ ${TAG} Detalhes:`, {
                code: err.code,
                status: err.status,
                moreInfo: err.moreInfo,
                sid_length: MASTER_ACCOUNT_SID.length,
                token_length: MASTER_AUTH_TOKEN.length,
            });

            await TwilioRepository.logAction({
                tenant_id: tenantId,
                action: 'create_subaccount',
                status: 'failed',
                error_message: err.message,
            });

            return {
                success: false,
                error: err.message,
            };
        }
    }

    /**
     * Suspender uma subconta (soft-disable).
     */
    static async suspendSubaccount(tenantId: string): Promise<void> {
        const TAG = '[TwilioOnboarding.suspend]';

        const sub = await TwilioRepository.getByTenantId(tenantId);
        if (!sub) throw new Error(`${TAG} Subconta não encontrada para tenant ${tenantId}`);

        const client = getMasterClient();

        await client.api.accounts(sub.twilio_account_sid).update({
            status: 'suspended',
        });

        await TwilioRepository.updateStatusViaRPC(
            tenantId,
            'suspended',
            'suspend_subaccount',
            { reason: 'admin_action' }
        );

        console.log(`⏸️ ${TAG} Subconta ${sub.twilio_account_sid} suspensa`);
    }

    /**
     * Reativar uma subconta suspensa.
     */
    static async reactivateSubaccount(tenantId: string): Promise<void> {
        const TAG = '[TwilioOnboarding.reactivate]';

        const sub = await TwilioRepository.getByTenantId(tenantId);
        if (!sub) throw new Error(`${TAG} Subconta não encontrada para tenant ${tenantId}`);

        const client = getMasterClient();

        await client.api.accounts(sub.twilio_account_sid).update({
            status: 'active',
        });

        await TwilioRepository.updateStatusViaRPC(
            tenantId,
            'active',
            'reactivate_subaccount',
            { reason: 'admin_action' }
        );

        console.log(`▶️ ${TAG} Subconta ${sub.twilio_account_sid} reativada`);
    }

    /**
     * Desconectar uma subconta — fecha na Twilio e marca como 'closed' no DB.
     * Permite que o tenant reconecte com um número diferente no futuro.
     */
    static async disconnectSubaccount(tenantId: string): Promise<void> {
        const TAG = '[TwilioOnboarding.disconnect]';

        const sub = await TwilioRepository.getByTenantId(tenantId);
        if (!sub) throw new Error(`${TAG} Subconta não encontrada para tenant ${tenantId}`);

        try {
            const client = getMasterClient();

            // Fechar subconta na Twilio (status = 'closed')
            await client.api.accounts(sub.twilio_account_sid).update({
                status: 'closed',
            });
        } catch (err: any) {
            // Se falhar no Twilio, ainda assim marcar como closed no DB
            console.warn(`⚠️ ${TAG} Twilio API close falhou (continuando): ${err.message}`);
        }

        await TwilioRepository.updateStatusViaRPC(
            tenantId,
            'closed' as any,
            'disconnect_subaccount',
            { reason: 'user_disconnect', phone_number: sub.twilio_phone_number }
        );

        console.log(`🔌 ${TAG} Subconta ${sub.twilio_account_sid} desconectada para tenant ${tenantId}`);
    }

    // ========================================================
    // PHONE NUMBER MANAGEMENT
    // ========================================================

    /**
     * Buscar números de telefone disponíveis para compra.
     */
    static async searchAvailableNumbers(options: NumberSearchOptions): Promise<AvailableNumber[]> {
        const TAG = '[TwilioOnboarding.searchNumbers]';
        const client = getMasterClient();

        try {
            const searchParams: any = {};
            if (options.areaCode) searchParams.areaCode = options.areaCode;
            if (options.contains) searchParams.contains = options.contains;
            if (options.smsEnabled !== undefined) searchParams.smsEnabled = options.smsEnabled;
            if (options.mmsEnabled !== undefined) searchParams.mmsEnabled = options.mmsEnabled;

            const numbers = await client
                .availablePhoneNumbers(options.countryCode)
                .local.list({
                    ...searchParams,
                    limit: options.limit || 10,
                });

            return numbers.map((n) => ({
                phoneNumber: n.phoneNumber,
                friendlyName: n.friendlyName,
                locality: n.locality || '',
                region: n.region || '',
                country: options.countryCode,
                capabilities: {
                    voice: n.capabilities?.voice || false,
                    sms: n.capabilities?.sms || false,
                    mms: n.capabilities?.mms || false,
                },
                price: '', // Twilio doesn't return price in search
            }));
        } catch (err: any) {
            console.error(`❌ ${TAG} Erro ao buscar números (${options.countryCode}):`, err.message);
            return [];
        }
    }

    /**
     * Comprar um número de telefone e associá-lo à subconta do tenant.
     *
     * IMPORTANTE: O número é comprado na SUBCONTA, não na master.
     * Isso garante que o custo mensal do número é debitado da subconta.
     */
    static async purchaseNumber(
        tenantId: string,
        phoneNumber: string
    ): Promise<NumberPurchaseResult> {
        const TAG = '[TwilioOnboarding.purchaseNumber]';

        try {
            const sub = await TwilioRepository.getByTenantId(tenantId);
            if (!sub) throw new Error(`Subconta não encontrada para tenant ${tenantId}`);

            // Desencriptar token da subconta
            const authToken = decryptToken(sub.twilio_auth_token_encrypted);

            // Usar credenciais da SUBCONTA para comprar o número
            const subClient = Twilio(sub.twilio_account_sid, authToken);

            console.log(`${TAG} Comprando número ${phoneNumber} para subconta ${sub.twilio_account_sid}`);

            const purchased = await subClient.incomingPhoneNumbers.create({
                phoneNumber,
                smsUrl: WEBHOOK_BASE_URL,
                smsMethod: 'POST',
                statusCallback: `${WEBHOOK_BASE_URL}/status`,
                statusCallbackMethod: 'POST',
            });

            console.log(`✅ ${TAG} Número comprado: ${purchased.sid}`);

            // Atualizar banco
            await TwilioRepository.update(tenantId, {
                twilio_phone_number: phoneNumber,
                twilio_phone_sid: purchased.sid,
            } as any);

            await TwilioRepository.updateStatusViaRPC(
                tenantId,
                'number_acquired',
                'purchase_number',
                {
                    phone_number: phoneNumber,
                    phone_sid: purchased.sid,
                }
            );

            return {
                success: true,
                phoneSid: purchased.sid,
                phoneNumber,
            };
        } catch (err: any) {
            console.error(`❌ ${TAG} Erro:`, err.message);

            await TwilioRepository.logAction({
                tenant_id: tenantId,
                action: 'purchase_number',
                status: 'failed',
                error_message: err.message,
                details: { phone_number: phoneNumber },
            });

            return {
                success: false,
                error: err.message,
            };
        }
    }

    /**
     * Configurar o webhook do número para o endpoint centralizado.
     */
    static async configureWebhook(tenantId: string): Promise<void> {
        const TAG = '[TwilioOnboarding.configureWebhook]';

        const sub = await TwilioRepository.getByTenantId(tenantId);
        if (!sub) throw new Error(`${TAG} Subconta não encontrada`);
        if (!sub.twilio_phone_sid) throw new Error(`${TAG} Número não atribuído`);

        const authToken = decryptToken(sub.twilio_auth_token_encrypted);
        const subClient = Twilio(sub.twilio_account_sid, authToken);

        console.log(`${TAG} Configurando webhook para ${sub.twilio_phone_number} → ${WEBHOOK_BASE_URL}`);

        await subClient.incomingPhoneNumbers(sub.twilio_phone_sid).update({
            smsUrl: WEBHOOK_BASE_URL,
            smsMethod: 'POST',
            statusCallback: `${WEBHOOK_BASE_URL}/status`,
            statusCallbackMethod: 'POST',
        });

        await TwilioRepository.update(tenantId, {
            webhook_url: WEBHOOK_BASE_URL,
            webhook_configured_at: new Date().toISOString(),
        } as any);

        await TwilioRepository.updateStatusViaRPC(
            tenantId,
            'webhook_configured',
            'configure_webhook',
            { webhook_url: WEBHOOK_BASE_URL }
        );

        console.log(`✅ ${TAG} Webhook configurado`);
    }

    // ========================================================
    // FULL ONBOARDING FLOWS
    // ========================================================

    /**
     * Fluxo A: Provisionar número novo completo.
     *
     * Etapas:
     * 1. Criar subconta
     * 2. Buscar número disponível
     * 3. Comprar número
     * 4. Configurar webhook
     * 5. Ativar
     */
    static async provisionNewNumber(
        tenantId: string,
        countryCode: string,
        options?: {
            friendlyName?: string;
            billingMode?: string;
            areaCode?: string;
        }
    ): Promise<ProvisionResult> {
        const TAG = '[TwilioOnboarding.provisionNewNumber]';
        const steps: ProvisionStep[] = [];

        const addStep = (step: string, status: 'success' | 'failed' | 'skipped', details?: string) => {
            steps.push({ step, status, details, timestamp: new Date().toISOString() });
        };

        try {
            // Step 1: Criar subconta
            console.log(`${TAG} ▶ Step 1: Criar subconta`);
            const subResult = await TwilioOnboardingService.createSubaccount(
                tenantId,
                options?.friendlyName
            );

            if (!subResult.success) {
                addStep('create_subaccount', 'failed', subResult.error);
                throw new Error(`Falha na criação da subconta: ${subResult.error}`);
            }
            addStep('create_subaccount', 'success', subResult.subaccountSid);

            // Step 2: Buscar números disponíveis
            console.log(`${TAG} ▶ Step 2: Buscar números (${countryCode})`);
            const numbers = await TwilioOnboardingService.searchAvailableNumbers({
                countryCode,
                areaCode: options?.areaCode,
                smsEnabled: true,
                limit: 5,
            });

            if (numbers.length === 0) {
                addStep('search_numbers', 'failed', `Nenhum número disponível em ${countryCode}`);
                await TwilioOnboardingService.rollbackSubaccount(
                    subResult.subaccountSid!,
                    `Sem números disponíveis em ${countryCode}`
                );
                throw new Error(`Nenhum número disponível em ${countryCode}`);
            }
            addStep('search_numbers', 'success', `${numbers.length} números encontrados`);

            // Step 3: Comprar o primeiro número disponível
            const selectedNumber = numbers[0];
            console.log(`${TAG} ▶ Step 3: Comprar número ${selectedNumber.phoneNumber}`);
            const purchaseResult = await TwilioOnboardingService.purchaseNumber(
                tenantId,
                selectedNumber.phoneNumber
            );

            if (!purchaseResult.success) {
                addStep('purchase_number', 'failed', purchaseResult.error);
                await TwilioOnboardingService.rollbackSubaccount(
                    subResult.subaccountSid!,
                    `Falha na compra: ${purchaseResult.error}`
                );
                throw new Error(`Falha na compra do número: ${purchaseResult.error}`);
            }
            addStep('purchase_number', 'success', selectedNumber.phoneNumber);

            // Step 4: Configurar webhook
            console.log(`${TAG} ▶ Step 4: Configurar webhook`);
            await TwilioOnboardingService.configureWebhook(tenantId);
            addStep('configure_webhook', 'success', WEBHOOK_BASE_URL);

            // Step 5: Ativar
            console.log(`${TAG} ▶ Step 5: Ativar subconta`);
            await TwilioRepository.updateStatusViaRPC(
                tenantId,
                'active',
                'provision_complete',
                {
                    phone_number: selectedNumber.phoneNumber,
                    webhook_url: WEBHOOK_BASE_URL,
                }
            );
            addStep('activate', 'success');

            // Vincular subconta à whatsapp_connection (se existir)
            const sub = await TwilioRepository.getByTenantId(tenantId);
            if (sub) {
                await TwilioRepository.linkToConnection(tenantId, sub.id);
            }

            console.log(`🎉 ${TAG} Provisioning completo para tenant ${tenantId}`);

            return {
                success: true,
                subaccountSid: subResult.subaccountSid,
                phoneNumber: selectedNumber.phoneNumber,
                phoneSid: purchaseResult.phoneSid,
                webhookUrl: WEBHOOK_BASE_URL,
                steps,
            };
        } catch (err: any) {
            console.error(`❌ ${TAG} Erro no provisioning:`, err.message);

            // Marcar como falhou
            try {
                await TwilioRepository.updateStatusViaRPC(
                    tenantId,
                    'failed',
                    'provision_failed',
                    { steps },
                    err.message
                );
            } catch {
                // Ignore update errors during rollback
            }

            return {
                success: false,
                steps,
                error: err.message,
            };
        }
    }

    /**
     * Fluxo B: Iniciar BYON (Bring Your Own Number).
     * Retorna config para o frontend mostrar o Embedded Signup.
     */
    static async initByonFlow(
        tenantId: string,
        options?: {
            friendlyName?: string;
            billingMode?: string;
        }
    ): Promise<{
        success: boolean;
        subaccountSid?: string;
        message?: string;
        error?: string;
    }> {
        const TAG = '[TwilioOnboarding.initByon]';

        try {
            // Criar subconta primeiro
            const subResult = await TwilioOnboardingService.createSubaccount(
                tenantId,
                options?.friendlyName
            );

            if (!subResult.success) {
                return { success: false, error: subResult.error };
            }

            // Atualizar flow para BYON
            await TwilioRepository.update(tenantId, {
                onboarding_flow: 'byon',
                billing_mode: options?.billingMode || 'start_plan',
            } as any);

            await TwilioRepository.updateStatusViaRPC(
                tenantId,
                'pending',
                'init_byon',
                { subaccount_sid: subResult.subaccountSid }
            );

            console.log(`${TAG} BYON iniciado para tenant ${tenantId}`);

            return {
                success: true,
                subaccountSid: subResult.subaccountSid,
                message: 'Subconta criada. Aguardando associação do número via callback.',
            };
        } catch (err: any) {
            console.error(`❌ ${TAG} Erro:`, err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Callback do BYON — recebe as credenciais do número que o cliente associou.
     */
    static async handleByonCallback(
        tenantId: string,
        phoneNumber: string,
        phoneSid?: string
    ): Promise<void> {
        const TAG = '[TwilioOnboarding.byonCallback]';

        const sub = await TwilioRepository.getByTenantId(tenantId);
        if (!sub) throw new Error(`${TAG} Subconta não encontrada`);

        // Atualizar com número
        await TwilioRepository.update(tenantId, {
            twilio_phone_number: phoneNumber,
            twilio_phone_sid: phoneSid || null,
        } as any);

        // Configurar webhook
        if (sub.twilio_phone_sid || phoneSid) {
            try {
                await TwilioOnboardingService.configureWebhook(tenantId);
            } catch (err: any) {
                console.warn(`${TAG} Webhook config falhou, pode ser configurado manualmente:`, err.message);
            }
        }

        // Ativar
        await TwilioRepository.updateStatusViaRPC(
            tenantId,
            'active',
            'byon_callback_complete',
            {
                phone_number: phoneNumber,
                phone_sid: phoneSid,
            }
        );

        // Vincular
        await TwilioRepository.linkToConnection(tenantId, sub.id);

        console.log(`✅ ${TAG} BYON completo para tenant ${tenantId}: ${phoneNumber}`);
    }

    // ========================================================
    // MONITORING
    // ========================================================

    /**
     * Top consumers (subcontas com mais mensagens).
     */
    static async getTopConsumers(hours = 24, limit = 10): Promise<ConsumerReport[]> {
        return TwilioRepository.getTopConsumers(hours, limit);
    }

    /**
     * Obter uso de uma subconta específica.
     */
    static async getSubaccountUsage(tenantId: string): Promise<{
        today: { sent: number; received: number; cost: number };
        subaccount: any;
    } | null> {
        const sub = await TwilioRepository.getByTenantId(tenantId);
        if (!sub) return null;

        const today = new Date().toISOString().split('T')[0];

        // This would normally query Twilio API, but for now use local tracking
        return {
            today: { sent: 0, received: 0, cost: 0 },
            subaccount: {
                sid: sub.twilio_account_sid,
                status: sub.onboarding_status,
                phone: sub.twilio_phone_number,
                friendly_name: sub.friendly_name,
            },
        };
    }

    // ========================================================
    // ROLLBACK (PRIVATE)
    // ========================================================

    /**
     * Reverter uma subconta em caso de falha no onboarding.
     * Fecha (desativa) a subconta na Twilio para evitar custos.
     */
    private static async rollbackSubaccount(sid: string, reason: string): Promise<void> {
        const TAG = '[TwilioOnboarding.rollback]';

        try {
            const client = getMasterClient();

            // Fechar subconta (status = 'closed' na Twilio)
            await client.api.accounts(sid).update({
                status: 'closed',
            });

            console.log(`🔙 ${TAG} Subconta ${sid} revertida: ${reason}`);
        } catch (err: any) {
            // Rollback falhou — logar mas não propagar
            console.error(`❌ ${TAG} Rollback falhou para ${sid}:`, err.message);
        }
    }
}
