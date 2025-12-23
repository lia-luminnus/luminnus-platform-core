import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, Plus, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * COMPONENTE: AdminIntegrations
 *
 * Painel para gestão de integrações
 * - WhatsApp Business API
 * - CRMs (HubSpot, Pipedrive, RD Station)
 * - E-mail (SendGrid, Mailchimp)
 * - Redes sociais (Instagram, Facebook, Telegram)
 * - APIs customizadas
 */
const AdminIntegrations = () => {
  const integrations = [
    { name: "WhatsApp Business", status: "disconnected", icon: "💬", category: "Messaging" },
    { name: "Instagram Direct", status: "disconnected", icon: "📷", category: "Social" },
    { name: "Facebook Messenger", status: "disconnected", icon: "👤", category: "Social" },
    { name: "Telegram", status: "disconnected", icon: "✈️", category: "Messaging" },
    { name: "HubSpot CRM", status: "disconnected", icon: "🎯", category: "CRM" },
    { name: "Pipedrive", status: "disconnected", icon: "📊", category: "CRM" },
    { name: "RD Station", status: "disconnected", icon: "🚀", category: "Marketing" },
    { name: "SendGrid", status: "disconnected", icon: "📧", category: "Email" },
    { name: "Google Calendar", status: "disconnected", icon: "📅", category: "Productivity" },
    { name: "Stripe", status: "disconnected", icon: "💳", category: "Payments" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
          <Plug className="w-8 h-8 text-green-600" />
          Integrações
        </h1>
        <p className="text-gray-600">
          Conecte a LIA com suas ferramentas favoritas
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Integrações Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{integrations.length}</p>
            <p className="text-xs text-gray-500 mt-1">Pronto para conectar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-xs text-gray-500 mt-1">Conectadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Desconectadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-600">{integrations.length}</p>
            <p className="text-xs text-gray-500 mt-1">Aguardando configuração</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{integration.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.category}</CardDescription>
                  </div>
                </div>
                {integration.status === "connected" ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={integration.status === "connected" ? "default" : "secondary"}>
                  {integration.status === "connected" ? "Conectado" : "Desconectado"}
                </Badge>
                <Button
                  size="sm"
                  variant={integration.status === "connected" ? "outline" : "default"}
                  className={integration.status === "connected" ? "" : "bg-green-600 hover:bg-green-700"}
                >
                  {integration.status === "connected" ? "Configurar" : "Conectar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botão para adicionar integração customizada */}
      <Card className="border-dashed border-2 hover:border-green-500 transition-colors cursor-pointer">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Plus className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">Integração Customizada</p>
          <p className="text-sm text-gray-500 mb-4">Configure uma integração via API ou Webhook</p>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Integração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminIntegrations;
