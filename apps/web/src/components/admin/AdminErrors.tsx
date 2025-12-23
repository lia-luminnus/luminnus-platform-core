import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Search, Filter, Loader2, RefreshCw, CheckCircle, Eye, Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ErrorEntry {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  component: string;
  stack_trace?: string;
  user_id?: string;
  resolved: boolean;
  created_at: string;
}

const SEVERITIES = {
  critical: { label: "Crítico", color: "bg-red-600 text-white" },
  high: { label: "Alto", color: "bg-red-100 text-red-700" },
  medium: { label: "Médio", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "Baixo", color: "bg-blue-100 text-blue-700" },
};

/**
 * COMPONENTE: AdminErrors
 *
 * Painel para monitoramento e gestão de erros do sistema
 */
const AdminErrors = () => {
  const { toast } = useToast();
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterResolved, setFilterResolved] = useState<string>("all");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorEntry | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const stats = {
    total: errors.filter((e) => !e.resolved).length,
    critical: errors.filter((e) => e.severity === "critical" && !e.resolved).length,
    warnings: errors.filter((e) => (e.severity === "medium" || e.severity === "low") && !e.resolved).length,
    rate: errors.length > 0 ? ((errors.filter((e) => !e.resolved).length / errors.length) * 100).toFixed(1) : "0",
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.log('Tabela system_errors não existe');
        setErrors([]);
      } else {
        setErrors((data || []) as ErrorEntry[]);
      }
    } catch (error) {
      setErrors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredErrors = errors.filter((error) => {
    const matchesSearch =
      error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.component.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || error.severity === filterSeverity;
    const matchesResolved =
      filterResolved === "all" ||
      (filterResolved === "resolved" && error.resolved) ||
      (filterResolved === "unresolved" && !error.resolved);
    return matchesSearch && matchesSeverity && matchesResolved;
  });

  const handleSearch = () => {
    toast({ title: "Busca aplicada", description: `${filteredErrors.length} erros encontrados.` });
  };

  const handleRefresh = async () => {
    await loadErrors();
    toast({ title: "Atualizado", description: "Lista de erros atualizada." });
  };

  const handleViewDetail = (error: ErrorEntry) => {
    setSelectedError(error);
    setIsDetailModalOpen(true);
  };

  const handleResolve = async (error: ErrorEntry) => {
    setIsResolving(true);
    try {
      const { error: updateError } = await supabase
        .from('system_errors')
        .update({ resolved: true })
        .eq('id', error.id);

      if (updateError) throw updateError;

      setErrors((prev) => prev.map((e) => (e.id === error.id ? { ...e, resolved: true } : e)));
      toast({ title: "Resolvido", description: "Erro marcado como resolvido." });
      if (selectedError?.id === error.id) setIsDetailModalOpen(false);
    } catch {
      toast({ title: "Erro", description: "Não foi possível resolver.", variant: "destructive" });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          Monitoramento de Erros
        </h1>
        <p className="text-gray-600">Visualize e gerencie erros do sistema em tempo real</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por mensagem ou componente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterResolved} onValueChange={setFilterResolved}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unresolved">Não Resolvidos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleSearch}>
          <Search className="w-4 h-4 mr-2" />
          Buscar
        </Button>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Erros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Não resolvidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-700">{stats.critical}</p>
            <p className="text-xs text-gray-500 mt-1">Precisam atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avisos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{stats.warnings}</p>
            <p className="text-xs text-gray-500 mt-1">Não bloqueantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Taxa de Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-700">{stats.rate}%</p>
            <p className="text-xs text-gray-500 mt-1">Do total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Erros Recentes</CardTitle>
          <CardDescription>Lista de erros ({filteredErrors.length} registros)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-lg font-semibold text-green-600">Nenhum erro encontrado</p>
              <p className="text-sm">O sistema está operando normalmente</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredErrors.map((error) => (
                <div
                  key={error.id}
                  className={`flex items-start gap-4 p-3 rounded-lg border ${
                    error.resolved ? "bg-gray-50 opacity-60" : error.severity === "critical" ? "bg-red-50 border-red-200" : "bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center text-xs text-gray-500 min-w-[60px]">
                    <Calendar className="w-4 h-4 mb-1" />
                    <span>{new Date(error.created_at).toLocaleDateString('pt-BR')}</span>
                    <Clock className="w-3 h-3 mt-1 mb-1" />
                    <span>{new Date(error.created_at).toLocaleTimeString('pt-BR')}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={SEVERITIES[error.severity]?.color}>{SEVERITIES[error.severity]?.label}</Badge>
                      <span className="text-xs text-gray-500">{error.component}</span>
                      {error.resolved && <Badge className="bg-green-100 text-green-700">Resolvido</Badge>}
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">{error.message}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetail(error)}>
                      <Eye className="w-4 h-4 text-gray-600" />
                    </Button>
                    {!error.resolved && (
                      <Button variant="ghost" size="icon" onClick={() => handleResolve(error)} disabled={isResolving}>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Erro</DialogTitle>
            <DialogDescription>Informações completas</DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={SEVERITIES[selectedError.severity]?.color}>{SEVERITIES[selectedError.severity]?.label}</Badge>
                {selectedError.resolved && <Badge className="bg-green-100 text-green-700">Resolvido</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Componente</p>
                  <p className="font-medium">{selectedError.component}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data/Hora</p>
                  <p className="font-medium">{new Date(selectedError.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Mensagem</p>
                <p className="p-3 bg-gray-50 rounded-lg text-sm">{selectedError.message}</p>
              </div>
              {selectedError.stack_trace && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Stack Trace</p>
                  <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">{selectedError.stack_trace}</pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Fechar</Button>
            {selectedError && !selectedError.resolved && (
              <Button onClick={() => handleResolve(selectedError)} disabled={isResolving} className="bg-green-600 hover:bg-green-700">
                {isResolving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Marcar como Resolvido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminErrors;
