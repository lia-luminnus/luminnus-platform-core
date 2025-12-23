import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid3x3, CheckCircle2, Plus, MessageSquare, Calendar as CalendarIcon, Mail, ShoppingCart } from 'lucide-react';

/**
 * COMPONENTE: DashboardIntegracoes
 *
 * Página de gerenciamento de integrações
 */
const DashboardIntegracoes = () => {
  // Integrações disponíveis (placeholder)
  const integracoesDisponiveis = [
    {
      nome: 'WhatsApp',
      descricao: 'Conecte seu WhatsApp Business para atendimento',
      icone: <MessageSquare className="w-8 h-8 text-green-400" />,
      conectado: false,
      cor: 'green'
    },
    {
      nome: 'Google Calendar',
      descricao: 'Sincronize agendamentos automaticamente',
      icone: <CalendarIcon className="w-8 h-8 text-blue-400" />,
      conectado: false,
      cor: 'blue'
    },
    {
      nome: 'Gmail',
      descricao: 'Gerencie e-mails de forma inteligente',
      icone: <Mail className="w-8 h-8 text-red-400" />,
      conectado: false,
      cor: 'red'
    },
    {
      nome: 'E-commerce',
      descricao: 'Integre com sua loja online',
      icone: <ShoppingCart className="w-8 h-8 text-purple-400" />,
      conectado: false,
      cor: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Grid3x3 className="w-8 h-8 text-[#00C2FF]" />
          Integrações
        </h1>
        <p className="text-white/60">
          Conecte a Lia com suas ferramentas favoritas
        </p>
      </div>

      {/* INTEGRAÇÕES ATIVAS */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Integrações Ativas</h2>
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Grid3x3 className="w-8 h-8 text-white/40" />
            </div>
            <p className="text-white/60 text-center">
              Você ainda não possui integrações ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* INTEGRAÇÕES DISPONÍVEIS */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integracoesDisponiveis.map((integracao, index) => (
            <Card key={index} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                      {integracao.icone}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">
                        {integracao.nome}
                      </CardTitle>
                      <CardDescription className="text-white/60 text-sm mt-1">
                        {integracao.descricao}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {integracao.conectado ? (
                  <Button
                    variant="outline"
                    className="w-full border-green-500/20 text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Conectado
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:opacity-90 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Conectar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* INFORMAÇÕES */}
      <Card className="bg-gradient-to-r from-[#6A00FF]/10 to-[#00C2FF]/10 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Precisa de mais integrações?</CardTitle>
          <CardDescription className="text-white/60">
            Entre em contato com nosso suporte para solicitar integrações personalizadas para o seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-white/10 hover:bg-white/20 text-white">
            Solicitar Integração Personalizada
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardIntegracoes;
