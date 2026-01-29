import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Loader2, User, Sparkles, Trash2, Mic, MicOff, Plus, Search, MessageSquare, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enviarMensagemLIA } from '@/lib/api/lia';
import { secureStorage } from '@/lib/secureStorage';
import { startRealtimeSession, stopRealtimeSession } from '@/lib/api/lia-realtime';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import liaAvatar from "@/assets/lia-assistant.png";

/**
 * INTERFACE: Mensagem de Chat
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * INTERFACE: Conversa
 */
interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

/**
 * COMPONENTE: AdminLiaChat
 *
 * Chat integrado com a LIA para administradores
 * Com histórico de conversas lateral e interface moderna
 */
const AdminLiaChat = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Estado de conversas
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estado de mensagens
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [micAtivo, setMicAtivo] = useState(false);
  const [transcricaoTemp, setTranscricaoTemp] = useState('');
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * EFEITO: Carregar conversas ao montar componente
   */
  useEffect(() => {
    loadConversations();
  }, []);

  /**
   * EFEITO: Scroll automático para última mensagem
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup: parar sessão ao desmontar
  useEffect(() => {
    return () => {
      if (micAtivo) {
        stopRealtimeSession();
      }
    };
  }, [micAtivo]);

  /**
   * FUNÇÃO: Carregar conversas do Supabase
   */
  const loadConversations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('admin_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        return;
      }

      if (data) {
        setConversations((data as any[]).map(conv => ({
          id: conv.id,
          title: conv.title || 'Nova Conversa',
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          message_count: conv.message_count || 0,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  /**
   * FUNÇÃO: Criar nova conversa
   */
  const createNewConversation = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('admin_conversations')
        .insert({
          title: `Conversa ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
          message_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const conv = data as any;
        setConversations(prev => [
          {
            id: conv.id,
            title: conv.title,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            message_count: 0
          },
          ...prev
        ]);
        setCurrentConversationId(conv.id);
        setMessages([]);

        toast({
          title: 'Nova conversa criada',
          description: 'Você pode começar a conversar agora.',
        });
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar uma nova conversa.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Carregar mensagens de uma conversa
   */
  const loadConversationMessages = async (conversationId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('admin_chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages((data as any[]).map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          created_at: msg.created_at,
        })));
      } else {
        setMessages([]);
      }

      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  /**
   * FUNÇÃO: Salvar mensagem no Supabase
   */
  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    try {
      const { error } = await (supabase as any)
        .from('admin_chat_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Atualizar contagem de mensagens e data de atualização da conversa
      await (supabase as any)
        .from('admin_conversations')
        .update({
          message_count: messages.length + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Atualizar lista de conversas localmente
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, message_count: conv.message_count + 1, updated_at: new Date().toISOString() }
          : conv
      ));
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
    }
  };

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
              const newUserMessage: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: text,
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, newUserMessage]);

              if (currentConversationId) {
                saveMessage(currentConversationId, 'user', text);
              }

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
      console.error('[AdminChat] Erro ao alternar microfone:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar o microfone',
        variant: 'destructive',
      });
      setMicAtivo(false);
    }
  };

  /**
   * EFEITO: Redimensionar textarea automaticamente
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [inputMessage]);

  /**
   * FUNÇÃO: Enviar mensagem via API
   */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!inputMessage.trim()) return;

    // Verificar se há uma conversa ativa
    if (!currentConversationId) {
      toast({
        title: 'Nenhuma conversa ativa',
        description: 'Crie uma nova conversa primeiro.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se a URL da API está configurada
    const config = secureStorage.load();
    if (!config?.liaApiUrl) {
      toast({
        title: 'Configuração necessária',
        description: '⚠️ A API da LIA não está configurada. Vá em Configurações da LIA e adicione a URL da API.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Adicionar mensagem do usuário à lista
    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Salvar mensagem do usuário
    await saveMessage(currentConversationId, 'user', userMessage);

    try {
      // Enviar mensagem para a LIA
      const resposta = await enviarMensagemLIA(userMessage);

      const respostaTexto = resposta.reply || resposta.response || resposta.text || resposta.message || 'Desculpe, não consegui gerar uma resposta.';

      // Adicionar resposta da LIA à lista
      const newAssistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: respostaTexto,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newAssistantMessage]);

      // Salvar resposta da LIA
      await saveMessage(currentConversationId, 'assistant', respostaTexto);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);

      const errorMsg = error instanceof Error ? error.message : 'Não foi possível enviar a mensagem';
      let userFriendlyMessage = errorMsg;

      // Detectar se é erro de timeout/hibernação
      if (errorMsg.includes('Timeout') || errorMsg.includes('acordando') || errorMsg.includes('hibernação')) {
        userFriendlyMessage = `⏱️ A API do Render está demorando para responder. Ela pode estar em modo de hibernação (cold start).\n\n💡 Aguarde alguns segundos e tente novamente. Geralmente a primeira requisição após um período de inatividade pode demorar até 1 minuto.`;
      } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        userFriendlyMessage = `❌ Erro 404: A rota /chat não foi encontrada na API.\n\n🔧 Verifique se:\n• A API está rodando no Render\n• A URL está configurada corretamente em "Configurações da LIA"\n• A variável OPENAI_API_KEY está configurada no Render`;
      } else if (errorMsg.includes('CORS') || errorMsg.includes('fetch')) {
        userFriendlyMessage = `🔒 Erro de conexão com a API.\n\n🔧 Possíveis causas:\n• CORS bloqueado\n• API offline no Render\n• URL incorreta\n\nVerifique a configuração em "Configurações da LIA"`;
      }

      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: userFriendlyMessage,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);

      setLoading(false);
      toast({
        title: '❌ Erro ao enviar mensagem',
        description: errorMsg.includes('Timeout') ? 'A API pode estar hibernada. Tente novamente em alguns segundos.' : 'Erro ao se comunicar com a API',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Formatar timestamp
   */
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  /**
   * FUNÇÃO: Limpar conversa atual
   */
  const handleClearChat = async () => {
    if (!currentConversationId) return;

    try {
      // Deletar mensagens da conversa
      await (supabase as any)
        .from('admin_chat_messages')
        .delete()
        .eq('conversation_id', currentConversationId);

      // Resetar mensagens localmente
      setMessages([]);

      // Atualizar contagem de mensagens
      await (supabase as any)
        .from('admin_conversations')
        .update({ message_count: 0 })
        .eq('id', currentConversationId);

      toast({
        title: 'Chat limpo',
        description: 'O histórico de conversa foi removido.',
      });
    } catch (error) {
      console.error('Erro ao limpar chat:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível limpar o chat.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Deletar conversa
   */
  const deleteConversation = async (conversationId: string) => {
    try {
      // Deletar mensagens
      await (supabase as any)
        .from('admin_chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Deletar conversa
      await (supabase as any)
        .from('admin_conversations')
        .delete()
        .eq('id', conversationId);

      // Atualizar lista local
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      // Se a conversa deletada era a atual, limpar
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }

      toast({
        title: 'Conversa deletada',
        description: 'A conversa foi removida permanentemente.',
      });
    } catch (error) {
      console.error('Erro ao deletar conversa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar a conversa.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Sugestão rápida
   */
  const handleQuickSuggestion = () => {
    setInputMessage('Como você pode me ajudar a gerenciar os planos?');
  };

  // Filtrar conversas pela busca
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auth Guard
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-[500px] items-center justify-center text-center p-8 bg-gray-50 rounded-2xl border border-gray-200">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Acesso Restrito</h3>
        <p className="text-gray-500 max-w-md">
          Você precisa estar logado para acessar o chat administrativo. Por favor, faça login novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
          <div className="relative w-10 h-10">
            {/* Pulse Ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-purple-500/30"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative z-10">
              <img src={liaAvatar} alt="Lia avatar" className="w-12 h-12 rounded-2xl object-cover object-top border-2 border-purple-200" />
            </div>
          </div>
          Assistente LIA - Chat Administrativo
          <Badge className="bg-purple-100 text-purple-700 border-purple-300">
            API Render
          </Badge>
        </h1>
        <p className="text-gray-600">
          Chat integrado com a LIA para administradores com histórico de conversas e voz personalizada
        </p>
      </div>

      {/* MAIN INTERFACE */}
      <div className="flex gap-4 h-[calc(100vh-280px)]">
        {/* SIDEBAR - Histórico de Conversas */}
        <Card className="w-80 flex-shrink-0 bg-white border-2 border-purple-200 shadow-xl">
          <CardContent className="p-4 h-full flex flex-col">
            {/* Header do Sidebar */}
            <div className="space-y-3 mb-4">
              <Button
                onClick={createNewConversation}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:opacity-90 shadow-lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Conversa
              </Button>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar conversas..."
                  className="pl-9 h-9 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            {/* Lista de Conversas */}
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma conversa encontrada</p>
                    <p className="text-xs mt-1">Crie uma nova conversa</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversationMessages(conv.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all group hover:shadow-md ${currentConversationId === conv.id
                        ? 'bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {conv.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {formatDate(conv.updated_at)} • {conv.message_count} msgs
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* CHAT PRINCIPAL */}
        <div className="flex-1 flex flex-col">
          {/* ÁREA DE MENSAGENS */}
          {/* ÁREA DE MENSAGENS */}
          <Card className="flex-1 bg-white border-2 border-gray-200 overflow-hidden shadow-xl mb-4 relative">
            <ScrollArea className="h-full p-6">
              {!currentConversationId ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                  <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare className="w-10 h-10 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhuma conversa selecionada</h3>
                  <p className="text-gray-500 max-w-xs">Selecione uma conversa do histórico ou inicie uma nova para falar com a LIA.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                  <div className="relative w-24 h-24 mb-6">
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-purple-500/20"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    <img src={liaAvatar} alt="Lia" className="w-full h-full rounded-2xl object-cover object-top shadow-xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Olá! Eu sou a LIA.</h3>
                  <p className="text-gray-500 max-w-sm">Estou pronta para ajudar você com insights, gestão e atendimento. Como posso ser útil hoje?</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      {/* Avatar da Lia */}
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 relative w-10 h-10">
                          {/* Pulse Ring */}
                          <motion.div
                            className="absolute inset-0 rounded-2xl bg-purple-500/30"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <div className="relative z-10">
                            <img src={liaAvatar} alt="Lia avatar" className="w-12 h-12 rounded-2xl object-cover object-top border border-white/10 shadow-lg shadow-purple-500/30" />
                          </div>
                        </div>
                      )}

                      {/* Bolha de mensagem */}
                      <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-md ${message.role === 'user'
                            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                            : 'bg-gray-100 text-gray-900 border border-gray-200'
                            }`}
                        >
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <span className={`text-xs mt-1.5 px-2 ${message.role === 'user' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {formatTime(message.created_at)}
                        </span>
                      </div>

                      {/* Avatar do Usuário */}
                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading indicator with updated Avatar */}
                  {loading && (
                    <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                      <div className="flex-shrink-0 relative w-10 h-10">
                        <motion.div
                          className="absolute inset-0 rounded-2xl bg-purple-500/30"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="relative z-10">
                          <img src={liaAvatar} alt="Lia avatar" className="w-12 h-12 rounded-2xl object-cover object-top border border-white/10 shadow-lg shadow-purple-500/30" />
                        </div>
                      </div>
                      <div className="bg-gray-100 text-gray-900 border border-gray-200 rounded-2xl px-5 py-3 shadow-md">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* ÁREA DE INPUT */}
          <div className="space-y-3">
            {/* Transcrição temporária */}
            {transcricaoTemp && (
              <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 italic flex items-center gap-2">
                  <Mic className="w-3 h-3 animate-pulse" />
                  Ouvindo: {transcricaoTemp}
                </p>
              </div>
            )}

            {/* Opções Interativas */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                disabled={!currentConversationId}
                className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all rounded-full px-3 py-1.5 h-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Limpar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMicrofone}
                className={`text-xs transition-all rounded-full px-3 py-1.5 h-auto ${micAtivo
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50 animate-pulse'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {micAtivo ? (
                  <>
                    <Mic className="w-3.5 h-3.5 mr-1.5" />
                    Ouvindo...
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 mr-1.5" />
                    Microfone
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuickSuggestion}
                className="text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all rounded-full px-3 py-1.5 h-auto"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Sugestões
              </Button>
            </div>

            {/* Input Container */}
            <div className="max-w-full">
              <form onSubmit={handleSendMessage} className="relative">
                <div className="relative bg-white border-2 border-gray-200 rounded-3xl shadow-lg focus-within:border-purple-500 focus-within:shadow-purple-200 transition-all duration-200">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={currentConversationId ? "Digite sua mensagem para a LIA..." : "Crie uma nova conversa primeiro..."}
                    disabled={loading || !currentConversationId}
                    rows={1}
                    className="resize-none bg-transparent border-0 text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 pr-14 py-4 px-6 text-[15px] leading-relaxed max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                    style={{ minHeight: '56px' }}
                  />
                  <Button
                    type="submit"
                    disabled={loading || !inputMessage.trim() || !currentConversationId}
                    size="icon"
                    className="absolute right-2 bottom-2 h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:opacity-90 disabled:opacity-40 transition-all duration-200 shadow-lg shadow-purple-500/30"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Hint text */}
            <p className="text-center text-xs text-gray-500">
              Pressione <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-300">Enter</kbd> para enviar, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-300">Shift + Enter</kbd> para quebrar linha
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLiaChat;
