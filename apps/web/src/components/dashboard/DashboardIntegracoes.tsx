import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid3x3, CheckCircle2, Plus, MessageSquare, Loader2, Unplug } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * COMPONENTE: DashboardIntegracoes
 *
 * Página de gerenciamento de integrações para o Dashboard do Cliente.
 * Suporta conexão real com Google Workspace e isolamento por tenant_id.
 */
const DashboardIntegracoes = () => {
  const { user, company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [googleStatus, setGoogleStatus] = useState<any>(null);

  const fetchStatus = async () => {
    if (!user?.id || !company?.id) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google/status?user_id=${user.id}&tenant_id=${company.id}`);
      const data = await response.json();
      setGoogleStatus(data);

    } catch (error) {
      console.error('Erro ao buscar status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchStatus();
    }
  }, [user]);

  const handleConnectGoogle = () => {
    if (!user?.id || !company?.id) {
      toast.error('Usuário ou empresa não identificados para esta integração.');
      return;
    }

    const redirectUri = window.location.href;
    const authUrl = `${import.meta.env.VITE_API_URL}/api/auth/google?user_id=${user.id}&tenant_id=${company.id}&redirect_to=${encodeURIComponent(redirectUri)}`;

    // Redireciona para o fluxo OAuth
    window.location.href = authUrl;
  };

  const handleDisconnectGoogle = async () => {
    if (!user?.id) return;
    if (!confirm('Tem certeza que deseja desconectar o Google Workspace? A LIA perderá acesso aos seus documentos.')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/google`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          tenant_id: company.id
        })
      });


      if (response.ok) {
        toast.success('Google Workspace desconectado com sucesso.');
        fetchStatus();
      } else {
        toast.error('Erro ao desconectar da conta Google.');
      }
    } catch (error) {
      toast.error('Falha na comunicação com o servidor.');
    }
  };

  const integracoesDisponiveis = [
    {
      id: 'google',
      nome: 'Google Workspace',
      descricao: 'Permitir que a LIA crie Planilhas, Documentos e gerencie seu Google Calendar.',
      icone: <Grid3x3 className="w-8 h-8 text-[#00C2FF]" />,
      conectado: !!googleStatus?.connected,
      googleEmail: googleStatus?.googleEmail,
      cor: 'blue'
    },
    {
      id: 'whatsapp',
      nome: 'WhatsApp Business',
      descricao: 'Conecte seu WhatsApp para que a LIA realize atendimentos automatizados.',
      icone: <MessageSquare className="w-8 h-8 text-green-400" />,
      conectado: false,
      cor: 'green'
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
          Potencialize a LIA conectando-a com suas ferramentas de trabalho preferidas.
        </p>
      </div>

      {/* INTEGRAÇÕES ATIVAS */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Suas Conexões Ativas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <Card className="bg-white/5 border-white/10 flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </Card>
          ) : googleStatus?.connected ? (
            <Card className="bg-gradient-to-r from-[#00C2FF]/20 to-transparent backdrop-blur-lg border border-[#00C2FF]/30">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Grid3x3 className="w-6 h-6 text-[#00C2FF]" />
                    <CardTitle className="text-white text-md">Google Workspace</CardTitle>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider">Ativo</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Conta conectada:</p>
                  <p className="text-sm text-white/80 truncate font-medium">{googleStatus.googleEmail}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectGoogle}
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 h-9 text-xs transition-colors"
                >
                  <Unplug className="w-4 h-4 mr-2" />
                  Desvincular Conta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10 col-span-full border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-white/40 text-sm italic">Você ainda não possui integrações ativas. Comece conectando seu Google Workspace abaixo.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* INTEGRAÇÕES DISPONÍVEIS */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Catálogo de Integrações</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integracoesDisponiveis.map((integracao, index) => (
            <Card key={index} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#00C2FF]/10 transition-colors">
                      {integracao.icone}
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">
                        {integracao.nome}
                      </CardTitle>
                      <CardDescription className="text-white/50 text-xs mt-1 leading-relaxed">
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
                    disabled
                    className="w-full border-green-500/20 text-green-400 bg-green-500/5 cursor-default opacity-100"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Integração Ativa
                  </Button>
                ) : (
                  <Button
                    onClick={integracao.id === 'google' ? handleConnectGoogle : undefined}
                    className="w-full bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:from-[#6A00FF] hover:to-[#00D0FF] hover:scale-[1.01] active:scale-[0.99] transition-all text-white font-medium border-none"
                    disabled={integracao.id !== 'google'}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Conectar Integração
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* INFORMAÇÕES ADICIONAIS */}
      <Card className="bg-gradient-to-r from-[#6A00FF]/10 to-[#00C2FF]/10 backdrop-blur-lg border border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00C2FF]/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
        <CardHeader>
          <CardTitle className="text-white">Não encontrou o que precisava?</CardTitle>
          <CardDescription className="text-white/60">
            Nossa equipe está constantemente desenvolvendo novas conexões. Se sua empresa utiliza ferramentas específicas, podemos criar uma integração sob medida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors">
            Falar com Suporte Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardIntegracoes;
