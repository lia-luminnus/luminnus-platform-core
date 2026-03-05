import { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, X, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { enviarMensagemLIA } from '@/lib/api/lia';
import { startRealtimeSession, stopRealtimeSession } from '@/lib/api/lia-realtime';
import liaAvatar from '@/assets/lia-assistant-new.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LiaChatWindowProps {
  onClose: () => void;
}

const LiaChatWindow = ({ onClose }: LiaChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [micAtivo, setMicAtivo] = useState(false);
  const [transcricaoTemp, setTranscricaoTemp] = useState('');
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [playbookRules, setPlaybookRules] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Quais são os planos?',
    'Como funciona a integração?',
    'O que a Lia pode fazer?'
  ];

  // Criar ou recuperar conversa + carregar tenant/agente
  useEffect(() => {
    const initConversation = async () => {
      if (!user) return;

      // 1. Buscar o perfil do usuário para obter o tenant_id
      let userTenantId = user.id; // fallback: userId
      try {
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.tenant_id) {
          userTenantId = profile.tenant_id;
        }
      } catch (err) {
        console.warn('[ChatWindow] Erro ao buscar perfil:', err);
      }
      setTenantId(userTenantId);

      // 2. Buscar configurações do agente para personalizar a saudação
      let agentName = 'Lia';
      let companyName = '';
      try {
        const { data: settings } = await (supabase as any)
          .from('whatsapp_agent_settings')
          .select('agent_name, profile_json, playbooks_json')
          .eq('tenant_id', userTenantId)
          .eq('channel', 'web_widget')
          .maybeSingle();

        if (settings) {
          agentName = settings.agent_name || (settings.profile_json as any)?.agent_name || 'Lia';
        }
        // Build full playbook rules text for the LLM
        if (settings?.playbooks_json && Array.isArray(settings.playbooks_json)) {
          const allRules = settings.playbooks_json
            .filter((p: any) => p.content)
            .map((p: any) => `### ${p.name}:\n${p.content}`)
            .join('\n\n');
          if (allRules) {
            setPlaybookRules(allRules);
            console.log('[ChatWindow] ✅ Playbook rules loaded:', allRules.substring(0, 100) + '...');
          }

          const firstPlaybook = settings.playbooks_json[0];
          if (firstPlaybook?.content) {
            const nameMatch = (firstPlaybook.content as string).match(/Nome:\s*(.+)/i);
            if (nameMatch) companyName = nameMatch[1].trim();
          }
        }
      } catch (err) {
        console.warn('[ChatWindow] Erro ao buscar agent settings:', err);
      }

      // 3. Criar nova conversa
      const { data, error } = await (supabase as any)
        .from('conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (!error && (data as any)) {
        setConversationId((data as any).id);

        // Nome do usuário para saudação personalizada
        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'usuário';

        // Mensagem de boas-vindas contextualizada
        const greeting = companyName
          ? `Olá, ${userName}! 😊 Bem-vindo(a) à ${companyName}! Sou ${agentName === 'Lia' ? 'a Lia' : agentName}, como posso te ajudar hoje?`
          : `Olá, ${userName}! 😊 Sou ${agentName === 'Lia' ? 'a Lia' : agentName}, como posso te ajudar hoje?`;

        setMessages([{
          role: 'assistant' as const,
          content: greeting
        }]);
      }
    };

    initConversation();
  }, [user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup: parar sessão ao desmontar
  useEffect(() => {
    return () => {
      if (micAtivo) {
        stopRealtimeSession();
      }
    };
  }, [micAtivo]);

  const toggleMicrofone = async () => {
    try {
      if (micAtivo) {
        await stopRealtimeSession();
        setMicAtivo(false);
        setIsRealtimeActive(false);
        setTranscricaoTemp('');
        toast({
          title: 'Microfone desativado',
          description: 'Sessão de voz encerrada',
        });
      } else {
        await startRealtimeSession({
          onConnected: () => {
            setIsRealtimeActive(true);
            toast({
              title: 'Conectado!',
              description: 'Você pode falar agora',
            });
          },
          onDisconnected: () => {
            setIsRealtimeActive(false);
            setMicAtivo(false);
          },
          onTranscript: (text, isFinal) => {
            if (isFinal) {
              setMessages(prev => [...prev, {
                role: 'user',
                content: text,
              }]);
              setTranscricaoTemp('');
            } else {
              setTranscricaoTemp(text);
            }
          },
          onError: (error) => {
            toast({
              title: 'Erro',
              description: error,
              variant: 'destructive',
            });
            setMicAtivo(false);
            setIsRealtimeActive(false);
          },
        });
        setMicAtivo(true);
      }
    } catch (error) {
      console.error('[Chat] Erro ao alternar microfone:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar o microfone',
        variant: 'destructive',
      });
      setMicAtivo(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !conversationId) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Salvar mensagem do usuário
    await (supabase as any).from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: text
    });

    try {
      // Chamar API da Render com contexto do tenant + playbook rules
      const data = await enviarMensagemLIA(text, {
        conversationId: conversationId || undefined,
        userId: user?.id,
        tenantId: tenantId || undefined,
        playbookRules: playbookRules || undefined,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.text || data.reply || 'Sem resposta'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Salvar resposta da IA
      await (supabase as any).from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage.content
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Erro',
        description: 'Desculpe, ocorreu um erro. Tente novamente.',
        variant: 'destructive'
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[600px] bg-[#0B0B0F] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={liaAvatar} alt="Lia" className="w-10 h-10 rounded-full" />
          <div>
            <h3 className="font-semibold text-white">Lia</h3>
            <p className="text-xs text-white/80">
              {isRealtimeActive ? 'Voz ativa' : 'Assistente Virtual'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMicrofone}
            className={`transition-colors ${micAtivo
              ? 'text-red-400 hover:text-red-300 animate-pulse'
              : 'text-white/80 hover:text-white'
              }`}
            title={micAtivo ? 'Desativar microfone' : 'Ativar microfone'}
          >
            {micAtivo ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B0B0F]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[75%] p-3 rounded-2xl ${msg.role === 'user'
                ? 'bg-[#22D3EE]/20 border border-[#22D3EE]/30 text-white'
                : 'bg-white/5 border border-white/10 text-white/90'
                }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {msg.content}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[#22D3EE]/20 border border-[#22D3EE]/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-[#22D3EE]" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Transcrição temporária */}
      {transcricaoTemp && (
        <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-500/20">
          <p className="text-xs text-blue-400 italic flex items-center gap-2">
            <Mic className="w-3 h-3 animate-pulse" />
            Ouvindo: {transcricaoTemp}
          </p>
        </div>
      )}

      {/* Sugestões */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-white/10 bg-[#0B0B0F]">
          <p className="text-xs text-white/60 mb-2">Perguntas sugeridas:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(q)}
                className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-[#7C3AED]/20 hover:border-[#7C3AED]/50 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-[#0B0B0F]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Digite sua mensagem..."
            disabled={isTyping}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiaChatWindow;
