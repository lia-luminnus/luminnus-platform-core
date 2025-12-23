import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Filter, Search, Loader2, RefreshCw, Calendar, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  id: string;
  type: "application" | "api" | "auth";
  level: "info" | "warning" | "error";
  message: string;
  metadata?: Record<string, any>;
  created_at: string;
}

const LOG_TYPES = {
  application: { label: "Aplicação", color: "bg-blue-100 text-blue-700" },
  api: { label: "API", color: "bg-green-100 text-green-700" },
  auth: { label: "Autenticação", color: "bg-purple-100 text-purple-700" },
};

const LOG_LEVELS = {
  info: { label: "Info", color: "bg-gray-100 text-gray-700" },
  warning: { label: "Aviso", color: "bg-yellow-100 text-yellow-700" },
  error: { label: "Erro", color: "bg-red-100 text-red-700" },
};

/**
 * COMPONENTE: AdminLogs
 *
 * Painel para visualização de logs do sistema
 * - Logs de aplicação
 * - Logs de API
 * - Logs de autenticação
 * - Exportação de logs
 */
const AdminLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Estatísticas
  const stats = {
    application: logs.filter((l) => l.type === "application").length,
    api: logs.filter((l) => l.type === "api").length,
    auth: logs.filter((l) => l.type === "auth").length,
  };

  // Carregar logs
  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.log('Tabela system_logs não existe');
        setLogs([]);
      } else {
        setLogs((data || []) as LogEntry[]);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || log.type === filterType;
    const matchesLevel = filterLevel === "all" || log.level === filterLevel;
    return matchesSearch && matchesType && matchesLevel;
  });

  // Handlers
  const handleSearch = () => {
    toast({
      title: "Busca aplicada",
      description: `${filteredLogs.length} logs encontrados.`,
    });
  };

  const handleRefresh = async () => {
    await loadLogs();
    toast({
      title: "Logs atualizados",
      description: "A lista de logs foi atualizada.",
    });
  };

  const handleExport = async () => {
    if (filteredLogs.length === 0) {
      toast({
        title: "Nenhum log",
        description: "Não há logs para exportar.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const headers = ["ID", "Tipo", "Nível", "Mensagem", "Data"];
      const csvContent = [
        headers.join(","),
        ...filteredLogs.map((log) =>
          [
            log.id,
            log.type,
            log.level,
            `"${log.message.replace(/"/g, '""')}"`,
            new Date(log.created_at).toLocaleString('pt-BR'),
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `${filteredLogs.length} logs exportados.`,
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os logs.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilterByType = (type: string) => {
    setFilterType(type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          Logs do Sistema
        </h1>
        <p className="text-gray-600">
          Visualize e exporte logs de atividades do sistema
        </p>
      </div>

      {/* Filtros e Ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar nos logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={filterType} onValueChange={handleFilterByType}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="application">Aplicação</SelectItem>
            <SelectItem value="api">API</SelectItem>
            <SelectItem value="auth">Autenticação</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Aviso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
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
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Exportar
        </Button>
      </div>

      {/* Cards de Tipos de Log */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${filterType === 'application' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleFilterByType(filterType === 'application' ? 'all' : 'application')}
        >
          <CardHeader>
            <CardTitle className="text-lg">Logs de Aplicação</CardTitle>
            <CardDescription>Eventos gerais da aplicação</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{stats.application} eventos</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${filterType === 'api' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => handleFilterByType(filterType === 'api' ? 'all' : 'api')}
        >
          <CardHeader>
            <CardTitle className="text-lg">Logs de API</CardTitle>
            <CardDescription>Requisições e respostas da API</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.api} requisições</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${filterType === 'auth' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => handleFilterByType(filterType === 'auth' ? 'all' : 'auth')}
        >
          <CardHeader>
            <CardTitle className="text-lg">Logs de Autenticação</CardTitle>
            <CardDescription>Logins e ações de usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">{stats.auth} ações</p>
          </CardContent>
        </Card>
      </div>

      {/* Área de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Logs</CardTitle>
          <CardDescription>
            Histórico cronológico de eventos do sistema ({filteredLogs.length} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold">Nenhum log encontrado</p>
              <p className="text-sm">
                {searchTerm || filterType !== "all" || filterLevel !== "all"
                  ? "Tente ajustar os filtros"
                  : "O sistema registrará atividades aqui"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center text-xs text-gray-500 min-w-[60px]">
                    <Calendar className="w-4 h-4 mb-1" />
                    <span>{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                    <Clock className="w-3 h-3 mt-1 mb-1" />
                    <span>{new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={LOG_TYPES[log.type]?.color || "bg-gray-100 text-gray-700"}>
                        {LOG_TYPES[log.type]?.label || log.type}
                      </Badge>
                      <Badge className={LOG_LEVELS[log.level]?.color || "bg-gray-100 text-gray-700"}>
                        {LOG_LEVELS[log.level]?.label || log.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-800">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogs;
