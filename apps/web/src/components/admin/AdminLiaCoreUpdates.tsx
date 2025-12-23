import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Upload, Download, Settings, Database, Code, FileText, Loader2, CheckCircle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LiaVersion {
  version: string;
  date: string;
  description: string;
  isCurrent: boolean;
}

interface LiaConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

/**
 * COMPONENTE: AdminLiaCoreUpdates
 *
 * Painel para atualizações e gestão do core da LIA
 * - Atualizar personalidade/prompt
 * - Treinar com novos dados
 * - Configurar modelos de IA
 * - Versões e rollbacks
 * - Fine-tuning
 */
const AdminLiaCoreUpdates = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modais
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);

  // Configurações
  const [config, setConfig] = useState<LiaConfig>({
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: "",
  });

  // Versões
  const [versions, setVersions] = useState<LiaVersion[]>([
    { version: "v1.0.0", date: new Date().toISOString(), description: "Versão inicial", isCurrent: true },
  ]);

  // Arquivos para upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Carregar configurações
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lia_configurations')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        setConfig({
          model: data.openai_model || "gpt-4o-mini",
          temperature: data.temperature || 0.7,
          maxTokens: data.max_tokens || 1000,
          systemPrompt: data.system_prompt || "",
        });
        setLastUpdate(data.updated_at);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navegar para Configurações da LIA
  const handleGoToConfig = () => {
    // Este evento será capturado pelo AdminDashboard
    const event = new CustomEvent('changeSection', { detail: 'lia-config' });
    window.dispatchEvent(event);
    toast({
      title: "Navegando...",
      description: "Abrindo Configurações da LIA",
    });
  };

  // Abrir modal de personalidade
  const handleOpenPersonalityModal = () => {
    setIsPersonalityModalOpen(true);
  };

  // Salvar personalidade
  const handleSavePersonality = async () => {
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from('lia_configurations')
        .select('id')
        .limit(1)
        .maybeSingle();

      const payload = {
        system_prompt: config.systemPrompt,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase
          .from('lia_configurations')
          .update(payload)
          .eq('id', existing.id);
      } else {
        await supabase.from('lia_configurations').insert({
          ...payload,
          openai_api_key: '',
        });
      }

      toast({
        title: "Personalidade atualizada",
        description: "O system prompt foi salvo com sucesso.",
      });
      setIsPersonalityModalOpen(false);
      setLastUpdate(new Date().toISOString());
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Upload de arquivos
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
    setIsUploadModalOpen(true);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo",
        description: "Selecione pelo menos um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Simular upload - em produção, enviar para storage/API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "Upload concluído",
        description: `${uploadedFiles.length} arquivo(s) enviado(s) para treinamento.`,
      });
      setUploadedFiles([]);
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar os arquivos.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Salvar configurações do modelo
  const handleSaveModel = async () => {
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from('lia_configurations')
        .select('id')
        .limit(1)
        .maybeSingle();

      const payload = {
        openai_model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase
          .from('lia_configurations')
          .update(payload)
          .eq('id', existing.id);
      } else {
        await supabase.from('lia_configurations').insert({
          ...payload,
          openai_api_key: '',
          system_prompt: '',
        });
      }

      toast({
        title: "Modelo atualizado",
        description: "As configurações do modelo foram salvas.",
      });
      setIsModelModalOpen(false);
      setLastUpdate(new Date().toISOString());
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Ver histórico de versões
  const handleViewVersions = () => {
    setIsVersionsModalOpen(true);
  };

  // Rollback para versão anterior
  const handleRollback = (version: LiaVersion) => {
    toast({
      title: "Rollback não disponível",
      description: "O sistema de versões será implementado em breve.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-pink-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-pink-600" />
          LIA Core - Atualizações e Treinamento
        </h1>
        <p className="text-gray-600">
          Configure e atualize o cérebro da LIA
        </p>
      </div>

      {/* Status do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Versão Atual</CardTitle>
            <Code className="w-4 h-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-pink-600">{versions.find(v => v.isCurrent)?.version || "v1.0.0"}</p>
            <Badge className="mt-2 bg-green-100 text-green-700">Estável</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Modelo IA</CardTitle>
            <Database className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{config.model}</p>
            <p className="text-xs text-gray-500 mt-1">OpenAI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Última Atualização</CardTitle>
            <Settings className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-600">
              {lastUpdate
                ? new Date(lastUpdate).toLocaleDateString('pt-BR')
                : "Nunca"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {lastUpdate
                ? new Date(lastUpdate).toLocaleTimeString('pt-BR')
                : "Sistema inicial"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-pink-600" />
              <div>
                <CardTitle>Atualizar Personalidade</CardTitle>
                <CardDescription>Modifique o system prompt e comportamento da LIA</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Configure como a LIA se comporta, seu tom de voz e estilo de respostas.
              Você pode torná-la mais formal, casual, técnica ou amigável.
            </p>
            <Button
              className="w-full bg-pink-600 hover:bg-pink-700"
              onClick={handleOpenPersonalityModal}
            >
              <Settings className="w-4 h-4 mr-2" />
              Editar Personalidade
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle>Treinar com Dados</CardTitle>
                <CardDescription>Adicione conhecimento específico do seu negócio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Faça upload de documentos, FAQs e bases de conhecimento para que a LIA
              aprenda sobre seus produtos, serviços e processos.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.pdf,.doc,.docx,.json,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleFileSelect}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload de Dados
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-purple-600" />
              <div>
                <CardTitle>Configurar Modelo de IA</CardTitle>
                <CardDescription>Escolha o modelo e parâmetros de geração</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecione qual modelo da OpenAI usar (GPT-4, GPT-4o, GPT-3.5-turbo) e
              ajuste parâmetros como temperatura e max tokens.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Modelo atual:</span>
                <Badge>{config.model}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Temperatura:</span>
                <Badge variant="outline">{config.temperature}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Max Tokens:</span>
                <Badge variant="outline">{config.maxTokens}</Badge>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsModelModalOpen(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Alterar Configurações
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Download className="w-8 h-8 text-green-600" />
              <div>
                <CardTitle>Versões e Rollback</CardTitle>
                <CardDescription>Gerencie versões e volte para versões anteriores</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Visualize o histórico de atualizações da LIA e, se necessário,
              restaure uma versão anterior da configuração.
            </p>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{versions.find(v => v.isCurrent)?.version || "v1.0.0"}</p>
                  <p className="text-xs text-gray-500">Versão atual</p>
                </div>
                <Badge className="bg-green-100 text-green-700">Atual</Badge>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleViewVersions}
            >
              <Download className="w-4 h-4 mr-2" />
              Ver Histórico
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Avisos */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800 flex items-center gap-2">
            Importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-800 space-y-2">
          <p>
            Alterações na personalidade e no modelo afetam <strong>todas as conversas</strong> da LIA
          </p>
          <p>
            Faça backup das configurações antes de realizar mudanças significativas
          </p>
          <p>
            Teste as alterações em ambiente de staging antes de aplicar em produção
          </p>
        </CardContent>
      </Card>

      {/* Modal Editar Personalidade */}
      <Dialog open={isPersonalityModalOpen} onOpenChange={setIsPersonalityModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Personalidade da LIA</DialogTitle>
            <DialogDescription>
              Configure o system prompt que define o comportamento da assistente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={config.systemPrompt}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                placeholder="Você é a LIA, uma assistente virtual inteligente..."
                className="min-h-[200px]"
              />
              <p className="text-xs text-gray-500">
                Este texto será usado como instruções base para todas as interações da LIA
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPersonalityModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePersonality} disabled={isSaving} className="bg-pink-600 hover:bg-pink-700">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Upload de Dados */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload de Dados para Treinamento</DialogTitle>
            <DialogDescription>
              Arquivos selecionados para treinamento da LIA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum arquivo selecionado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={handleFileSelect}>
              <Upload className="w-4 h-4 mr-2" />
              Adicionar Mais Arquivos
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || uploadedFiles.length === 0} className="bg-blue-600 hover:bg-blue-700">
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Enviar para Treinamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Configurar Modelo */}
      <Dialog open={isModelModalOpen} onOpenChange={setIsModelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Modelo de IA</DialogTitle>
            <DialogDescription>
              Ajuste os parâmetros do modelo de linguagem
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Modelo OpenAI</Label>
              <Select value={config.model} onValueChange={(v) => setConfig({ ...config, model: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (Mais Recente)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o-mini (Recomendado)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Temperatura: {config.temperature}</Label>
              <Slider
                value={[config.temperature]}
                onValueChange={(v) => setConfig({ ...config, temperature: v[0] })}
                min={0}
                max={2}
                step={0.1}
              />
              <p className="text-xs text-gray-500">
                Valores mais altos = respostas mais criativas. Valores mais baixos = respostas mais focadas.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1000 })}
                min={100}
                max={4000}
              />
              <p className="text-xs text-gray-500">
                Limite máximo de tokens na resposta (100-4000)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModelModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveModel} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Versões */}
      <Dialog open={isVersionsModalOpen} onOpenChange={setIsVersionsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Histórico de Versões</DialogTitle>
            <DialogDescription>
              Versões anteriores da configuração da LIA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {versions.map((version, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{version.version}</p>
                    {version.isCurrent && (
                      <Badge className="bg-green-100 text-green-700">Atual</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{version.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(version.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {!version.isCurrent && (
                  <Button variant="outline" size="sm" onClick={() => handleRollback(version)}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Restaurar
                  </Button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVersionsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLiaCoreUpdates;
