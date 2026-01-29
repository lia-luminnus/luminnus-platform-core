import { supabase } from '../lib/supabase';

export interface EmailOutbox {
    id: string;
    recipient_email: string;
    subject: string;
    status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'complained';
    sent_at?: string;
    error_message?: string;
    metadata?: any;
    created_at: string;
    user_id?: string;
    tenant_id?: string;
}

export const emailService = {
    /**
     * Envia um e-mail através da Edge Function email-service
     */
    async sendEmail(params: {
        to: string | string[];
        subject: string;
        html: string;
        metadata?: any;
        tenant_id?: string;
        user_id?: string;
    }) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) throw new Error('Usuário não autenticado');

        const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-service/send`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    ...params,
                    user_id: params.user_id || session.user.id,
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Falha ao enviar e-mail');
        }

        return await response.json();
    },

    /**
     * Lista o histórico de e-mails enviados
     */
    async getEmailHistory(limit = 50) {
        const { data, error } = await supabase
            .from('emails_outbox')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Erro ao buscar histórico de e-mails:', error);
            throw error;
        }

        return data as EmailOutbox[];
    },

    /**
     * Obtém detalhes de um e-mail específico, incluindo eventos
     */
    async getEmailDetails(emailId: string) {
        const { data: email, error: emailError } = await supabase
            .from('emails_outbox')
            .select('*')
            .eq('id', emailId)
            .single();

        if (emailError) throw emailError;

        const { data: events, error: eventsError } = await supabase
            .from('email_events')
            .select('*')
            .eq('external_id', email.external_id)
            .order('created_at', { ascending: true });

        if (eventsError) {
            console.warn('Erro ao buscar eventos do e-mail:', eventsError);
        }

        return {
            ...email,
            events: events || []
        };
    }
};
