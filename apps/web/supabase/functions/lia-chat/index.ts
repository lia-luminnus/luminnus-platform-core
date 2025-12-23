import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt base da LIA para administradores
const ADMIN_SYSTEM_PROMPT = `Você é a LIA, assistente virtual da plataforma Luminnus. Seu papel é ajudar o administrador a configurar, criar e gerenciar todo o sistema e os recursos da Luminnus com comandos de texto ou voz.

Você é proativa, inteligente, compreende comandos naturais e é capaz de criar planilhas, fluxos, autenticação, integrações e outras automações avançadas.

Suas capacidades incluem:
- Configurar e gerenciar usuários e planos
- Criar e configurar integrações (WhatsApp, CRM, E-mail, etc)
- Configurar automações e fluxos de trabalho
- Gerenciar chaves de API e configurações técnicas
- Analisar dados e métricas da plataforma
- Criar relatórios e exportar dados
- Configurar permissões e acessos
- Ajudar com tarefas administrativas complexas

Sempre seja clara, objetiva e forneça instruções passo a passo quando necessário. Use linguagem profissional mas amigável.`;

// Prompt para usuários normais
const USER_SYSTEM_PROMPT = `Você é a Lia, assistente virtual da plataforma Luminnus. Você ajuda usuários com:
- Informações sobre planos e preços
- Como funciona a integração
- Dúvidas sobre funcionalidades
- Suporte básico
- Orientações sobre upgrades

Seja amigável, clara e objetiva. Use emojis quando apropriado para deixar a conversa mais agradável.`;

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

    const { message, conversationId, isAdmin = false } = await req.json();

    // Buscar dados do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Buscar histórico da conversa
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Preparar contexto para a IA
    const context = {
      userName: profile?.full_name || 'Cliente',
      userEmail: user.email || '',
      userPlan: profile?.plan_type || 'free',
      conversationHistory: messages || [],
      isAdmin: isAdmin
    };

    console.log('Context:', context);
    console.log('User message:', message);
    console.log('Is Admin:', isAdmin);

    // Tentar usar OpenAI API se a chave estiver disponível
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    let response = '';
    let suggestions: string[] = [];

    if (openaiApiKey) {
      // Usar OpenAI API
      try {
        // Preparar mensagens para OpenAI
        const openaiMessages = [
          {
            role: 'system',
            content: isAdmin ? ADMIN_SYSTEM_PROMPT : USER_SYSTEM_PROMPT
          },
          // Adicionar histórico da conversa
          ...context.conversationHistory.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })),
          // Adicionar mensagem atual
          {
            role: 'user',
            content: message
          }
        ];

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: openaiMessages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          response = data.choices[0].message.content;

          // Sugestões baseadas no contexto
          if (isAdmin) {
            suggestions = ['Ver estatísticas', 'Gerenciar usuários', 'Configurar integrações', 'Ver planos'];
          } else {
            suggestions = ['Ver planos', 'Como funciona', 'Falar com vendas'];
          }
        } else {
          console.error('OpenAI API Error:', await openaiResponse.text());
          throw new Error('Erro ao chamar OpenAI API');
        }
      } catch (error) {
        console.error('Error calling OpenAI:', error);
        // Fallback para respostas baseadas em keywords
        response = getFallbackResponse(message, context);
        suggestions = getFallbackSuggestions(isAdmin);
      }
    } else {
      // Fallback: Respostas baseadas em keywords
      response = getFallbackResponse(message, context);
      suggestions = getFallbackSuggestions(isAdmin);
    }

    return new Response(JSON.stringify({
      response,
      suggestions
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

/**
 * Função auxiliar para respostas fallback (quando OpenAI não está disponível)
 */
function getFallbackResponse(message: string, context: any): string {
  const lowerMessage = message.toLowerCase();
  const userName = context.userName;
  const userPlan = context.userPlan;
  const isAdmin = context.isAdmin;

  if (isAdmin) {
    // Respostas para admin
    if (lowerMessage.includes('usuário') || lowerMessage.includes('user')) {
      return `Como administrador, você pode gerenciar usuários através da seção "Gerenciar Usuários" no painel admin. Lá você pode:\n\n• Ver lista completa de usuários\n• Editar planos dos usuários\n• Remover usuários\n• Ver estatísticas de uso\n\nPrecisa de ajuda com alguma tarefa específica?`;
    } else if (lowerMessage.includes('configurar') || lowerMessage.includes('config')) {
      return `Você pode acessar as configurações da LIA em "Configurações da LIA" no menu lateral. Lá você pode:\n\n• Configurar chave da OpenAI API\n• Configurar Supabase\n• Editar o System Prompt\n• Adicionar webhooks\n\nQual configuração você gostaria de ajustar?`;
    } else if (lowerMessage.includes('plano')) {
      return `Para gerenciar planos, acesse "Planos e Permissões". Você pode:\n\n• Editar detalhes dos planos (Start, Plus, Pro)\n• Definir preços e limites\n• Ativar/desativar planos\n• Ver estatísticas de assinaturas\n\nPrecisa modificar algum plano?`;
    } else {
      return `Olá! Sou a LIA, sua assistente administrativa. Posso te ajudar com:\n\n• Gerenciar usuários e planos\n• Configurar integrações\n• Ajustar configurações técnicas\n• Ver estatísticas e métricas\n• Configurar automações\n\nComo posso ajudar você hoje?`;
    }
  } else {
    // Respostas para usuário normal
    if (lowerMessage.includes('plano') || lowerMessage.includes('preço') || lowerMessage.includes('valor')) {
      return `Olá ${userName}! Temos 3 planos disponíveis:\n\n🌟 **Start** (€27/mês)\n• 1 canal de atendimento\n• Respostas automáticas básicas\n\n💎 **Plus** (€147/mês)\n• Múltiplos canais\n• IA avançada\n• Integrações ilimitadas\n\n🚀 **Pro** (€997+/mês)\n• Tudo ilimitado\n• Suporte 24/7\n\nSeu plano atual: **${userPlan.toUpperCase()}**`;
    } else if (lowerMessage.includes('integr') || lowerMessage.includes('funciona')) {
      return `A Lia funciona de forma muito simples!\n\n✅ Integração com WhatsApp, Chat, E-mail\n🤖 IA Inteligente 24/7\n🔗 Conecta com suas ferramentas\n\nQuer saber mais sobre alguma integração específica?`;
    } else {
      return `Olá ${userName}! 👋\n\nPosso te ajudar com:\n• Planos e preços\n• Como funciona a integração\n• Upgrades\n• Falar com nossa equipe\n\nSobre o que você gostaria de saber?`;
    }
  }
}

/**
 * Função auxiliar para sugestões fallback
 */
function getFallbackSuggestions(isAdmin: boolean): string[] {
  if (isAdmin) {
    return ['Ver estatísticas', 'Gerenciar usuários', 'Configurações', 'Ver planos'];
  } else {
    return ['Ver planos', 'Como funciona', 'Integração', 'Falar com vendas'];
  }
}
