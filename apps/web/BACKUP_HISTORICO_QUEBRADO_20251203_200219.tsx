import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Loader2, X, Plus, Sparkles } from "lucide-react";
import { Plan } from "@/hooks/usePlans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Lista completa de recursos disponíveis
const allAvailableFeatures = [
    "Integração com WhatsApp (1 número)",
    "WhatsApp Business (vários números)",
    "Chat online no site (widget simples)",
    "Chat integrado (com histórico)",
    "Integração com e-mail",
    "E-mail profissional",
    "Messenger (Facebook), Telegram, Instagram Direct",
    "Criação de 1 fluxo de automação",
    "10 fluxos de automação customizados",
    "Construtor visual de fluxos com IA",
    "Agendamento simples (Google Agenda)",
    "Agenda integrada (Google, Outlook)",
    "Google Sheets / Excel online",
    "Integração com CRM (HubSpot, RD Station, Pipedrive)",
    "Integração com ERP (SAP, Conta Azul, Bling)",
    "Sistemas financeiros e bancários",
    "Ferramentas internas da empresa",
    "Integração por API e Webhooks",
    "Gatilhos por palavras-chave",
    "Etiquetas automáticas",
    "Relatórios básicos de atendimento",
    "Relatórios detalhados",
    "Criação de relatórios financeiros inteligentes",
    "Acesso à LIA via painel (respostas simples)",
    "Assistente LIA com personalidade customizável",
    "Criação de múltiplas instâncias personalizadas da LIA",
    "Acesso ilimitado a canais e integrações",
    "Gestão de equipe com permissões",
    "Suporte por e-mail",
    "Suporte prioritário",
    "Suporte com gestor dedicado",
    "Suporte 24/7",
    "1 usuário",
    "Até 3 usuários",
    "10+ usuários",
    "Implantação assistida",
    "IA avançada",
    "IA personalizada",
];

// Schema de validação
const planFormSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    price: z.string().min(1, "Preço é obrigatório"),
    discount: z.coerce.number().min(0).max(100).default(0),
    annualPrice: z.string().optional(),
    description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
    maxChannels: z.string().min(1, "Limite de canais é obrigatório"),
    maxConversations: z.string().min(1, "Limite de conversas é obrigatório"),
    maxMessages: z.string().min(1, "Limite de mensagens é obrigatório"),
    features: z.array(z.string()).min(1, "Adicione pelo menos um recurso"),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

interface EditPlanModalProps {
    plan: Plan | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPlan: Plan) => void;
}

export const EditPlanModal = ({ plan, isOpen, onClose, onSave }: EditPlanModalProps) => {
    const [saving, setSaving] = useState(false);
    const [customFeature, setCustomFeature] = useState("");

    const form = useForm<PlanFormValues>({
        resolver: zodResolver(planFormSchema),
        defaultValues: {
            name: plan?.name || "",
            price: plan?.price || "",
            discount: plan?.discount || 0,
            annualPrice: plan?.annualPrice || "",
            description: plan?.description || "",
            maxChannels: String(plan?.maxChannels || ""),
            maxConversations: String(plan?.maxConversations || ""),
            maxMessages: String(plan?.maxMessages || ""),
            features: plan?.features || [],
        },
    });

    // Resetar o formulário quando o plano mudar
    useEffect(() => {
        if (plan) {
            form.reset({
                name: plan.name,
                price: plan.price,
                discount: plan.discount || 0,
                annualPrice: plan.annualPrice,
                const discount = form.watch("discount");

                useEffect(() => {
    if (price) {
        const numericPrice = parseFloat(price.replace(/[^0-9.,]/g, '').replace(',', '.'));

        if (!isNaN(numericPrice)) {
            const annualTotal = (numericPrice * 12) * (1 - (discount / 100));
            const formattedAnnual = `€${Math.round(annualTotal)}`;
            form.setValue("annualPrice", formattedAnnual);
        }
    }
}, [price, discount, form]);

const onSubmit = async (values: PlanFormValues) => {
    if (!plan) return;

    setSaving(true);

    try {
        // Salvar no Supabase
        const { error } = await supabase
            .from('plan_configs')
            .upsert({
                id: (plan as any).id,
                plan_name: values.name,
                price: values.price,
                discount: values.discount,
                annual_price: values.annualPrice,
                description: values.description,
                max_channels: values.maxChannels,
                max_conversations: values.maxConversations,
                max_messages: values.maxMessages,
                features: values.features,
                updated_at: new Date().toISOString(),
            } as any);

        if (error) throw error;

        // Atualizar o plano localmente
        const updatedPlan: Plan = {
            ...plan,
            name: values.name,
            price: values.price,
            discount: values.discount,
            annualPrice: values.annualPrice || plan.annualPrice,
            description: values.description,
            maxChannels: values.maxChannels,
            maxConversations: values.maxConversations,
            maxMessages: values.maxMessages,
            features: values.features,
        };

        onSave(updatedPlan);

        toast.success("Plano atualizado!", {
            description: `As configurações do plano ${values.name} foram salvas com sucesso.`,
            duration: 3000,
        });

        onClose();
    } catch (error) {
        console.error('Erro ao salvar:', error);
        toast.error("Erro ao salvar", {
            description: "Não foi possível salvar as configurações. Tente novamente.",
            duration: 4000,
        });
    } finally {
        setSaving(false);
    }
};

const toggleFeature = (feature: string) => {
    const currentFeatures = form.getValues("features");
    const newFeatures = currentFeatures.includes(feature)
        ? currentFeatures.filter(f => f !== feature)
        : [...currentFeatures, feature];
    form.setValue("features", newFeatures);
};

const addCustomFeature = () => {
    if (!customFeature.trim()) return;

    const currentFeatures = form.getValues("features");
    if (!currentFeatures.includes(customFeature.trim())) {
        form.setValue("features", [...currentFeatures, customFeature.trim()]);
        setCustomFeature("");
    }
};

const removeFeature = (feature: string) => {
    const currentFeatures = form.getValues("features");
    form.setValue("features", currentFeatures.filter(f => f !== feature));
};

if (!plan) return null;

const currentFeatures = form.watch("features");

return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header com gradiente do plano */}
            <div className={`-mx-6 -mt-6 mb-4 bg-gradient-to-r ${plan?.color || 'from-purple-500 to-pink-500'} p-6 text-white`}>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        Editar Plano {plan.name}
                    </DialogTitle>
                    <DialogDescription className="text-white/90">
                        Configure os detalhes, limites e recursos deste plano
                    </DialogDescription>
                </DialogHeader>
            </div>

            {/* Formulário com scroll */}
            <ScrollArea className="flex-1 pr-4">
                <Form {...form}>
                    <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Informações Básicas */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">Informações Básicas</h3>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Plano</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: Start" readOnly className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                O nome não pode ser alterado
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Preço Mensal</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: €49" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="discount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>% Desconto Anual</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    {...field}
                                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="annualPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço Anual Calculado</FormLabel>
                                        <FormControl>
                                            <Input {...field} readOnly className="bg-gray-50 dark:bg-gray-900" />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            Calculado automaticamente: (Mensal * 12) - Desconto
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Descreva o público-alvo e principais benefícios"
                                                rows={3}
                                                className="resize-none"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Limites do Plano */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">Limites do Plano</h3>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="maxChannels"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Canais</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: 3 ou Ilimitado" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="maxConversations"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Conversas/mês</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: 300" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="maxMessages"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mensagens/mês</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: 1500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Recursos do Plano */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300">Recursos Inclusos</h3>

                            {/* Recursos Selecionados */}
                            <div className="space-y-2">
                                <FormLabel>Recursos Selecionados ({currentFeatures.length})</FormLabel>
                                <div className="border rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto bg-gray-50 dark:bg-gray-900">
                                    {currentFeatures.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">
                                            Nenhum recurso selecionado
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {currentFeatures.map((feature, idx) => (
                                                <Badge
                                                    key={idx}
                                                    variant="secondary"
                                                    className="pr-1 py-1 text-xs"
                                                >
                                                    {feature}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFeature(feature)}
                                                        className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <FormMessage>{form.formState.errors.features?.message}</FormMessage>
                            </div>

                            {/* Adicionar Recurso Personalizado */}
                            <div className="space-y-2">
                                <FormLabel>Adicionar Recurso Personalizado</FormLabel>
                                <div className="flex gap-2">
                                    <Input
                                        value={customFeature}
                                        onChange={(e) => setCustomFeature(e.target.value)}
                                        placeholder="Digite um novo recurso..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addCustomFeature();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={addCustomFeature}
                                        variant="outline"
                                        size="icon"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Recursos Disponíveis */}
                            <div className="space-y-2">
                                <FormLabel>Recursos Disponíveis para Adicionar</FormLabel>
                                <ScrollArea className="h-[250px] border rounded-lg p-3">
                                    <div className="space-y-2">
                                        {allAvailableFeatures
                                            .filter(f => !currentFeatures.includes(f))
                                            .map((feature, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
                                                >
                                                    <Checkbox
                                                        id={`feature-${idx}`}
                                                        checked={currentFeatures.includes(feature)}
                                                        onCheckedChange={() => toggleFeature(feature)}
                                                    />
                                                    <label
                                                        htmlFor={`feature-${idx}`}
                                                        className="text-sm cursor-pointer flex-1"
                                                    >
                                                        {feature}
                                                    </label>
                                                </div>
                                            ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </form>
                </Form>
            </ScrollArea>

            {/* Footer com botões */}
            <DialogFooter className="border-t pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={saving}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    form="plan-form"
                    disabled={saving}
                    className={`bg-gradient-to-r ${plan?.color || 'from-purple-500 to-pink-500'} hover:opacity-90 transition-all text-white`}
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
};
