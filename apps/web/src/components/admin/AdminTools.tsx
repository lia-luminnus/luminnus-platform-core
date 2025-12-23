import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Loader2, Terminal, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { enviarMensagemLIA } from "@/lib/api/lia";
import { secureStorage } from "@/lib/secureStorage";

interface TestMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const AdminTools = () => {
  const { toast } = useToast();
  const [testMessage, setTestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<TestMessage[]>([]);

  const handleSendTest = async () => {
    if (!testMessage.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Digite uma mensagem para testar a LIA.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se a URL da API está configurada
    const config = secureStorage.load();
    if (!config?.liaApiUrl) {
      toast({
        title: "Configuração necessária",
        description: "⚠️ A API da LIA não está configurada. Vá em Configurações da LIA e adicione a URL da API.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    // Adiciona mensagem do usuário
    const userMessage: TestMessage = {
      id: Date.now().toString(),
      type: "user",
      content: testMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Envia mensagem para a API da LIA (Render)
      const resposta = await enviarMensagemLIA(testMessage);

      // Extrair texto da resposta (pode estar em diferentes campos)
      const respostaTexto = resposta.response || resposta.text || resposta.message || "Sem resposta";

      // Adiciona resposta da assistente
      const assistantMessage: TestMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: respostaTexto,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTestMessage("");

      toast({
        title: "Teste enviado",
        description: "A LIA respondeu com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao testar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });

      // Mensagem de erro simulada
      const errorMessage: TestMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `⚠️ Erro: ${error instanceof Error ? error.message : "Falha ao conectar com a LIA"}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    toast({
      title: "Log limpo",
      description: "Todas as mensagens de teste foram removidas.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-purple-900">
          Ferramentas e Testes
        </h2>
        <p className="text-muted-foreground">
          Teste a LIA diretamente e visualize as respostas em tempo real
        </p>
      </div>

      {/* Test Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Console de Teste
          </CardTitle>
          <CardDescription>
            Envie mensagens de teste diretamente para a LIA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-message">Mensagem de Teste</Label>
            <Textarea
              id="test-message"
              placeholder="Digite uma mensagem para testar a LIA..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={4}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleSendTest();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Pressione Ctrl + Enter para enviar rapidamente
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSendTest}
              disabled={isSending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Teste
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearMessages} disabled={messages.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Log */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Respostas</CardTitle>
          <CardDescription>
            Histórico de mensagens de teste ({messages.length} mensagens)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Nenhuma mensagem de teste ainda. Envie uma mensagem acima.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-4 ${
                      msg.type === "user"
                        ? "bg-purple-100 text-purple-900"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase">
                        {msg.type === "user" ? "Você (Admin)" : "LIA"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString("pt-BR")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Test Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Comandos Rápidos</CardTitle>
          <CardDescription>
            Clique para testar respostas comuns rapidamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Olá, tudo bem?",
              "Quais são os planos disponíveis?",
              "Como funciona a integração com WhatsApp?",
              "Preciso de ajuda com agendamentos",
              "Quero fazer um upgrade de plano",
              "Como usar as automações?",
            ].map((cmd) => (
              <Button
                key={cmd}
                variant="outline"
                size="sm"
                onClick={() => setTestMessage(cmd)}
                className="justify-start text-left"
              >
                {cmd}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
