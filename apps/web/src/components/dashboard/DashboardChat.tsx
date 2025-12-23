import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Bot, Send, Loader2, User, AlertCircle, Code2, Trash2, Settings, Sparkles,
  Mic, MicOff, Volume2, VolumeX, Plus, MessageSquare, Edit2, Check, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserPlanLimits } from '@/hooks/useUserPlanLimits';
import { useNavigate } from 'react-router-dom';
import { enviarMensagemLIA, LiaResponse } from '@/lib/api/lia';
import {
  startRealtimeSession,
  stopRealtimeSession,
  isRealtimeConnected,
} from '@/lib/api/lia-realtime';
import {
  createConversation,
  listConversations,
  getConversation,
  saveMessage,
  deleteConversation,
  updateConversationTitle,
  generateConversationTitle,
  Conversation,
  Message,
} from '@/lib/api/conversations';

/**
 * INTERFACE: Mensagem de Chat
 */
interface ChatMessage {
  id?: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

/**
 * COMPONENTE: DashboardChat
 *
 * Interface de chat com a Lia com bolhas de conversa
 * Integração com API e persistência no Supabase
 * Funcionalidades: Voz bidirecional + Múltiplas conversas
 */
const DashboardChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canUseFeature, incrementUsage, getRemainingUsage } = useUserPlanLimits();

  // Estado das conversas
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado da UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Estado da voz
  const [micAtivo, setMicAtivo] = useState(false);
  const [transcricaoTemp, setTranscricaoTemp] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * EFEITO: Scroll automático para última mensagem
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, transcricaoTemp]);

  /**
   * EFEITO: Carregar conversas do usuário
   */
  useEffect(() => {
    if (user) {
      loadUserConversations();
    }
  }, [user]);

  /**
   * EFEITO: Carregar mensagens da conversa atual
   */
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    }
  }, [currentConversationId]);

  /**
   * EFEITO: Auto-resize textarea
   */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [inputMessage]);

  /**
   * EFEITO: Cleanup da voz ao desmontar
   */
  useEffect(() => {
    return () => {
      if (micAtivo) {
        stopRealtimeSession();
      }
      // stopSpeaking() removido - usar WebRTC para voz
    };
  }, []);

  /**
   * FUNÇÃO: Carregar conversas do usuário
   */
  const loadUserConversations = async () => {
    if (!user) return;

    try {
      const convs = await listConversations(user.id);
      setConversations(convs);

      // Se não houver conversas, cria uma nova
      if (convs.length === 0) {
        await handleNovaConversa();
      } else {
        // Seleciona a conversa mais recente
        setCurrentConversationId(convs[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar suas conversas.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Carregar mensagens de uma conversa
   */
  const loadConversationMessages = async (conversationId: string) => {
    try {
      const conv = await getConversation(conversationId);
      if (conv && conv.messages.length > 0) {
        setMessages(conv.messages);
      } else {
        // Mensagem de boas-vindas
        const welcomeMessage: ChatMessage = {
          role: 'assistant',
          content: 'Olá! Sou a Lia, sua assistente inteligente. Como posso ajudá-lo hoje?',
          created_at: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as mensagens.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Criar nova conversa
   */
  const handleNovaConversa = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para criar uma conversa.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const novaConv = await createConversation(user.id);
      setConversations((prev) => [novaConv, ...prev]);
      setCurrentConversationId(novaConv.id);
      setMessages([]);
      setInputMessage('');
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
   * FUNÇÃO: Selecionar uma conversa
   */
  const handleSelecionarConversa = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  /**
   * FUNÇÃO: Deletar uma conversa
   */
  const handleDeletarConversa = async (conversationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      // Se deletou a conversa atual, cria uma nova
      if (conversationId === currentConversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
        } else {
          await handleNovaConversa();
        }
      }

      toast({
        title: 'Sucesso',
        description: 'Conversa deletada com sucesso.',
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
   * FUNÇÃO: Iniciar edição de título
   */
  const handleIniciarEdicao = (conv: Conversation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || '');
  };

  /**
   * FUNÇÃO: Salvar título editado
   */
  const handleSalvarTitulo = async (conversationId: string) => {
    if (!editingTitle.trim()) {
      setEditingConvId(null);
      return;
    }

    try {
      await updateConversationTitle(conversationId, editingTitle);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, title: editingTitle } : c
        )
      );
      setEditingConvId(null);
      toast({
        title: 'Sucesso',
        description: 'Título atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar título:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o título.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Cancelar edição
   */
  const handleCancelarEdicao = () => {
    setEditingConvId(null);
    setEditingTitle('');
  };

  /**
   * FUNÇÃO: Enviar mensagem
   */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!inputMessage.trim() || !currentConversationId || !user) return;

    // Verificar limites do plano
    if (!canUseFeature('mensagens')) {
      toast({
        title: 'Limite de mensagens atingido',
        description: 'Você atingiu o limite do seu plano. Faça upgrade para continuar.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Adicionar mensagem do usuário à lista
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Salvar mensagem do usuário no banco
      await saveMessage(currentConversationId, 'user', userMessage);
      await incrementUsage('mensagens');

      // Se é a primeira mensagem, atualiza o título da conversa
      if (messages.length <= 1) {
        const titulo = generateConversationTitle(userMessage);
        await updateConversationTitle(currentConversationId, titulo);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversationId ? { ...c, title: titulo } : c
          )
        );
      }

      // Envia para a LIA
      const resposta: LiaResponse = await enviarMensagemLIA(userMessage);
      const conteudoResposta =
        resposta.response || resposta.reply || resposta.text || resposta.message || 'Sem resposta';

      // Adiciona resposta da LIA
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: conteudoResposta,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Salva resposta no banco
      await saveMessage(currentConversationId, 'assistant', conteudoResposta);

      // Auto-speak removido - usar WebRTC para voz bidirecional
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * FUNÇÃO: Alternar microfone
   */
  const toggleMicrofone = async () => {
    // Verificação removida - usar WebRTC diretamente
    try {
      if (micAtivo) {
        await stopRealtimeSession();
        setMicAtivo(false);
        setTranscricaoTemp('');
      } else {
        await startRealtimeSession(
          {
            onTranscript: (text, isFinal) => {
              if (isFinal) {
                setInputMessage((prev) => (prev + ' ' + text).trim());
                setTranscricaoTemp('');
              } else {
                setTranscricaoTemp(text);
              }
            },
            onError: (error) => {
              console.error('Erro de voz:', error);
              toast({
                title: 'Erro',
                description: error,
                variant: 'destructive',
              });
              setMicAtivo(false);
            },
          }
        );
        setMicAtivo(true);
      }
    } catch (err) {
      console.error('Erro ao alternar microfone:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar o microfone. Verifique as permissões.',
        variant: 'destructive',
      });
      setMicAtivo(false);
    }
  };

  /**
   * FUNÇÃO: Alternar auto-speak
   */
  const toggleAutoSpeak = () => {
    // Verificação removida - usar WebRTC para voz
    setAutoSpeak((prev) => !prev);
  };

  /**
   * FUNÇÃO: Falar mensagem específica
   */
  const handleSpeakMessage = async (content: string) => {
    // Função removida - usar WebRTC para voz bidirecional
    console.log('Speak message:', content);
  };

  /**
   * FUNÇÃO: Formatar timestamp
   */
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * FUNÇÃO: Limpar conversa
   */
  const handleClearChat = async () => {
    if (!currentConversationId) return;

    try {
      await deleteConversation(currentConversationId);
      await handleNovaConversa();

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
   * FUNÇÃO: Ativar modo código
   */
  const handleCodeMode = () => {
    setInputMessage('/codigo ');
    toast({
      title: 'Modo Código Ativado',
      description: 'A LIA está pronta para ajudar com programação!',
    });
  };

  /**
   * FUNÇÃO: Sugestão rápida
   */
  const handleQuickSuggestion = () => {
    setInputMessage('Como você pode me ajudar?');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Bot className="w-8 h-8 text-[#00C2FF]" />
            Chat com a Lia
          </h1>
          <p className="text-white/60">
            Converse com sua assistente inteligente - Agora com voz!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoSpeak ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoSpeak}
            title={autoSpeak ? "Desativar fala automática" : "Ativar fala automática"}
            className="text-white"
          >
            {autoSpeak ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
            {autoSpeak ? "Voz Ativa" : "Ativar Voz"}
          </Button>
        </div>
      </div>

      {/* ALERTA DE USO */}
      {(() => {
        const remaining = getRemainingUsage('mensagens');
        if (remaining !== 'unlimited' && remaining <= 10) {
          return (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200">
                Você tem apenas {remaining} mensagens restantes no seu plano.{' '}
                <button
                  onClick={() => navigate('/dashboard/plano')}
                  className="underline font-medium hover:text-yellow-100"
                >
                  Faça upgrade
                </button>
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}

      {/* LAYOUT PRINCIPAL */}
      <div className="flex gap-4 h-[calc(100vh-300px)]">
        {/* SIDEBAR DE CONVERSAS */}
        {sidebarOpen && (
          <div className="w-64 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl flex flex-col overflow-hidden">
            {/* Header da sidebar */}
            <div className="p-4 border-b border-white/10">
              <Button
                onClick={handleNovaConversa}
                className="w-full flex items-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Nova Conversa
              </Button>
            </div>

            {/* Lista de conversas */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                    currentConversationId === conv.id
                      ? "bg-gradient-to-r from-[#7C3AED]/20 to-[#FF2E9E]/20 border border-[#7C3AED]/30"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => handleSelecionarConversa(conv.id)}
                >
                  {editingConvId === conv.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-7 text-sm bg-white/10 border-white/20 text-white"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === "Enter") handleSalvarTitulo(conv.id);
                          if (e.key === "Escape") handleCancelarEdicao();
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-white hover:bg-white/20"
                        onClick={() => handleSalvarTitulo(conv.id)}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-white hover:bg-white/20"
                        onClick={handleCancelarEdicao}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 mt-0.5 text-white/60 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-white">{conv.title}</p>
                          <p className="text-xs text-white/50">
                            {new Date(conv.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/20"
                          onClick={(e) => handleIniciarEdicao(conv, e)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={(e) => handleDeletarConversa(conv.id, e)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÁREA DE CHAT */}
        <div className="flex-1 flex flex-col">
          {/* ÁREA DE MENSAGENS */}
          <Card className="flex-1 bg-white/5 backdrop-blur-lg border border-white/10 overflow-hidden">
            <CardContent className="h-full overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {/* Avatar da Lia */}
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#6A00FF] via-[#8B5CF6] to-[#00C2FF] flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  {/* Bolha de mensagem */}
                  <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} group`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-[#7C3AED] via-[#9333EA] to-[#FF2E9E] text-white shadow-purple-500/20'
                          : 'bg-white/10 text-white border border-white/20 backdrop-blur-sm shadow-black/20'
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs mt-1.5 px-2 ${message.role === 'user' ? 'text-white/50' : 'text-white/40'}`}>
                        {formatTime(message.created_at)}
                      </span>
                      {message.role === 'assistant' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 text-xs text-white/60 hover:text-white"
                          onClick={() => handleSpeakMessage(message.content)}
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          Ouvir
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Avatar do Usuário */}
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#FF2E9E] via-[#D946EF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-pink-500/30">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#6A00FF] via-[#8B5CF6] to-[#00C2FF] flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white/10 text-white border border-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg shadow-black/20">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transcrição temporária */}
              {transcricaoTemp && (
                <div className="flex justify-end animate-in fade-in duration-200">
                  <div className="bg-gradient-to-br from-[#7C3AED]/50 via-[#9333EA]/50 to-[#FF2E9E]/50 text-white rounded-2xl px-5 py-3 max-w-[75%] italic border border-white/30">
                    {transcricaoTemp}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>
          </Card>

          {/* ÁREA DE INPUT - Estilo ChatGPT */}
          <div className="mt-4 space-y-3">
            {/* Opções Interativas */}
            <div className="flex items-center justify-center gap-2 px-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-full px-3 py-1.5 h-auto"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                {sidebarOpen ? 'Ocultar' : 'Mostrar'} Conversas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCodeMode}
                className="text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-full px-3 py-1.5 h-auto"
              >
                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                Modo Código
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-full px-3 py-1.5 h-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Limpar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleQuickSuggestion}
                className="text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-full px-3 py-1.5 h-auto"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Sugestões
              </Button>
            </div>

            {/* Input Container */}
            <div className="max-w-4xl mx-auto w-full px-4">
              <form onSubmit={handleSendMessage} className="relative">
                <div className="relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl shadow-black/20 focus-within:border-[#00C2FF]/50 focus-within:shadow-[#00C2FF]/20 transition-all duration-200">
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
                    placeholder="Digite sua mensagem para a LIA ou use o microfone..."
                    disabled={loading}
                    rows={1}
                    className="resize-none bg-transparent border-0 text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 pr-24 py-4 px-6 text-[15px] leading-relaxed max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                    style={{ minHeight: '56px' }}
                  />
                  <div className="absolute right-2 bottom-2 flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={toggleMicrofone}
                      className={`h-10 w-10 rounded-full transition-all duration-200 ${
                        micAtivo
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                      title={micAtivo ? "Desativar microfone" : "Ativar microfone"}
                    >
                      {micAtivo ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !inputMessage.trim()}
                      size="icon"
                      className="h-10 w-10 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90 disabled:opacity-40 transition-all duration-200 shadow-lg shadow-purple-500/30"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Hint text */}
            <p className="text-center text-xs text-white/40 px-4">
              Pressione <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50">Enter</kbd> para enviar, <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/50">Shift + Enter</kbd> para quebrar linha
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardChat;
