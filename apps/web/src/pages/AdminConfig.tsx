import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Key, Database, Settings, Eye, EyeOff, Save, Trash2, LogOut, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  secureStorage,
  adminSession,
  type AdminConfig,
} from '@/lib/secureStorage';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminEmail } from '@/config/auth';

export default function AdminConfig() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Configurações
  const [config, setConfig] = useState<AdminConfig>({
    openaiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    otherApiKeys: {},
  });

  // Controle de visibilidade das chaves
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    openaiKey: false,
    supabaseAnonKey: false,
    supabaseServiceKey: false,
  });

  // Nova chave personalizada
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Verificar autenticação via Supabase Auth (admin role)
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!isAdminEmail(user.email)) {
      toast.error('Acesso negado', { description: 'Apenas administradores podem acessar esta página.' });
      navigate('/');
      return;
    }

    // Admin autenticado via Supabase
    adminSession.create(); // Mantém compatibilidade com adminSession
    setIsAuthenticated(true);
    loadConfig();
    setLoading(false);
  }, [user, authLoading, navigate]);

  const loadConfig = () => {
    const savedConfig = secureStorage.load();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  };

  const handleLogout = () => {
    adminSession.destroy();
    setIsAuthenticated(false);
    navigate('/');
    toast.info('Sessão encerrada', {
      description: 'Você saiu do painel admin.',
    });
  };

  const handleSave = () => {
    try {
      secureStorage.save(config);
      toast.success('Configurações salvas!', {
        description: 'Todas as configurações foram armazenadas com segurança.',
      });
    } catch (error) {
      toast.error('Erro ao salvar', {
        description: 'Não foi possível salvar as configurações.',
      });
    }
  };

  const handleClearAll = () => {
    if (confirm('⚠️ Tem certeza que deseja limpar TODAS as configurações? Esta ação não pode ser desfeita.')) {
      secureStorage.clear();
      setConfig({
        openaiKey: '',
        supabaseUrl: '',
        supabaseAnonKey: '',
        supabaseServiceKey: '',
        otherApiKeys: {},
      });
      toast.success('Configurações limpas', {
        description: 'Todas as configurações foram removidas.',
      });
    }
  };

  const handleAddCustomKey = () => {
    if (!newKeyName || !newKeyValue) {
      toast.error('Campos vazios', {
        description: 'Preencha o nome e o valor da chave.',
      });
      return;
    }

    setConfig(prev => ({
      ...prev,
      otherApiKeys: {
        ...prev.otherApiKeys,
        [newKeyName]: newKeyValue,
      },
    }));

    setNewKeyName('');
    setNewKeyValue('');
    toast.success('Chave adicionada!', {
      description: `A chave "${newKeyName}" foi adicionada.`,
    });
  };

  const handleRemoveCustomKey = (keyName: string) => {
    setConfig(prev => {
      const newOtherKeys = { ...prev.otherApiKeys };
      delete newOtherKeys[keyName];
      return {
        ...prev,
        otherApiKeys: newOtherKeys,
      };
    });
    toast.info('Chave removida', {
      description: `A chave "${keyName}" foi removida.`,
    });
  };

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Tela de Redirecionamento (caso ainda falhe auth check)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
        <Card className="w-full max-w-md border-purple-500/20 bg-black/40 backdrop-blur-xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Painel Admin LIA
            </CardTitle>
            <CardDescription className="text-gray-400">
              Você será redirecionado para autenticação...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Painel de Configurações (após login)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-400" />
              Painel Admin LIA
            </h1>
            <p className="text-gray-400 mt-1">
              Gerencie configurações sensíveis e API Keys
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Info da última atualização */}
        {config.lastUpdated && (
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <AlertDescription className="text-blue-200 text-sm">
              ℹ️ Última atualização: {new Date(config.lastUpdated).toLocaleString('pt-BR')}
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs de configuração */}
        <Tabs defaultValue="openai" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black/40">
            <TabsTrigger value="openai">OpenAI</TabsTrigger>
            <TabsTrigger value="supabase">Supabase</TabsTrigger>
            <TabsTrigger value="custom">Outras APIs</TabsTrigger>
          </TabsList>

          {/* OpenAI Tab */}
          <TabsContent value="openai" className="space-y-4">
            <Card className="border-purple-500/20 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  Configuração OpenAI
                </CardTitle>
                <CardDescription>
                  Configure sua chave de API da OpenAI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openaiKey" className="text-gray-300">
                    API Key OpenAI
                  </Label>
                  <div className="relative">
                    <Input
                      id="openaiKey"
                      type={showKeys.openaiKey ? 'text' : 'password'}
                      value={config.openaiKey}
                      onChange={(e) => setConfig({ ...config, openaiKey: e.target.value })}
                      placeholder="sk-..."
                      className="pr-10 bg-black/20 border-purple-500/30 text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('openaiKey')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showKeys.openaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Obtenha sua chave em: https://platform.openai.com/api-keys
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supabase Tab */}
          <TabsContent value="supabase" className="space-y-4">
            <Card className="border-purple-500/20 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-400" />
                  Configuração Supabase
                </CardTitle>
                <CardDescription>
                  Configure suas credenciais do Supabase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* URL */}
                <div className="space-y-2">
                  <Label htmlFor="supabaseUrl" className="text-gray-300">
                    URL do Projeto
                  </Label>
                  <Input
                    id="supabaseUrl"
                    type="text"
                    value={config.supabaseUrl}
                    onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                    placeholder="https://xxxxxxxxxxx.supabase.co"
                    className="bg-black/20 border-purple-500/30 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Anon Key */}
                <div className="space-y-2">
                  <Label htmlFor="supabaseAnonKey" className="text-gray-300">
                    Anon Key (Pública)
                  </Label>
                  <div className="relative">
                    <Input
                      id="supabaseAnonKey"
                      type={showKeys.supabaseAnonKey ? 'text' : 'password'}
                      value={config.supabaseAnonKey}
                      onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                      placeholder="eyJ..."
                      className="pr-10 bg-black/20 border-purple-500/30 text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('supabaseAnonKey')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showKeys.supabaseAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Service Role Key */}
                <div className="space-y-2">
                  <Label htmlFor="supabaseServiceKey" className="text-gray-300">
                    Service Role Key (Secreta)
                  </Label>
                  <div className="relative">
                    <Input
                      id="supabaseServiceKey"
                      type={showKeys.supabaseServiceKey ? 'text' : 'password'}
                      value={config.supabaseServiceKey}
                      onChange={(e) => setConfig({ ...config, supabaseServiceKey: e.target.value })}
                      placeholder="eyJ..."
                      className="pr-10 bg-black/20 border-purple-500/30 text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('supabaseServiceKey')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showKeys.supabaseServiceKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-red-400">
                    ⚠️ ATENÇÃO: A Service Role Key tem acesso total ao banco. Mantenha em segredo!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom APIs Tab */}
          <TabsContent value="custom" className="space-y-4">
            <Card className="border-purple-500/20 bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  Outras API Keys
                </CardTitle>
                <CardDescription>
                  Adicione outras chaves de API personalizadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Adicionar nova chave */}
                <div className="space-y-4 p-4 border border-purple-500/30 rounded-lg bg-black/20">
                  <h4 className="text-sm font-semibold text-white">Adicionar Nova Chave</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newKeyName" className="text-gray-300">
                        Nome da Chave
                      </Label>
                      <Input
                        id="newKeyName"
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="ex: STRIPE_KEY"
                        className="bg-black/20 border-purple-500/30 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newKeyValue" className="text-gray-300">
                        Valor
                      </Label>
                      <Input
                        id="newKeyValue"
                        type="text"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                        placeholder="Valor da chave"
                        className="bg-black/20 border-purple-500/30 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddCustomKey}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Adicionar Chave
                  </Button>
                </div>

                {/* Lista de chaves personalizadas */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Chaves Cadastradas</h4>
                  {Object.keys(config.otherApiKeys || {}).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Nenhuma chave personalizada cadastrada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(config.otherApiKeys || {}).map(([keyName, keyValue]) => (
                        <div
                          key={keyName}
                          className="flex items-center justify-between p-3 bg-black/20 border border-purple-500/20 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">{keyName}</p>
                            <p className="text-xs text-gray-500 font-mono truncate max-w-md">
                              {keyValue}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleRemoveCustomKey(keyName)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botões de ação */}
        <div className="flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleSave}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Todas as Configurações
          </Button>
          <Button
            onClick={handleClearAll}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            size="lg"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>

        {/* Avisos de segurança */}
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertDescription className="text-red-200 text-sm">
            🔐 <strong>SEGURANÇA:</strong> Estas configurações são armazenadas localmente no navegador.
            Para produção, considere usar variáveis de ambiente do servidor ou um serviço de gerenciamento de segredos.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
