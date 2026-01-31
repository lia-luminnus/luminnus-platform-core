
import React, { useState, useEffect } from "react";
import {
    Users, MessageCircle, AlertCircle, RefreshCw,
    Search, Shield, Activity, Globe, Save,
    CheckCircle2, XCircle, Info, ChevronRight,
    ShieldCheck, Smartphone, Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api";

/**
 * AdminWhatsAppGovernance
 */
const AdminWhatsAppGovernance = () => {
    const { session } = useAuth();
    const [activeTab, setActiveTab] = useState("tenants");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Platform Settings State
    const [platformConfig, setPlatformConfig] = useState({
        phoneNumberId: "",
        wabaId: "",
        accessToken: "",
        verifyToken: "",
        webhookUrl: "https://api.luminnus.ai/api/whatsapp/webhook"
    });

    const [overview, setOverview] = useState({
        totalTenants: 0,
        errorTenants: 0,
        webhookHealth: "0%",
        messagesToday: "0",
        templatesToday: "0",
        activeAlerts: 0
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = session?.access_token || '';
                const response = await fetch(apiUrl('/api/admin/whatsapp/platform-config'), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                if (data.config) {
                    setPlatformConfig(data.config);
                }
            } catch (error) {
                console.error('❌ Error fetching config:', error);
                toast.error("Erro ao carregar configurações.");
            } finally {
                setInitialLoading(false);
            }
        };

        const fetchOverview = async () => {
            try {
                const token = session?.access_token || '';
                const response = await fetch(apiUrl('/api/admin/whatsapp/overview'), {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                if (data && !data.error) {
                    setOverview(data);
                }
            } catch (error) {
                console.error('❌ Error fetching overview:', error);
            }
        };

        fetchConfig();
        fetchOverview();
    }, [session]);

    const [tenants, setTenants] = useState<any[]>([]);

    const fetchTenants = async () => {
        try {
            const token = session?.access_token || '';
            const response = await fetch(apiUrl(`/api/admin/whatsapp/tenants?search=${search}`), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.tenants) {
                setTenants(data.tenants);
            }
        } catch (error) {
            console.error('❌ Error fetching tenants:', error);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, [search]);

    const handleSavePlatformConfig = async () => {
        setLoading(true);
        try {
            const token = session?.access_token || '';
            const response = await fetch(apiUrl('/api/admin/whatsapp/platform-config'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ config: platformConfig })
            });

            // v1.2: Use clone to avoid 'body stream already read' errors
            const responseClone = response.clone();

            if (!response.ok) {
                let errorMsg = `Erro ${response.status}: ${response.statusText}`;
                try {
                    const text = await responseClone.text();
                    try {
                        const errorData = JSON.parse(text);
                        errorMsg = errorData.error || errorMsg;
                    } catch {
                        // Not a JSON error, try to get text if short
                        if (text && text.length < 200) errorMsg = text;
                    }
                } catch (e) {
                    console.error('Error reading error response:', e);
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();
            if (result.success) {
                toast.success("Configuração da Plataforma salva com sucesso!");
            } else {
                throw new Error(result.error || "Erro inesperado do servidor");
            }
        } catch (error) {
            console.error('❌ Error saving config:', error);
            toast.error("Erro ao salvar configurações: " + String(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-emerald-500/10 border-emerald-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-500">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-600/60 uppercase">Total de Clientes</p>
                            <h3 className="text-2xl font-black text-emerald-700">{overview.totalTenants}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-500/10 border-red-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-xl text-red-500">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-red-600/60 uppercase">Erros Ativos</p>
                            <h3 className="text-2xl font-black text-red-700">{overview.errorTenants}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-500/10 border-indigo-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-500">
                            <Activity size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-indigo-600/60 uppercase">Webhook Health</p>
                            <h3 className="text-2xl font-black text-indigo-700">{overview.webhookHealth}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500">
                            <MessageCircle size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-amber-600/60 uppercase">Mgs Hoje</p>
                            <h3 className="text-2xl font-black text-amber-700">{overview.messagesToday}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 border border-white/10">
                    <TabsTrigger value="tenants" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <Globe className="w-4 h-4 mr-2" /> Governança de Clientes
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <Shield className="w-4 h-4 mr-2" /> Configuração da Plataforma
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Tenant Governance */}
                <TabsContent value="tenants" className="space-y-4 pt-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Buscar empresa ou número..."
                                className="pl-10 bg-slate-900/40 border-white/10 text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="border-white/10 text-xs">
                            <RefreshCw className="w-3 h-3 mr-2" /> Atualizar Tudo
                        </Button>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-slate-900/30 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 uppercase text-[10px] font-black tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Empresa / ID</th>
                                    <th className="px-6 py-4">Número</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Qualidade</th>
                                    <th className="px-6 py-4">Webhook</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {tenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group border-b border-white/5 last:border-0">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white text-sm">{tenant.name}</div>
                                            <div className="text-[10px] text-gray-500 font-mono tracking-tighter">{tenant.id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">{tenant.phone}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={tenant.status === 'online' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}>
                                                {tenant.status === 'online' ? 'Online' : 'Offline'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${tenant.quality === 'green' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                    tenant.quality === 'yellow' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                                        'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                                    }`} />
                                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider whitespace-nowrap">{tenant.quality || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold uppercase tracking-wider">
                                            {tenant.webhook === 'connected' ? (
                                                <span className="flex items-center gap-1.5 text-emerald-400">
                                                    <CheckCircle2 size={12} /> Connected
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-red-400">
                                                    <XCircle size={12} /> Error
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10">
                                                <ChevronRight size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* Tab: Platform Configuration */}
                <TabsContent value="settings" className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-slate-900/30 border-white/10 shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <ShieldCheck className="text-indigo-400" />
                                    Segurança & Protocolo
                                </CardTitle>
                                <CardDescription>
                                    Configurações de validação para o Webhook LIA
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-4">
                                    <p className="text-xs text-indigo-300 leading-relaxed font-bold">
                                        Status BYO (Bring Your Own): As credenciais de envio (Token/WABA) agora são gerenciadas individualmente por cada cliente no Hub de Integrações.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verify Token</label>
                                    <Input
                                        value={platformConfig.verifyToken}
                                        onChange={(e) => setPlatformConfig({ ...platformConfig, verifyToken: e.target.value })}
                                        placeholder="Token de verificação do Webhook"
                                        className="bg-slate-900/50 border-white/10 font-mono text-sm h-11"
                                    />
                                    <p className="text-[9px] text-gray-500 uppercase tracking-widest">Este valor deve ser o mesmo configurado no painel da Meta para validar o Webhook.</p>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 h-10 shadow-lg shadow-indigo-600/30"
                                        onClick={handleSavePlatformConfig}
                                        disabled={loading}
                                    >
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        Salvar Configuração
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="bg-indigo-950/20 border-indigo-500/20 shadow-xl overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Smartphone size={120} />
                                </div>
                                <CardHeader>
                                    <CardTitle className="text-white text-lg">Webhook Endpoint</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-gray-400">O URL de recepção de eventos da Meta deve apontar para:</p>
                                    <div className="p-3 bg-black/40 rounded-lg border border-white/10 font-mono text-xs text-indigo-400 select-all">
                                        {platformConfig.webhookUrl}
                                    </div>

                                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
                                        <Info className="text-amber-500 shrink-0" size={18} />
                                        <p className="text-[11px] text-amber-500/80 leading-relaxed">
                                            Lembre-se de configurar o <strong>Verify Token</strong> no painel de desenvolvedores do Facebook
                                            para corresponder ao valor definido no servidor LIA Core.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-900/30 border-white/10">
                                <CardHeader className="py-4">
                                    <CardTitle className="text-sm">Status da Conexão</CardTitle>
                                </CardHeader>
                                <CardContent className="pb-6">
                                    {platformConfig.phoneNumberId && platformConfig.accessToken ? (
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-xs font-bold text-emerald-400 uppercase">API Online</span>
                                            </div>
                                            <span className="text-[10px] text-emerald-500/60 font-mono">META_v19.0</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 opacity-60">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                <span className="text-xs font-bold text-red-400 uppercase">Desconectado</span>
                                            </div>
                                            <span className="text-[10px] text-red-500/60 font-mono">AGUARDANDO CONFIG</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminWhatsAppGovernance;
