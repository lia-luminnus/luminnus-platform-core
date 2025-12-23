import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Headphones, MessageCircle, Mail, Phone, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * COMPONENTE: AdminSupport
 *
 * Painel para gestão de suporte aos clientes
 * - Tickets de suporte
 * - Chat com clientes
 * - Base de conhecimento
 * - FAQs
 */
const AdminSupport = () => {
  const tickets = [
    // Exemplos de estrutura - serão carregados do banco depois
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
          <Headphones className="w-8 h-8 text-cyan-600" />
          Central de Suporte
        </h1>
        <p className="text-gray-600">
          Gerencie solicitações e atenda seus clientes
        </p>
      </div>

      {/* Estatísticas de Suporte */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tickets Abertos</CardTitle>
            <MessageCircle className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">0</p>
            <p className="text-xs text-gray-500 mt-1">Aguardando resposta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Em Andamento</CardTitle>
            <Clock className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-xs text-gray-500 mt-1">Sendo atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resolvidos Hoje</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-xs text-gray-500 mt-1">Tickets fechados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tempo Médio</CardTitle>
            <Clock className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">0h</p>
            <p className="text-xs text-gray-500 mt-1">Resolução</p>
          </CardContent>
        </Card>
      </div>

      {/* Canais de Atendimento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-cyan-600" />
              <div>
                <CardTitle className="text-lg">Chat ao Vivo</CardTitle>
                <CardDescription>Atendimento em tempo real</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
              Iniciar Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-lg">E-mail</CardTitle>
                <CardDescription>Suporte via e-mail</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Ver E-mails
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Phone className="w-8 h-8 text-green-600" />
              <div>
                <CardTitle className="text-lg">Telefone</CardTitle>
                <CardDescription>Suporte telefônico</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Ver Chamadas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Tickets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tickets de Suporte</CardTitle>
              <CardDescription>
                Solicitações e problemas reportados pelos clientes
              </CardDescription>
            </div>
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              Novo Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Headphones className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold">Nenhum ticket aberto</p>
              <p className="text-sm">Quando clientes abrirem tickets, eles aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Aqui virá a lista de tickets */}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Base de Conhecimento */}
      <Card>
        <CardHeader>
          <CardTitle>Base de Conhecimento</CardTitle>
          <CardDescription>
            Artigos e documentação para autoatendimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:border-cyan-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">Como configurar WhatsApp</h4>
              <p className="text-sm text-gray-600">Guia passo a passo para integração</p>
            </div>
            <div className="p-4 border rounded-lg hover:border-cyan-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">Primeiros passos com a LIA</h4>
              <p className="text-sm text-gray-600">Tutorial de onboarding completo</p>
            </div>
            <div className="p-4 border rounded-lg hover:border-cyan-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">FAQs</h4>
              <p className="text-sm text-gray-600">Perguntas mais frequentes</p>
            </div>
            <div className="p-4 border rounded-lg hover:border-cyan-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">Solução de problemas</h4>
              <p className="text-sm text-gray-600">Resolva problemas comuns</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSupport;
