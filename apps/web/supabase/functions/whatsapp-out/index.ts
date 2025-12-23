import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SUPABASE EDGE FUNCTION: whatsapp-out
 *
 * Endpoint mock para enviar mensagens para WhatsApp
 * Este endpoint será integrado futuramente com a API do WhatsApp Business
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { phone_number, message_content } = body;

    if (!phone_number || !message_content) {
      return new Response(JSON.stringify({
        error: 'phone_number e message_content são obrigatórios'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se o usuário tem WhatsApp conectado
    const { data: profile } = await supabase
      .from('profiles')
      .select('whatsapp_status, whatsapp_numero')
      .eq('id', user.id)
      .single();

    if (!profile || profile.whatsapp_status !== 'conectado') {
      return new Response(JSON.stringify({
        error: 'WhatsApp não está conectado. Conecte seu WhatsApp primeiro.',
        whatsapp_status: profile?.whatsapp_status || 'desconectado'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Enviando mensagem via WhatsApp:', {
      user_id: user.id,
      from: profile.whatsapp_numero,
      to: phone_number,
      message_content
    });

    // MOCK: Simular envio de mensagem
    // Futuro: Integrar com WhatsApp Business API
    const mockDelay = Math.random() * 1000 + 500; // 0.5-1.5 segundos
    await new Promise(resolve => setTimeout(resolve, mockDelay));

    // Simular 95% de sucesso, 5% de falha
    const success = Math.random() > 0.05;
    const status = success ? 'sent' : 'failed';

    // Salvar mensagem enviada no banco de dados
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: user.id,
        direction: 'outbound',
        phone_number,
        message_content,
        status,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar mensagem:', saveError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar mensagem' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!success) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Falha ao enviar mensagem (simulado)',
        data: {
          id: savedMessage.id,
          status: 'failed'
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simular atualização de status (entregue)
    setTimeout(async () => {
      await supabase
        .from('whatsapp_messages')
        .update({ status: 'delivered' })
        .eq('id', savedMessage.id);
    }, 2000);

    return new Response(JSON.stringify({
      success: true,
      message: 'Mensagem enviada com sucesso (simulado)',
      data: {
        id: savedMessage.id,
        phone_number: savedMessage.phone_number,
        message_content: savedMessage.message_content,
        status: savedMessage.status,
        sent_at: savedMessage.created_at,
      },
      mock: true,
      note: 'Este é um endpoint mock. A integração real com WhatsApp Business será implementada em breve.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
