import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  enviarMensagemLIA,
  LiaResponse,
} from "@/lib/api/lia";
import {
  startRealtimeSession,
  stopRealtimeSession,
  isRealtimeConnected,
} from "@/lib/api/lia-realtime";
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
} from "@/lib/api/conversations";

interface LiaChatWindowAdvancedProps {
  onClose?: () => void;
}

export default function LiaChatWindowAdvanced({ onClose }: LiaChatWindowAdvancedProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Estado das conversas
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);

  // Estado da UI
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Estado da voz
  const [vozAtiva, setVozAtiva] = useState(false);
  const [micAtivo, setMicAtivo] = useState(false);
  const [transcricaoTemp, setTranscricaoTemp] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Refs
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega conversas do usuário
  useEffect(() => {
    if (user) {
      loadUserConversations();
    }
  }, [user]);

  // Carrega mensagens da conversa atual
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensagens, transcricaoTemp]);

  // Cleanup da voz ao desmontar
  useEffect(() => {
    return () => {
      if (micAtivo) {
        stopRealtimeSession();
      }
      // stopSpeaking() removido - usar WebRTC para voz
    };
  }, []);

  // Carrega conversas do usuário
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
      console.error("Erro ao carregar conversas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas conversas.",
        variant: "destructive",
      });
    }
  };

  // Carrega mensagens de uma conversa
  const loadConversationMessages = async (conversationId: string) => {
    try {
      const conv = await getConversation(conversationId);
      if (conv) {
        setMensagens(conv.messages);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens.",
        variant: "destructive",
      });
    }
  };

  // Cria nova conversa
  const handleNovaConversa = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar uma conversa.",
        variant: "destructive",
      });
      return;
    }

    try {
      const novaConv = await createConversation(user.id);
      setConversations((prev) => [novaConv, ...prev]);
      setCurrentConversationId(novaConv.id);
      setMensagens([]);
      setTexto("");
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar uma nova conversa.",
        variant: "destructive",
      });
    }
  };

  // Seleciona uma conversa
  const handleSelecionarConversa = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  // Deleta uma conversa
  const handleDeletarConversa = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      // Se deletou a conversa atual, cria uma nova
      if (conversationId === currentConversationId) {
        await handleNovaConversa();
      }

      toast({
        title: "Sucesso",
        description: "Conversa deletada com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao deletar conversa:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conversa.",
        variant: "destructive",
      });
    }
  };

  // Inicia edição de título
  const handleIniciarEdicao = (conv: Conversation) => {
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || "");
  };

  // Salva título editado
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
        title: "Sucesso",
        description: "Título atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar título:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o título.",
        variant: "destructive",
      });
    }
  };

  // Cancela edição
  const handleCancelarEdicao = () => {
    setEditingConvId(null);
    setEditingTitle("");
  };

  // Enviar mensagem
  const handleEnviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!texto.trim() || !currentConversationId) return;

    const textoEnviar = texto;
    setTexto("");
    setCarregando(true);

    // Adiciona mensagem do usuário
    const novaMensagemUser: Message = {
      role: "user",
      content: textoEnviar,
    };
    setMensagens((prev) => [...prev, novaMensagemUser]);

    try {
      // Salva mensagem do usuário no banco
      await saveMessage(currentConversationId, "user", textoEnviar);

      // Se é a primeira mensagem, atualiza o título da conversa
      if (mensagens.length === 0) {
        const titulo = generateConversationTitle(textoEnviar);
        await updateConversationTitle(currentConversationId, titulo);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversationId ? { ...c, title: titulo } : c
          )
        );
      }

      // Envia para a LIA
      const resposta: LiaResponse = await enviarMensagemLIA(textoEnviar);
      const conteudoResposta =
        resposta.response || resposta.reply || resposta.text || resposta.message || "Sem resposta";

      // Adiciona resposta da LIA
      const novaMensagemLia: Message = {
        role: "assistant",
        content: conteudoResposta,
      };
      setMensagens((prev) => [...prev, novaMensagemLia]);

      // Salva resposta no banco
      await saveMessage(currentConversationId, "assistant", conteudoResposta);

      // Auto-speak removido - usar WebRTC para voz bidirecional
    } catch (err) {
      console.error("Erro no envio:", err);
      const mensagemErro = "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.";
      setMensagens((prev) => [
        ...prev,
        { role: "assistant", content: mensagemErro },
      ]);

      toast({
        title: "Erro",
        description: mensagemErro,
        variant: "destructive",
      });
    } finally {
      setCarregando(false);
      inputRef.current?.focus();
    }
  };

  // Alternar microfone
  const toggleMicrofone = async () => {
    // Verificação removida - usar WebRTC diretamente
    try {
      if (micAtivo) {
        await stopRealtimeSession();
        setMicAtivo(false);
        setTranscricaoTemp("");
      } else {
        await startRealtimeSession(
          {
            onTranscript: (text, isFinal) => {
              if (isFinal) {
                setTexto((prev) => prev + " " + text);
                setTranscricaoTemp("");
              } else {
                setTranscricaoTemp(text);
              }
            },
            onError: (error) => {
              console.error("Erro de voz:", error);
              toast({
                title: "Erro",
                description: error,
                variant: "destructive",
              });
              setMicAtivo(false);
            },
          }
        );
        setMicAtivo(true);
        setVozAtiva(true);
      }
    } catch (err) {
      console.error("Erro ao alternar microfone:", err);
      toast({
        title: "Erro",
        description: "Não foi possível ativar o microfone. Verifique as permissões.",
        variant: "destructive",
      });
      setMicAtivo(false);
    }
  };

  // Alternar auto-speak
  const toggleAutoSpeak = () => {
    setAutoSpeak((prev) => !prev);
    // Verificação removida - usar WebRTC para voz
  };

  // Falar mensagem específica
  const handleSpeakMessage = async (content: string) => {
    // Função removida - usar WebRTC para voz bidirecional
    console.log('Speak message:', content);
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar de conversas */}
      {sidebarOpen && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Header da sidebar */}
          <div className="p-4 border-b border-gray-200">
            <Button
              onClick={handleNovaConversa}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              Nova Conversa
            </Button>
          </div>

          {/* Lista de conversas */}
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleSelecionarConversa(conv.id)}
              >
                {editingConvId === conv.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleSalvarTitulo(conv.id);
                        if (e.key === "Escape") handleCancelarEdicao();
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleSalvarTitulo(conv.id)}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={handleCancelarEdicao}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-gray-500">
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
                        className="h-6 w-6 p-0"
                        onClick={() => handleIniciarEdicao(conv)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={() => handleDeletarConversa(conv.id)}
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

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col">
        {/* Header do chat */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {conversations.find((c) => c.id === currentConversationId)?.title || "LIA Chat"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoSpeak ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoSpeak}
              title={autoSpeak ? "Desativar fala automática" : "Ativar fala automática"}
            >
              {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Área de mensagens */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
        >
          {mensagens.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              <p className="text-lg font-medium mb-2">Olá! 👋</p>
              <p>Inicie uma conversa com a LIA...</p>
            </div>
          )}

          {mensagens.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`group relative max-w-[80%] p-4 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.role === "assistant" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 text-xs"
                    onClick={() => handleSpeakMessage(msg.content)}
                  >
                    <Volume2 className="w-3 h-3 mr-1" />
                    Ouvir
                  </Button>
                )}
              </div>
            </div>
          ))}

          {carregando && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-4 rounded-2xl flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">LIA está pensando...</span>
              </div>
            </div>
          )}

          {transcricaoTemp && (
            <div className="flex justify-end">
              <div className="bg-primary/50 text-white p-3 rounded-2xl max-w-[80%] italic">
                {transcricaoTemp}
              </div>
            </div>
          )}
        </div>

        {/* Campo de envio */}
        <form
          onSubmit={handleEnviar}
          className="bg-white border-t border-gray-200 p-4"
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={micAtivo ? "default" : "outline"}
              onClick={toggleMicrofone}
              className={micAtivo ? "bg-red-500 hover:bg-red-600" : ""}
              title={micAtivo ? "Desativar microfone" : "Ativar microfone"}
            >
              {micAtivo ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            <Input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite sua mensagem ou use o microfone..."
              className="flex-1"
              disabled={carregando}
            />

            <Button type="submit" disabled={carregando || !texto.trim()}>
              {carregando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
