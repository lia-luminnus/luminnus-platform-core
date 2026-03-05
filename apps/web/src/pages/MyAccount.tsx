import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, CreditCard, ArrowLeft, Loader2, Save, Edit2, Bot, Check, CheckCircle2, Zap, Clock, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isAdminEmail } from '@/config/auth';

/**
 * PÁGINA: MINHA CONTA
 *
 * Exibe informações detalhadas do usuário:
 * - Nome completo
 * - E-mail
 * - Nome do plano (Start, Plus ou Pro)
 * - Status do plano (Ativo / Inativo)
 * - Permite editar informações do perfil
 */
const MyAccount = () => {
  const { user, loading: authLoading } = useAuth();
  const { userPlan, loading: planLoading } = useUserPlan();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados para edição
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  /**
   * VERIFICAÇÃO DE AUTENTICAÇÃO
   * Redireciona para login se não estiver autenticado
   */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  /**
   * CARREGA NOME DO USUÁRIO
   * Inicializa o campo de nome com os dados do usuário
   */
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [user]);

  /**
   * FUNÇÃO: SALVAR ALTERAÇÕES
   * Atualiza as informações do perfil do usuário
   */
  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O nome não pode estar vazio',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Informações atualizadas com sucesso'
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar informações',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * FUNÇÃO: CANCELAR EDIÇÃO
   * Restaura os valores originais e fecha o modo de edição
   */
  const handleCancel = () => {
    setFullName(user?.user_metadata?.full_name || '');
    setIsEditing(false);
  };

  /**
   * LOADING STATE
   * Mostra spinner enquanto carrega os dados
   */
  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0B0F] via-[#1a1a2e] to-[#0B0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  /**
   * PROTEÇÃO ADICIONAL
   * Se não houver usuário, não renderiza nada
   */
  if (!user) {
    return null;
  }

  /**
   * EXTRAÇÃO DE DADOS
   */
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const userEmail = user.email || '';
  const planName = userPlan?.plano_nome || 'Nenhum';
  const planStatus = userPlan?.status || 'inativo';

  const isAdmin = isAdminEmail(user.email);

  // Tradução do status para exibição
  const statusDisplayMap: Record<string, string> = {
    'ativo': 'Ativo',
    'inativo': 'Inativo',
    'cancelado': 'Cancelado',
    'active': 'Ativo',
    'past_due': 'Atrasado',
    'frozen': 'Congelado',
    'unpaid': 'Não Pago',
    'incomplete': 'Incompleto'
  };

  const statusDisplay = isAdmin ? 'Administrador' : (statusDisplayMap[planStatus] || 'Inativo');

  // Cor do badge de status
  const statusColorMap: Record<string, string> = {
    'ativo': 'text-green-400 bg-green-500/10 border-green-500/20',
    'active': 'text-green-400 bg-green-500/10 border-green-500/20',
    'inativo': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    'past_due': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    'frozen': 'text-red-400 bg-red-500/10 border-red-500/20',
    'unpaid': 'text-red-400 bg-red-500/10 border-red-500/20',
    'incomplete': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    'cancelado': 'text-red-400 bg-red-500/10 border-red-500/20'
  };

  const statusColor = isAdmin
    ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    : (statusColorMap[planStatus] || 'text-gray-400 bg-gray-500/10 border-gray-500/20');

  const isWithCommitment = userPlan?.payment_type === 'annual_12x';
  const commitmentEndDate = userPlan?.commitment_end_date ? new Date(userPlan.commitment_end_date) : null;
  const isInCommitmentPeriod = commitmentEndDate ? commitmentEndDate > new Date() : false;

  const handleCancelClick = () => {
    if (isInCommitmentPeriod) {
      toast({
        title: "Cancelamento Bloqueado",
        description: `Seu plano possui fidelidade de 12 meses até ${commitmentEndDate?.toLocaleDateString('pt-BR')}. Entre em contato com o suporte para mais informações.`,
        variant: "destructive"
      });
      return;
    }

    // Logic for normal cancellation (e.g. redirect to customer portal or open support)
    window.open("mailto:suporte@luminnus.com.br?subject=Cancelamento de Assinatura", "_blank");
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B0F] via-[#1a1a2e] to-[#0B0B0F] pt-32 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Minha Conta
          </h1>
          <p className="text-white/60 text-lg">
            Gerencie suas informações e configurações
          </p>
        </div>

        {/* GRID DE INFORMAÇÕES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA - PERFIL E STATS */}
          <div className="lg:col-span-1 space-y-6">
            {/* CARD PERFIL */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden group">
              <div className="h-24 bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] relative">
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <div className="w-24 h-24 rounded-full bg-[#1a1a2e] border-4 border-[#0B0B0F] flex items-center justify-center overflow-hidden shadow-xl">
                    <User className="w-12 h-12 text-white/20" />
                  </div>
                </div>
              </div>
              <CardContent className="pt-16 pb-6 text-center">
                <h2 className="text-xl font-bold text-white mb-1">{userName}</h2>
                <p className="text-white/40 text-sm mb-4">{userEmail}</p>
                <div className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${statusColor}`}>
                  {statusDisplay}
                </div>
              </CardContent>
            </Card>

            {/* MINI STATS / DASHBOARD FEEL */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-xl overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-white/80 uppercase tracking-wider">Status da Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Clock className="w-4 h-4 text-[#00C2FF]" />
                    <span>Membro desde</span>
                  </div>
                  <span className="text-white font-medium">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <ShieldCheck className="w-4 h-4 text-[#6A00FF]" />
                    <span>Verificação</span>
                  </div>
                  <span className="text-green-400 font-medium">E-mail Confirmado</span>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>Perfil Completo</span>
                    <span>80%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] w-[80%]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* COLUNA DIREITA - DETALHES E PLANOS */}
          <div className="lg:col-span-2 space-y-6">
            {/* CARD INFORMAÇÕES PESSOAIS */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-xl">
              <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#00C2FF]/10 text-[#00C2FF]">
                      <Edit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Dados do Perfil</CardTitle>
                      <CardDescription className="text-white/40">Gerencie como você aparece na plataforma</CardDescription>
                    </div>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      Editar Dados
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-white/50 text-xs uppercase font-bold tracking-widest mb-1.5 block">Nome Completo</Label>
                  {isEditing ? (
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white focus:border-[#00C2FF]/50"
                      placeholder="Seu nome"
                    />
                  ) : (
                    <p className="text-white font-medium text-lg px-0.5">{userName}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white/50 text-xs uppercase font-bold tracking-widest mb-1.5 block">Endereço de E-mail</Label>
                  <p className="text-white/80 font-medium px-0.5">{userEmail}</p>
                  <p className="text-white/20 text-[10px] mt-1 italic">O e-mail é usado para autenticação e não pode ser alterado</p>
                </div>

                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-white/5 mt-6">
                    <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] text-white">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
                    </Button>
                    <button onClick={handleCancel} className="flex-1 px-4 py-2 rounded-md border border-white/10 text-white hover:bg-white/5 transition-all">
                      Cancelar
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CARD PLANO E ASSINATURA */}
            {userPlan ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                    {statusDisplay}
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#6A00FF]/10 text-[#6A00FF]">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-white">Seu Plano: {planName}</CardTitle>
                      <CardDescription className="text-white/40">Sua assinatura está ativa e configurada</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* DETALHES DA ASSINATURA */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                      <span className="text-white/60">Tipo de Pagamento</span>
                      <span className="text-white font-medium">
                        {userPlan.payment_type === 'annual_full' ? 'Anual à Vista' :
                          userPlan.payment_type === 'annual_12x' ? '12x Mensal (Fidelidade)' : 'Mensal'}
                      </span>
                    </div>
                    {isWithCommitment && (
                      <div className="flex justify-between text-sm py-2 border-b border-white/5">
                        <span className="text-white/60">Fim da Fidelidade</span>
                        <span className="text-[#00C2FF] font-bold">
                          {commitmentEndDate?.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm py-2 border-b border-white/5">
                      <span className="text-white/60">Próxima Renovação</span>
                      <span className="text-white font-medium">
                        {userPlan.data_fim ? new Date(userPlan.data_fim).toLocaleDateString('pt-BR') : 'Automática'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">O que seu plano inclui:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {[
                        'Atendimento Ilimitado',
                        'Integração com Telegram',
                        'Inteligência Cognitiva LIA',
                        'Dashboards em Tempo Real'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-white/80">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => navigate('/planos')}
                      variant="outline"
                      className="w-full border-white/10 text-white hover:bg-white/5 hover:border-[#6A00FF]/50"
                    >
                      Alterar ou Fazer Upgrade
                    </Button>

                    <button
                      onClick={handleCancelClick}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors text-center w-full mt-2"
                    >
                      {isInCommitmentPeriod ? 'Fidelidade Ativa - Ver detalhes' : 'Desejo cancelar minha assinatura'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* SEÇÃO "ESCOLHA SEU CAMINHO" PARA NOVOS CLIENTES */
              <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#0B0B0F] border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#6A00FF]/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                <CardHeader className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6A00FF] to-[#00C2FF] flex items-center justify-center p-0.5">
                      <div className="w-full h-full bg-[#1a1a2e] rounded-[10px] flex items-center justify-center">
                        <Zap className="w-6 h-6 text-[#00C2FF]" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">Escolha seu Caminho</CardTitle>
                      <CardDescription className="text-white/60">Você está a um passo de automatizar seu negócio</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: 'IA Viva 24/7', icon: Bot, color: 'text-purple-400' },
                      { title: 'Voz Contextual', icon: Mail, color: 'text-blue-400' },
                      { title: 'Web Widget', icon: Save, color: 'text-purple-400' },
                      { title: 'Insights Reais', icon: Edit2, color: 'text-yellow-400' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                        <span className="text-white/80 text-sm font-medium">{item.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* LIA QUOTE SECTION */}
                  <div className="p-5 bg-[#0B0B0F]/50 rounded-2xl border border-[#6A00FF]/20 relative group">
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                      LIA diz:
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6A00FF] to-[#00C2FF] flex-shrink-0 flex items-center justify-center p-0.5 mt-1">
                        <div className="w-full h-full bg-[#0a0e1a] rounded-full flex items-center justify-center overflow-hidden">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <p className="text-white/90 text-sm leading-relaxed italic">
                        "Olá {userName}, percebi que você ainda não ativou meu núcleo cognitivo para sua empresa. Estou pronta para começar a aprender seus processos hoje mesmo! Qual plano combina melhor com seu futuro?"
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate('/planos')}
                    className="w-full h-14 bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:shadow-[0_0_30px_rgba(0,194,255,0.3)] text-lg font-bold transition-all hover:scale-[1.01]"
                  >
                    Ativar minha Inteligência Cognitiva
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccount;
