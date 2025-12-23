import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Plus, Edit, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserPlanLimits } from '@/hooks/useUserPlanLimits';
import { useNavigate } from 'react-router-dom';

/**
 * INTERFACE: Agendamento
 */
interface Agendamento {
  id: string;
  user_id: string;
  titulo: string;
  data: string;
  hora: string;
  descricao: string | null;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido';
  created_at: string;
  updated_at: string;
}

/**
 * COMPONENTE: DashboardAgenda
 *
 * Página de agenda com funcionalidades CRUD
 */
const DashboardAgenda = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canUseFeature, incrementUsage, getRemainingUsage } = useUserPlanLimits();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    data: '',
    hora: '',
    descricao: '',
    status: 'pendente' as 'pendente' | 'confirmado' | 'cancelado' | 'concluido',
  });

  /**
   * EFEITO: Carregar agendamentos ao montar componente
   */
  useEffect(() => {
    if (user) {
      loadAgendamentos();
    }
  }, [user]);

  /**
   * FUNÇÃO: Carregar agendamentos
   */
  const loadAgendamentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('user_id', user!.id)
        .order('data', { ascending: true })
        .order('hora', { ascending: true });

      if (error) throw error;

      setAgendamentos((data || []) as Agendamento[]);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * FUNÇÃO: Abrir dialog para criar agendamento
   */
  const handleNovoAgendamento = () => {
    setEditingAgendamento(null);
    setFormData({
      titulo: '',
      data: '',
      hora: '',
      descricao: '',
      status: 'pendente',
    });
    setIsDialogOpen(true);
  };

  /**
   * FUNÇÃO: Abrir dialog para editar agendamento
   */
  const handleEditarAgendamento = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento);
    setFormData({
      titulo: agendamento.titulo,
      data: agendamento.data,
      hora: agendamento.hora,
      descricao: agendamento.descricao || '',
      status: agendamento.status,
    });
    setIsDialogOpen(true);
  };

  /**
   * FUNÇÃO: Salvar agendamento (criar ou editar)
   */
  const handleSalvarAgendamento = async () => {
    if (!formData.titulo || !formData.data || !formData.hora) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar limites do plano (apenas para novos agendamentos)
    if (!editingAgendamento && !canUseFeature('agendamentos')) {
      toast({
        title: 'Limite de agendamentos atingido',
        description: 'Você atingiu o limite do seu plano. Faça upgrade para criar mais agendamentos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingAgendamento) {
        // Editar agendamento existente
        const { error } = await supabase
          .from('agendamentos')
          .update({
            titulo: formData.titulo,
            data: formData.data,
            hora: formData.hora,
            descricao: formData.descricao,
            status: formData.status,
          })
          .eq('id', editingAgendamento.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Agendamento atualizado com sucesso.',
        });
      } else {
        // Criar novo agendamento
        const { error } = await supabase
          .from('agendamentos')
          .insert({
            user_id: user!.id,
            titulo: formData.titulo,
            data: formData.data,
            hora: formData.hora,
            descricao: formData.descricao,
            status: formData.status,
          });

        if (error) throw error;

        // Incrementar contador de uso
        await incrementUsage('agendamentos');

        toast({
          title: 'Sucesso',
          description: 'Agendamento criado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      loadAgendamentos();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o agendamento.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Excluir agendamento
   */
  const handleExcluirAgendamento = async (id: string) => {
    if (!confirm('Deseja realmente excluir este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Agendamento excluído com sucesso.',
      });
      loadAgendamentos();
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o agendamento.',
        variant: 'destructive',
      });
    }
  };

  /**
   * FUNÇÃO: Formatar data
   */
  const formatarData = (data: string) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  /**
   * FUNÇÃO: Obter cor do status
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'text-green-400 bg-green-400/10';
      case 'pendente':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'cancelado':
        return 'text-red-400 bg-red-400/10';
      case 'concluido':
        return 'text-blue-400 bg-blue-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  /**
   * FUNÇÃO: Obter label do status
   */
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'Confirmado';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Agenda</h1>
          <p className="text-white/60">Gerencie seus compromissos e agendamentos</p>
        </div>
        <Button
          onClick={handleNovoAgendamento}
          className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* ALERTA DE USO */}
      {(() => {
        const remaining = getRemainingUsage('agendamentos');
        if (remaining !== 'unlimited' && remaining <= 5) {
          return (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-200">
                Você tem apenas {remaining} agendamentos restantes no seu plano.{' '}
                <button
                  onClick={() => navigate('/planos')}
                  className="underline font-medium hover:text-yellow-100"
                >
                  Faça upgrade
                </button>
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}

      {/* LISTA DE AGENDAMENTOS */}
      {loading ? (
        <div className="text-center text-white/60 py-16">Carregando...</div>
      ) : agendamentos.length === 0 ? (
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Nenhum agendamento</h3>
            <p className="text-white/60 text-center max-w-md mb-4">
              Você não possui agendamentos no momento. Clique no botão acima para criar um novo agendamento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agendamentos.map((agendamento) => (
            <Card key={agendamento.id} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-white text-lg">{agendamento.titulo}</CardTitle>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agendamento.status)}`}>
                        {getStatusLabel(agendamento.status)}
                      </span>
                    </div>
                    <CardDescription className="text-white/60 flex items-center gap-4">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatarData(agendamento.data)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {agendamento.hora}
                      </span>
                    </CardDescription>
                    {agendamento.descricao && (
                      <p className="text-white/50 text-sm mt-2">{agendamento.descricao}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditarAgendamento(agendamento)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleExcluirAgendamento(agendamento.id)}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* DIALOG DE CRIAÇÃO/EDIÇÃO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#1a1a2e] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingAgendamento ? 'Edite as informações do agendamento' : 'Preencha as informações do novo agendamento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/80 mb-1 block">Título *</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Reunião com cliente"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/80 mb-1 block">Data *</label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/80 mb-1 block">Hora *</label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/80 mb-1 block">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes do agendamento (opcional)"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[100px]"
              />
            </div>

            {editingAgendamento && (
              <div>
                <label className="text-sm text-white/80 mb-1 block">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
                >
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarAgendamento}
              className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90"
            >
              <Check className="w-4 h-4 mr-2" />
              {editingAgendamento ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardAgenda;
