/**
 * COMPONENTE: AdminLiaConfig
 *
 * Página de configurações da assistente LIA
 * Organizada em sub-seções: Credenciais de API, Prompt do Sistema, Configurações de Métricas
 * Salva e carrega dados da tabela 'lia_configurations' do Supabase
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Eye,
  EyeOff,
  Key,
  Database,
  Server,
  Webhook,
  FileText,
  BarChart3,
  Loader2,
  Trash2,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface LiaConfigData {
  openaiApiKey: string;
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  renderApiUrl: string;
  webhookUrl: string;
  systemPrompt: string;
}

interface MetricsSettings {
  openaiInputPrice: string;
  openaiOutputPrice: string;
  geminiInputPrice: string;
  geminiOutputPrice: string;
  cloudflarePricePerRequest: string;
  customKeys: Record<string, string>;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const AdminLiaConfig = () => {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados das configurações
  const [liaConfig, setLiaConfig] = useState<LiaConfigData>({
    openaiApiKey: "",
    geminiApiKey: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabaseServiceKey: "",
    renderApiUrl: "",
    webhookUrl: "",
    systemPrompt: "",
  });

  const [metricsSettings, setMetricsSettings] = useState<MetricsSettings>({
    openaiInputPrice: "0.15",
    openaiOutputPrice: "0.60",
    geminiInputPrice: "0.075",
    geminiOutputPrice: "0.30",
    cloudflarePricePerRequest: "0.50",
    customKeys: {},
  });

  // Estado para novas chaves personalizadas
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");

  // ============================================================================
  // CARREGAR CONFIGURAÇÕES DO SUPABASE
  // ============================================================================

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

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data) {
        setLiaConfig({
          openaiApiKey: data.openai_api_key || '',
          geminiApiKey: (data as any).gemini_api_key || '',
          supabaseUrl: data.supabase_url || '',
          supabaseAnonKey: data.supabase_anon_key || '',
          supabaseServiceKey: data.supabase_service_role_key || '',
          renderApiUrl: data.render_api_url || '',
          webhookUrl: data.webhook_url || '',
          systemPrompt: data.system_prompt || '',
        });

        if (data.metrics_settings) {
          const metrics = typeof data.metrics_settings === 'string'
            ? JSON.parse(data.metrics_settings)
            : data.metrics_settings;

          setMetricsSettings((prev) => ({
            ...prev,
            ...metrics,
            // Garantir que customKeys exista no objeto carregado
            customKeys: metrics.customKeys || prev.customKeys || {}
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // VALIDAÇÕES
  // ============================================================================

  const validateFields = (): boolean => {
    if (!liaConfig.openaiApiKey.trim()) {
      toast({
        title: "⚠️ Campo obrigatório",
        description: "A chave da OpenAI é obrigatória.",
        variant: "destructive",
      });
      return false;
    }

    if (liaConfig.renderApiUrl && !liaConfig.renderApiUrl.startsWith('http')) {
      toast({
        title: "⚠️ URL inválida",
        description: "A URL do Render deve começar com http:// ou https://",
        variant: "destructive",
      });
      return false;
    }

    if (liaConfig.webhookUrl && !liaConfig.webhookUrl.startsWith('http')) {
      toast({
        title: "⚠️ URL inválida",
        description: "A URL do Webhook deve começar com http:// ou https://",
        variant: "destructive",
      });
      return false;
    }

    if (liaConfig.supabaseUrl && !liaConfig.supabaseUrl.startsWith('http')) {
      toast({
        title: "⚠️ URL inválida",
        description: "A URL do Supabase deve começar com http:// ou https://",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // ============================================================================
  // MANIPULAÇÃO DE CHAVES PERSONALIZADAS
  // ============================================================================

  const handleAddCustomKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast({
        title: "⚠️ Campos vazios",
        description: "Preencha o nome e o valor da chave.",
        variant: "destructive",
      });
      return;
    }

    setMetricsSettings((prev) => ({
      ...prev,
      customKeys: {
        ...prev.customKeys,
        [newKeyName.trim()]: newKeyValue.trim(),
      },
    }));

    setNewKeyName("");
    setNewKeyValue("");
    toast({
      title: "✅ Chave adicionada",
      description: `A chave ${newKeyName} foi adicionada à lista.`,
    });
  };

  const handleRemoveCustomKey = (key: string) => {
    setMetricsSettings((prev) => {
      const newKeys = { ...prev.customKeys };
      delete newKeys[key];
      return { ...prev, customKeys: newKeys };
    });
    toast({
      title: "ℹ️ Chave removida",
      description: `A chave ${key} foi removida.`,
    });
  };

  // ============================================================================
  // SALVAR CONFIGURAÇÕES NO SUPABASE
  // ============================================================================

  const handleSave = async () => {
    if (!validateFields()) return;

    setIsSaving(true);
    try {
      // 1. Verificar se já existe um registro
      const { data: existing, error: fetchError } = await supabase
        .from('lia_configurations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // 2. Preparar payload (agora com a coluna nativa gemini_api_key)
      const payload: any = {
        openai_api_key: liaConfig.openaiApiKey,
        gemini_api_key: liaConfig.geminiApiKey,
        supabase_url: liaConfig.supabaseUrl,
        supabase_anon_key: liaConfig.supabaseAnonKey,
        supabase_service_role_key: liaConfig.supabaseServiceKey,
        render_api_url: liaConfig.renderApiUrl,
        webhook_url: liaConfig.webhookUrl,
        system_prompt: liaConfig.systemPrompt,
        metrics_settings: metricsSettings,
        updated_at: new Date().toISOString(),
      };

      console.log('[AdminConfig] Salvando payload:', payload);

      let saveError;
      if (existing) {
        // UPDATE
        const { error } = await supabase
          .from('lia_configurations')
          .update(payload)
          .eq('id', existing.id);
        saveError = error;
      } else {
        // INSERT
        const { error } = await supabase
          .from('lia_configurations')
          .insert(payload);
        saveError = error;
      }

      if (saveError) throw saveError;

      toast({
        title: "✅ Configurações salvas!",
        description: "Todas as alterações foram salvas com sucesso no banco de dados.",
      });

      // Recarregar para garantir sincronia
      loadConfig();

    } catch (error: any) {
      console.error('Erro crítico ao salvar:', error);

      // Extrair mensagem detalhada
      const detailedError = error.message || error.details || (typeof error === 'string' ? error : JSON.stringify(error));

      toast({
        title: "❌ Erro ao salvar",
        description: `Detalhes: ${detailedError}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // CRIAR REGISTRO INICIAL
  // ============================================================================

  useEffect(() => {
    const initConfig = async () => {
      const { data } = await supabase
        .from('lia_configurations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!data) {
        // Criar registro inicial vazio
        await supabase.from('lia_configurations').insert({
          openai_api_key: '',
          system_prompt: 'Você é a LIA, uma assistente virtual inteligente e prestativa.',
        });
        await loadConfig();
      }
    };

    initConfig();
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-900 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent mb-2">
            Configurações da LIA
          </h1>
          <p className="text-muted-foreground">
            Gerencie as credenciais, prompts e configurações da assistente virtual
          </p>
        </div>
      </div>

      {/* SEÇÃO 1: CREDENCIAIS DE API */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Credenciais de API
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure as chaves de acesso dos provedores externos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OpenAI API Key */}
          <div className="space-y-2">
            <Label htmlFor="openai-key" className="text-foreground">
              OpenAI API Key <span className="text-red-500 dark:text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type={showKeys ? "text" : "password"}
                value={liaConfig.openaiApiKey}
                onChange={(e) => setLiaConfig({ ...liaConfig, openaiApiKey: e.target.value })}
                placeholder="sk-..."
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKeys(!showKeys)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2 pt-4 border-t border-border">
            <Label htmlFor="gemini-key" className="text-foreground">
              Gemini API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="gemini-key"
                type={showKeys ? "text" : "password"}
                value={liaConfig.geminiApiKey}
                onChange={(e) => setLiaConfig({ ...liaConfig, geminiApiKey: e.target.value })}
                placeholder="AIza..."
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Utilizada para integrações de longa duração e multimodais.
            </p>
          </div>

          {/* Supabase */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-foreground font-semibold">Supabase</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supabase-url" className="text-foreground">URL do Projeto</Label>
              <Input
                id="supabase-url"
                type="text"
                value={liaConfig.supabaseUrl}
                onChange={(e) => setLiaConfig({ ...liaConfig, supabaseUrl: e.target.value })}
                placeholder="https://seu-projeto.supabase.co"
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supabase-anon" className="text-foreground">Anon Key (Pública)</Label>
              <Input
                id="supabase-anon"
                type={showKeys ? "text" : "password"}
                value={liaConfig.supabaseAnonKey}
                onChange={(e) => setLiaConfig({ ...liaConfig, supabaseAnonKey: e.target.value })}
                placeholder="eyJ..."
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supabase-service" className="text-foreground">Service Role Key (Privada)</Label>
              <Input
                id="supabase-service"
                type={showKeys ? "text" : "password"}
                value={liaConfig.supabaseServiceKey}
                onChange={(e) => setLiaConfig({ ...liaConfig, supabaseServiceKey: e.target.value })}
                placeholder="eyJ..."
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Render API */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <Label htmlFor="render-url" className="text-foreground">Render API URL</Label>
            </div>
            <Input
              id="render-url"
              type="text"
              value={liaConfig.renderApiUrl}
              onChange={(e) => setLiaConfig({ ...liaConfig, renderApiUrl: e.target.value })}
              placeholder="https://sua-api.onrender.com"
              className="border-border focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          {/* Webhook */}
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <Label htmlFor="webhook-url" className="text-foreground">Webhook URL</Label>
            </div>
            <Input
              id="webhook-url"
              type="text"
              value={liaConfig.webhookUrl}
              onChange={(e) => setLiaConfig({ ...liaConfig, webhookUrl: e.target.value })}
              placeholder="https://seu-webhook.com/endpoint"
              className="border-border focus:border-purple-500 focus:ring-purple-500"
            />
          </div>

          {/* CHAVES PERSONALIZADAS */}
          <div className="space-y-4 pt-6 border-t border-border mt-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-foreground font-semibold">Chaves Personalizadas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Nome (ex: STRIPE_KEY)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value.toUpperCase())}
                className="md:col-span-1"
              />
              <Input
                type={showKeys ? "text" : "password"}
                placeholder="Valor da Chave"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                className="md:col-span-1"
              />
              <Button
                onClick={handleAddCustomKey}
                variant="secondary"
                className="bg-cyan-600/10 text-cyan-700 hover:bg-cyan-600/20 dark:text-cyan-400"
              >
                Adicionar
              </Button>
            </div>

            <div className="space-y-2">
              {Object.entries(metricsSettings.customKeys || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold font-mono">{key}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {showKeys ? value : "••••••••••••••••"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCustomKey(key)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: PROMPT DO SISTEMA */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
            Prompt do Sistema
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure a personalidade e comportamento da assistente LIA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-foreground">Instruções do Sistema</Label>
            <Textarea
              id="system-prompt"
              value={liaConfig.systemPrompt}
              onChange={(e) => setLiaConfig({ ...liaConfig, systemPrompt: e.target.value })}
              placeholder="Você é a LIA, uma assistente virtual inteligente..."
              className="border-border focus:border-purple-500 focus:ring-purple-500 min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado como instruções base para todas as interações da LIA
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 3: CONFIGURAÇÕES DE MÉTRICAS */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            Configurações de Métricas
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Defina os preços e limites para cálculo de custos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAI */}
            <div className="space-y-2">
              <Label htmlFor="openai-input" className="text-foreground">OpenAI Input Price ($/1M tokens)</Label>
              <Input
                id="openai-input"
                type="number"
                step="0.01"
                value={metricsSettings.openaiInputPrice}
                onChange={(e) => setMetricsSettings({ ...metricsSettings, openaiInputPrice: e.target.value })}
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openai-output" className="text-foreground">OpenAI Output Price ($/1M tokens)</Label>
              <Input
                id="openai-output"
                type="number"
                step="0.01"
                value={metricsSettings.openaiOutputPrice}
                onChange={(e) => setMetricsSettings({ ...metricsSettings, openaiOutputPrice: e.target.value })}
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {/* Gemini */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="gemini-input" className="text-foreground">Gemini Input Price ($/1M tokens)</Label>
              <Input
                id="gemini-input"
                type="number"
                step="0.01"
                value={metricsSettings.geminiInputPrice}
                onChange={(e) => setMetricsSettings({ ...metricsSettings, geminiInputPrice: e.target.value })}
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="gemini-output" className="text-foreground">Gemini Output Price ($/1M tokens)</Label>
              <Input
                id="gemini-output"
                type="number"
                step="0.01"
                value={metricsSettings.geminiOutputPrice}
                onChange={(e) => setMetricsSettings({ ...metricsSettings, geminiOutputPrice: e.target.value })}
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {/* Cloudflare */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="cloudflare-price" className="text-foreground">Cloudflare Price ($/1M requests)</Label>
              <Input
                id="cloudflare-price"
                type="number"
                step="0.01"
                value={metricsSettings.cloudflarePricePerRequest}
                onChange={(e) => setMetricsSettings({ ...metricsSettings, cloudflarePricePerRequest: e.target.value })}
                className="border-border focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOTÃO SALVAR */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-8 py-2 rounded-xl shadow-lg transition-all duration-200"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};