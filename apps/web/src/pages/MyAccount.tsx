import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, CreditCard, ArrowLeft, Loader2, Save, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

  // Tradução do status para exibição
  const statusDisplay = {
    'ativo': 'Ativo',
    'inativo': 'Inativo',
    'cancelado': 'Cancelado'
  }[planStatus] || 'Inativo';

  // Cor do badge de status
  const statusColor = {
    'ativo': 'text-green-400 bg-green-500/10 border-green-500/20',
    'inativo': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    'cancelado': 'text-red-400 bg-red-500/10 border-red-500/20'
  }[planStatus] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';

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

        {/* CARD PRINCIPAL - INFORMAÇÕES PESSOAIS */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl mb-6">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#00C2FF]" />
                <CardTitle className="text-white">Informações Pessoais</CardTitle>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-[#00C2FF] hover:text-[#00C2FF]/80 hover:bg-white/10"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
            <CardDescription className="text-white/60">
              Seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* NOME COMPLETO */}
            <div>
              <Label htmlFor="fullName" className="text-white/80 mb-2 block">
                Nome Completo
              </Label>
              {isEditing ? (
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  placeholder="Digite seu nome completo"
                />
              ) : (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <User className="w-5 h-5 text-[#00C2FF]" />
                  <p className="text-white font-medium">{userName}</p>
                </div>
              )}
            </div>

            {/* EMAIL (READ-ONLY) */}
            <div>
              <Label htmlFor="email" className="text-white/80 mb-2 block">
                E-mail
              </Label>
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <Mail className="w-5 h-5 text-[#00C2FF]" />
                <p className="text-white font-medium">{userEmail}</p>
              </div>
              <p className="text-white/40 text-xs mt-1">O e-mail não pode ser alterado</p>
            </div>

            {/* BOTÕES DE AÇÃO - MODO EDIÇÃO */}
            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:opacity-90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  Cancelar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD - INFORMAÇÕES DO PLANO */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#00C2FF]" />
              <CardTitle className="text-white">Plano e Assinatura</CardTitle>
            </div>
            <CardDescription className="text-white/60">
              Informações sobre seu plano atual
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* NOME DO PLANO */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="text-white/60 text-sm">Plano Atual</p>
                <p className="text-white font-medium text-lg">{planName}</p>
              </div>
              <div className={`px-4 py-2 rounded-full border ${statusColor} font-semibold`}>
                {statusDisplay}
              </div>
            </div>

            {/* MENSAGEM PARA USUÁRIOS SEM PLANO */}
            {!userPlan && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Você ainda não possui um plano ativo. Conheça nossos planos e escolha o melhor para você!
                </p>
                <Button
                  onClick={() => navigate('/planos')}
                  className="mt-3 bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] hover:opacity-90"
                >
                  Ver Planos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyAccount;
