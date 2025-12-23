import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, Bell, Palette, Settings, Database, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * COMPONENTE: DashboardConfiguracoes
 *
 * Página de configurações da conta
 */
const DashboardConfiguracoes = () => {
  const { user } = useAuth();
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';

  const handleClearLocalData = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados locais? Esta ação irá recarregar a página.')) {
      localStorage.clear();
      location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Configurações da Conta
          </h1>
          <p className="text-white/60">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>

        {/* Botão de Configurações Avançadas */}
        <Dialog open={isAdvancedModalOpen} onOpenChange={setIsAdvancedModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-2 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações Avançadas
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                <Settings className="w-6 h-6 text-purple-400" />
                Configurações Avançadas
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Opções de sistema e gerenciamento de dados
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Seção de Armazenamento Local */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                    <Database className="w-5 h-5 text-blue-400" />
                    Gerenciamento de Dados
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Controle os dados armazenados localmente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1">Limpar Dados Locais</p>
                        <p className="text-white/60 text-sm">
                          Remove todos os dados armazenados no navegador (cache, preferências, sessões) e recarrega a página. Use esta opção se estiver enfrentando problemas técnicos.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleClearLocalData}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl shadow-md transition duration-200"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Atualizar Dados Locais
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Seção de Configurações de Sistema */}
              <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Configurações de Sistema
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Opções avançadas do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="text-white font-medium text-sm">Modo de Desenvolvedor</p>
                      <p className="text-white/60 text-xs">Ativar recursos avançados</p>
                    </div>
                    <Button variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-white/5">
                      Em breve
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="text-white font-medium text-sm">Logs de Sistema</p>
                      <p className="text-white/60 text-xs">Visualizar histórico de atividades</p>
                    </div>
                    <Button variant="ghost" className="text-purple-400 hover:text-purple-300 hover:bg-white/5">
                      Em breve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* INFORMAÇÕES PESSOAIS */}
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#00C2FF]" />
            Informações Pessoais
          </CardTitle>
          <CardDescription className="text-white/60">
            Seus dados cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-white/60 text-sm">Nome Completo</p>
                <p className="text-white font-medium">{userName}</p>
              </div>
            </div>
            <Button variant="ghost" className="text-[#00C2FF] hover:text-[#00C2FF]/80 hover:bg-white/5">
              Editar
            </Button>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-white/60 text-sm">E-mail</p>
                <p className="text-white font-medium">{userEmail}</p>
              </div>
            </div>
            <Button variant="ghost" className="text-[#00C2FF] hover:text-[#00C2FF]/80 hover:bg-white/5">
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEGURANÇA */}
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Segurança
          </CardTitle>
          <CardDescription className="text-white/60">
            Proteja sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div>
              <p className="text-white font-medium">Alterar Senha</p>
              <p className="text-white/60 text-sm">Última alteração há 3 meses</p>
            </div>
            <Button variant="ghost" className="text-[#00C2FF] hover:text-[#00C2FF]/80 hover:bg-white/5">
              Alterar
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div>
              <p className="text-white font-medium">Autenticação de Dois Fatores</p>
              <p className="text-white/60 text-sm">Adicione uma camada extra de segurança</p>
            </div>
            <Button variant="ghost" className="text-[#00C2FF] hover:text-[#00C2FF]/80 hover:bg-white/5">
              Ativar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PREFERÊNCIAS */}
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            Preferências
          </CardTitle>
          <CardDescription className="text-white/60">
            Personalize sua experiência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div>
              <p className="text-white font-medium">Idioma</p>
              <p className="text-white/60 text-sm">Português (Brasil)</p>
            </div>
            <Button variant="ghost" className="text-[#00C2FF] hover:text-[#00C2FF]/80 hover:bg-white/5">
              Alterar
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-white font-medium">Notificações</p>
                <p className="text-white/60 text-sm">Receber alertas por e-mail</p>
              </div>
            </div>
            <Button variant="ghost" className="text-[#00C2FF] hover:text-[#00C2FF]/80 hover:bg-white/5">
              Configurar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ZONA DE PERIGO */}
      <Card className="bg-red-500/10 backdrop-blur-lg border border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400">Zona de Perigo</CardTitle>
          <CardDescription className="text-white/60">
            Ações irreversíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-red-500/20">
            <div>
              <p className="text-white font-medium">Excluir Conta</p>
              <p className="text-white/60 text-sm">Remover permanentemente sua conta e dados</p>
            </div>
            <Button variant="destructive" className="bg-red-500/20 hover:bg-red-500/30 text-red-400">
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardConfiguracoes;
