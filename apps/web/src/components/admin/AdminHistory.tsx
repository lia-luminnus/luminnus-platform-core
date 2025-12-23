import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  conversation_id: string;
}

interface ConversationWithProfile {
  id: string;
  user_id: string;
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

export const AdminHistory = () => {
  const [limit, setLimit] = useState("50");

  // Query: Últimas mensagens com informações do usuário
  const { data: messages, isLoading } = useQuery({
    queryKey: ["admin-chat-history", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          id,
          role,
          content,
          created_at,
          conversation_id,
          chat_conversations (
            id,
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      // Transforma os dados para um formato mais fácil de usar
      return data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
        conversation_id: msg.conversation_id,
        user_name: msg.chat_conversations?.profiles?.full_name || "Usuário Desconhecido",
      }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-purple-900">
          Histórico de Interações
        </h2>
        <p className="text-muted-foreground">
          Visualize todas as mensagens trocadas com a LIA
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Ajuste a quantidade de mensagens exibidas</CardDescription>
            </div>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Quantidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">Últimas 25</SelectItem>
                <SelectItem value="50">Últimas 50</SelectItem>
                <SelectItem value="100">Últimas 100</SelectItem>
                <SelectItem value="200">Últimas 200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mensagens Recentes
          </CardTitle>
          <CardDescription>
            {messages?.length || 0} mensagem(ns) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] rounded-md border">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : messages?.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {messages?.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg border p-4 transition-all hover:shadow-md ${
                      msg.role === "user"
                        ? "border-l-4 border-l-blue-500 bg-blue-50"
                        : "border-l-4 border-l-purple-500 bg-purple-50"
                    }`}
                  >
                    {/* Header */}
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {msg.role === "user" ? (
                          <User className="h-4 w-4 text-blue-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-purple-600" />
                        )}
                        <span className="font-semibold text-sm">
                          {msg.role === "user" ? msg.user_name : "LIA Assistant"}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            msg.role === "user"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }
                        >
                          {msg.role === "user" ? "Usuário" : "Assistente"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(msg.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-2 text-sm text-gray-700">
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {/* Footer */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Conversa ID: <code className="rounded bg-gray-200 px-1">{msg.conversation_id.slice(0, 8)}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {messages?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensagens de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {messages?.filter((m: any) => m.role === "user").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Respostas da LIA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {messages?.filter((m: any) => m.role === "assistant").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversas Únicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {new Set(messages?.map((m: any) => m.conversation_id)).size || 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
