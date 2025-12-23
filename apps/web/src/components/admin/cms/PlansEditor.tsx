import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { EditPlanModal } from '../EditPlanModal';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Save, Sparkles } from 'lucide-react';
import { Plan, PlanFromDB } from '@/hooks/usePlans';
import { plans as fallbackPlans } from '@/data/plansData';

// Função para converter plano do banco para formato do frontend
function convertPlanFromDB(dbPlan: PlanFromDB): Plan {
  const gradientStart = dbPlan.gradient_start || '262.1 83.3% 57.8%';
  const gradientEnd = dbPlan.gradient_end || '330.4 81.2% 60.4%';

  // Calcular desconto dinamicamente (não existe coluna discount no Supabase)
  const numericPrice = parseFloat(dbPlan.price.replace(/[^0-9.,]/g, '').replace(',', '.'));
  const numericAnnualPrice = dbPlan.annual_price
    ? parseFloat(dbPlan.annual_price.replace(/[^0-9.,]/g, '').replace(',', '.'))
    : numericPrice * 12;

  // Desconto = ((Mensal * 12) - Anual) / (Mensal * 12) * 100
  const expectedAnnual = numericPrice * 12;
  const calculatedDiscount = expectedAnnual > 0
    ? Math.round(((expectedAnnual - numericAnnualPrice) / expectedAnnual) * 100)
    : 0;

  return {
    id: dbPlan.id,
    name: dbPlan.plan_name,
    price: dbPlan.price,
    annualPrice: dbPlan.annual_price || `€${Math.round(numericPrice * 12)}`,
    period: '/mês',
    description: dbPlan.description,
    features: dbPlan.features || [],
    color: `from-[hsl(${gradientStart})] to-[hsl(${gradientEnd})]`,
    popular: dbPlan.is_popular || false,
    discount: calculatedDiscount > 0 ? calculatedDiscount : 20,
    liaQuote: dbPlan.lia_quote || '',
    maxChannels: dbPlan.max_channels,
    maxConversations: dbPlan.max_conversations,
    maxMessages: dbPlan.max_messages,
    customCTA: dbPlan.custom_cta_text && dbPlan.custom_cta_action ? {
      text: dbPlan.custom_cta_text,
      action: dbPlan.custom_cta_action
    } : undefined
  };
}

export const PlansEditor = () => {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setUsingFallback(false);
      setErrorMessage(null);
      const { data } = await supabase
        .from('plan_configs')
        .select('*')
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        // Converter dados do banco para formato do frontend
        const convertedPlans = data.map(convertPlanFromDB);
        setPlans(convertedPlans);
      } else {
        // Nenhum dado do Supabase - usar dados locais como fallback
        setPlans(fallbackPlans);
        setUsingFallback(true);
        setErrorMessage('Nenhum plano encontrado no Supabase. Exibindo dados padrão.');
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      // Exibir dados locais se o Supabase falhar
      setPlans(fallbackPlans);
      setUsingFallback(true);
      setErrorMessage('Não foi possível carregar os planos do Supabase. Usando dados padrão.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleSave = async (updatedPlan: Plan) => {
    // Atualizar lista local
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    );
    setIsModalOpen(false);
    setSelectedPlan(null);
    // Recarregar do banco para garantir sincronização
    await loadPlans();
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Editor de Planos</CardTitle>
          <CardDescription>
            Edite os planos disponíveis: preços, limites e recursos
          </CardDescription>
        </CardHeader>
      </Card>

      {usingFallback && (
        <Card className="border-amber-200 bg-amber-50/70 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-100">
              {errorMessage || 'Usando dados padrão enquanto o Supabase não retorna resultados.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-5"
              style={{
                background: `linear-gradient(135deg, ${plan.color.replace('from-', '').replace('to-', ',')})`,
              }}
            />
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.popular && (
                  <Badge variant="secondary">Popular</Badge>
                )}
              </div>
              <CardDescription className="text-2xl font-bold">
                {plan.price}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{plan.description}</p>

                <div className="space-y-1 text-sm">
                  <p><strong>Canais:</strong> {plan.maxChannels}</p>
                  <p><strong>Conversas:</strong> {plan.maxConversations}</p>
                  <p><strong>Mensagens:</strong> {plan.maxMessages}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Recursos:</p>
                <div className="space-y-1">
                  {plan.features?.slice(0, 3).map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                  {plan.features?.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{plan.features.length - 3} recursos adicionais
                    </p>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleEdit(plan)}
              >
                ✏️ Editar Plano
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPlan && (
        <EditPlanModal
          plan={selectedPlan}
          isOpen={isModalOpen}
          onClose={handleClose}
          onSave={handleSave}
        />
      )}

      {/* Global Settings */}
      <Card id="global-settings" className="border-2 border-primary/20 scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-xl">
            Configurações Globais de Planos
          </CardTitle>
          <CardDescription>
            Defina configurações que afetam todos os planos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="trial-days" className="text-sm font-semibold">
                Período de Teste (dias)
              </Label>
              <Input id="trial-days" type="number" defaultValue="7" />
              <p className="text-xs text-muted-foreground">
                Tempo de teste gratuito para novos usuários
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grace-period" className="text-sm font-semibold">
                Período de Tolerância (dias)
              </Label>
              <Input id="grace-period" type="number" defaultValue="3" />
              <p className="text-xs text-muted-foreground">
                Dias após vencimento antes de bloquear
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-semibold">
                Moeda Padrão
              </Label>
              <Input id="currency" defaultValue="EUR" />
              <p className="text-xs text-muted-foreground">
                Será exibida nos preços (EUR, USD, BRL)
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações Globais
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Sincronização Automática</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                As alterações feitas aqui serão refletidas automaticamente na página pública de planos (/planos).
                Os limites configurados serão aplicados aos usuários de cada plano em tempo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
