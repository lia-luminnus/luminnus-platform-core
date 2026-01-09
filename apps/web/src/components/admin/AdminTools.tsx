import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Send, Loader2, Terminal, Trash2, Activity, Server, Database, Zap, FileCode, RefreshCw, AlertTriangle, CheckCircle, XCircle, Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enviarMensagemLIA } from "@/lib/api/lia";
import { secureStorage } from "@/lib/secureStorage";
import { useAuth } from "@/contexts/AuthContext";
import { io, Socket } from "socket.io-client";
import { useRef } from "react";

// Types
interface TestMessage {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  details?: any;
}

interface ServiceHealth {
  name: string;
  status: "OK" | "DEGRADED" | "DOWN";
  latency_ms: number;
  message?: string;
  key_loaded?: boolean;
}

interface SystemHealth {
  status: "OK" | "DEGRADED" | "CRITICAL";
  services: ServiceHealth[];
  timestamp: string;
  trace_id?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  trace_id: string;
  service: string;
  route: string;
}

export const AdminTools = () => {
  const { toast } = useToast();
  const { session } = useAuth();

  // Diagnostic Mode State
  const [isDiagnosticMode, setIsDiagnosticMode] = useState(() => {
    return localStorage.getItem('admin_lia_mode') === 'DIAGNOSTIC';
  });

  // Test Console State
  const [testMessage, setTestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Health Dashboard State
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Persist diagnostic mode
  useEffect(() => {
    localStorage.setItem('admin_lia_mode', isDiagnosticMode ? 'DIAGNOSTIC' : 'NORMAL');
  }, [isDiagnosticMode]);

  // Get API base URL with smart fallback for Dev/Prod
  const getApiBaseUrl = () => {
    const config = secureStorage.load();
    if (config?.liaApiUrl) return config.liaApiUrl;

    // Fallback: if we are in localhost:8080/5173, backend is likely on 3000
    if (typeof window !== 'undefined') {
      const { hostname, protocol, port } = window.location;
      if (port === '8080' || port === '5173') {
        const localUrl = `${protocol}//${hostname}:3000`;
        // Sync to secureStorage so enviarMensagemLIA uses it too
        secureStorage.save({ ...config, liaApiUrl: localUrl });
        return localUrl;
      }
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }
    return 'http://localhost:3000';
  };

  // Fetch System Health
  const fetchSystemHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const token = session?.access_token || '';
      const response = await fetch(`${getApiBaseUrl()}/api/admin/system/health`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.status === 403) {
        toast({
          title: "Acesso Negado",
          description: "Sua conta não tem privilégios de ROOT_ADMIN.",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
      // Don't show toast for connection errors to avoid spamming the user
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const token = session?.access_token || '';
      const response = await fetch(`${getApiBaseUrl()}/api/admin/system/logs?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Initial load & Socket Connection
  useEffect(() => {
    if (isDiagnosticMode) {
      fetchSystemHealth();
      fetchLogs();

      // Connect to Socket for thoughts
      const socketUrl = getApiBaseUrl();
      const socket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('📡 [Diagnostic] Socket conectado para pensamentos');
      });

      socket.on('diagnostic:thought', (thought) => {
        console.log('🧠 [Thought] recebido:', thought);

        let message = '';
        if (thought.action === 'TOOL_EXECUTION') {
          message = `[PENSAMENTO] Executando ferramenta: ${thought.details.tool}...`;
        } else {
          message = `[PENSAMENTO] ${thought.action}: ${JSON.stringify(thought.details)}`;
        }

        setMessages((prev) => [...prev, {
          id: `thought-${Date.now()}-${Math.random()}`,
          type: "system",
          content: message,
          timestamp: new Date(),
          details: thought.details
        }]);
      });

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [isDiagnosticMode]);

  // Send test message
  const handleSendTest = async () => {
    if (!testMessage.trim()) return;

    setIsSending(true);

    const userMessage: TestMessage = {
      id: Date.now().toString(),
      type: "user",
      content: testMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const resposta = await enviarMensagemLIA(testMessage, {
        liaMode: isDiagnosticMode ? 'DIAGNOSTIC' : 'NORMAL',
      });

      const respostaTexto = resposta.reply || resposta.response || resposta.text || resposta.message || "LIA não retornou uma resposta válida.";

      const assistantMessage: TestMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: respostaTexto,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTestMessage("");
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        type: "assistant",
        content: `⚠️ Erro de Sistema: ${error instanceof Error ? error.message : "Falha na comunicação com o núcleo da LIA"}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // Status icon helper
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'DEGRADED':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'DOWN':
      case 'CRITICAL':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      default:
        return <Activity className="h-5 w-5 text-slate-500" />;
    }
  };

  // Service icon helper
  const ServiceIcon = ({ name }: { name: string }) => {
    switch (name.toLowerCase()) {
      case 'supabase': return <Database className="h-4 w-4" />;
      case 'openai': return <Zap className="h-4 w-4" />;
      case 'google': return <Server className="h-4 w-4" />;
      case 'realtime': return <Activity className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header with Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="h-8 w-8 text-purple-400" />
            {isDiagnosticMode ? 'Console de Diagnóstico' : 'Ferramentas e Testes'}
          </h2>
          <p className="text-slate-400">
            {isDiagnosticMode
              ? 'Ambiente de SRE/DevOps - Respostas estruturadas em formato de incidente'
              : 'Monitoramento e testes da IA'
            }
          </p>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/80 border border-slate-700 shadow-xl">
          <Label htmlFor="diagnostic-mode" className="text-sm font-bold text-slate-300 ml-2">
            MODO DIAGNÓSTICO
          </Label>
          <Switch
            id="diagnostic-mode"
            checked={isDiagnosticMode}
            onCheckedChange={setIsDiagnosticMode}
            className="data-[state=checked]:bg-orange-500"
          />
          <Badge className={isDiagnosticMode ? "bg-orange-600/20 text-orange-400 border-orange-500/50" : "bg-slate-700 text-slate-400"}>
            {isDiagnosticMode ? 'ATIVO' : 'OFF'}
          </Badge>
        </div>
      </div>

      {/* Diagnostic Mode: Show Health Dashboard */}
      {isDiagnosticMode && (
        <Card className="border-slate-700 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-slate-100 text-lg">Saúde do Ecossistema</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSystemHealth}
                disabled={isLoadingHealth}
                className="hover:bg-slate-800 text-slate-400"
              >
                {isLoadingHealth ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {systemHealth ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-white/5">
                  <StatusIcon status={systemHealth.status} />
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estado Geral</div>
                    <div className={`text-xl font-black ${systemHealth.status === 'OK' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {systemHealth.status === 'OK' ? 'SYSTEMS NOMINAL' : 'SYSTEMS DEGRADED'}
                    </div>
                  </div>
                  <div className="ml-auto text-right font-mono text-[10px] text-slate-600">
                    ID: {systemHealth.trace_id}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {systemHealth.services.map((service) => (
                    <div key={service.name} className="p-4 rounded-xl border border-white/5 bg-slate-800/20 hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <ServiceIcon name={service.name} />
                          <span className="text-xs font-black uppercase tracking-tight">{service.name}</span>
                        </div>
                        <StatusIcon status={service.status} />
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] text-slate-600">LATENCY</span>
                        <span className="text-xs font-mono text-emerald-500">{service.latency_ms}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-600 italic">
                {isLoadingHealth ? <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-500" /> : "Aguardando varredura de sistemas..."}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs for Console and Logs */}
      <Tabs defaultValue="console" className="space-y-4">
        <TabsList className="bg-slate-900 border border-white/5">
          <TabsTrigger value="console" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
            <Terminal className="h-4 w-4 mr-2" /> TERMINAL
          </TabsTrigger>
          {isDiagnosticMode && (
            <TabsTrigger value="logs" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-400">
              <FileCode className="h-4 w-4 mr-2" /> LOGS_LIVE
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="console" className="space-y-4">
          <Card className="border-slate-700 bg-slate-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-300 text-sm font-bold flex items-center gap-2">
                <Mic className="h-4 w-4 text-purple-400" /> INPUT_DIRECT_COMMAND
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={isDiagnosticMode ? "Execute um diagnóstico (ex: 'analisar logs de erro')" : "Enviar mensagem de teste..."}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                className="bg-slate-950/80 border-slate-700 text-slate-200 placeholder:text-slate-700 font-mono text-xs focus-visible:ring-purple-500"
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSendTest(); }}
              />
              <div className="flex gap-2">
                <Button onClick={handleSendTest} disabled={isSending} className={`flex-1 font-black tracking-widest text-[10px] ${isDiagnosticMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isDiagnosticMode ? 'EXECUTE_DIAGNOSTIC' : 'SEND_SIGNAL')}
                </Button>
                <Button variant="outline" onClick={clearMessages} className="border-white/5 text-slate-500 hover:bg-slate-800">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-950 font-mono text-xs overflow-hidden shadow-2xl">
            <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between text-slate-500 select-none">
              <div className="flex gap-1.5 pt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              </div>
              <span className="text-[9px] font-black tracking-widest opacity-50">LIA_KERNEL_SHELL_v4.0</span>
            </div>
            <ScrollArea className="h-[400px] p-4">
              {messages.length === 0 ? (
                <div className="h-[350px] flex flex-col items-center justify-center opacity-10 text-slate-200">
                  <Activity className="h-16 w-16 mb-4 animate-pulse" />
                  <span className="text-xl font-black tracking-tighter">IDLE_STATE</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className="group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-black text-[9px] px-1 rounded ${msg.type === 'user' ? 'bg-blue-500/10 text-blue-400' :
                            msg.type === 'system' ? 'bg-slate-500/10 text-slate-500' :
                              'bg-emerald-500/10 text-emerald-400'
                          }`}>
                          {msg.type === 'user' ? 'ROOT_USER' : msg.type === 'system' ? 'SYSTEM_THOUGHT' : 'LIA_CORE'}
                        </span>
                        <span className="text-slate-700 font-mono text-[8px]">{msg.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <div className={`pl-3 border-l-2 ${msg.type === 'user' ? 'border-blue-500/30' :
                          msg.type === 'system' ? 'border-slate-800 animate-pulse' :
                            'border-emerald-500/30'
                        }`}>
                        <p className={`whitespace-pre-wrap leading-relaxed ${msg.type === 'user' ? 'text-slate-400' :
                            msg.type === 'system' ? 'text-slate-600 italic' :
                              'text-emerald-500'
                          }`}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        {isDiagnosticMode && (
          <TabsContent value="logs">
            <Card className="border-slate-700 bg-slate-950 font-mono">
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/5">
                <CardTitle className="text-xs text-orange-400 font-black tracking-widest uppercase">Kernel_Logs_Dump</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={isLoadingLogs} className="h-7 text-slate-500">
                  {isLoadingLogs ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px] p-4 text-[10px]">
                  {logs.length === 0 ? (
                    <div className="h-[450px] flex items-center justify-center text-slate-800">NO_DATA_STREAM</div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className={`p-1 flex gap-2 rounded ${log.level === 'error' ? 'text-rose-400 bg-rose-400/5' : log.level === 'warn' ? 'text-amber-400' : 'text-slate-500'}`}>
                          <span className="opacity-30">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                          <span className="font-bold underline min-w-[40px]">{log.level.toUpperCase()}</span>
                          <span className="text-purple-400 uppercase tracking-tighter">@{log.service}</span>
                          <span className="flex-1 truncate">{log.message}</span>
                          <span className="opacity-20 text-[8px]">{log.trace_id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Footer Info */}
      <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-600 font-black tracking-widest uppercase">
        <span>Luminnus Platform Core v4.0.0-PRO</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500" /> SECURE_ENCRYPTION_ACTIVE</span>
          <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500" /> KERNEL_HEALTH_OK</span>
        </div>
      </div>
    </div>
  );
};
