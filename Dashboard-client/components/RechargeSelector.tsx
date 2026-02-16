import React, { useEffect, useState } from 'react';
import { X, Zap, Check, Bot, Loader2, ArrowRight } from 'lucide-react';
import { CreditPackage, getCreditPackages } from '../services/creditService';
import { toast } from 'react-hot-toast';

interface RechargeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (pkg: CreditPackage) => void;
    currentPlan: string;
}

const RechargeSelector: React.FC<RechargeSelectorProps> = ({ isOpen, onClose, onSelect, currentPlan }) => {
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredPkg, setHoveredPkg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadPackages();
        }
    }, [isOpen]);

    const loadPackages = async () => {
        setLoading(true);
        try {
            const pkgs = await getCreditPackages();
            setPackages(pkgs.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));
        } catch (error) {
            toast.error('Erro ao carregar pacotes de recarga.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-[#06080f]/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl bg-[#0B0B0F] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">

                {/* Left Side: Info & Upsell */}
                <div className="w-full md:w-1/3 bg-gradient-to-br from-[#1A1A24] to-[#0B0B0F] p-8 border-r border-white/5 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center mb-6 shadow-lg shadow-brand-primary/10">
                            <Zap className="w-6 h-6 text-brand-primary" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight mb-4">
                            Recarga de Créditos
                        </h2>
                        <p className="text-white/50 text-sm leading-relaxed mb-8">
                            Adicione créditos extras para garantir que sua LIA nunca pare de atender seus clientes.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-xs font-bold text-white/70">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-500" />
                                </div>
                                Sem data de expiração
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-white/70">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-500" />
                                </div>
                                Uso imediato após compra
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-white/70">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-green-500" />
                                </div>
                                Acumula com créditos do plano
                            </div>
                        </div>
                    </div>

                    {/* Upsell Card */}
                    {currentPlan === 'Start' && (
                        <div className="mt-12 p-5 rounded-3xl bg-gradient-to-br from-[#7C3AED]/10 to-[#FF2E9E]/10 border border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-brand-primary/20 blur-2xl -mr-8 -mt-8" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Bot className="w-4 h-4 text-brand-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Dica da Lia</span>
                                </div>
                                <p className="text-[11px] font-bold text-white/80 leading-tight mb-3">
                                    Usuários Plus economizam até <span className="text-white">40%</span> no custo por crédito.
                                </p>
                                <button className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest hover:gap-3 transition-all">
                                    Ver Planos <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Packages Selection */}
                <div className="flex-1 p-8 bg-[#0B0B0F] flex flex-col">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.2em] mb-6">Escolha um pacote</h3>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                                <p className="text-xs font-bold text-white/30">Carregando melhores ofertas...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {packages.map((pkg) => (
                                    <div
                                        key={pkg.id}
                                        onMouseEnter={() => setHoveredPkg(pkg.id)}
                                        onMouseLeave={() => setHoveredPkg(null)}
                                        onClick={() => onSelect(pkg)}
                                        className={`relative p-6 rounded-[32px] border transition-all duration-300 cursor-pointer group ${hoveredPkg === pkg.id
                                            ? 'bg-white/10 border-brand-primary shadow-xl scale-[1.02]'
                                            : 'bg-white/5 border-white/5'
                                            }`}
                                    >
                                        <div className="flex flex-col h-full justify-between gap-4">
                                            <div>
                                                {pkg.destaque && (
                                                    <span className="inline-block px-2 py-0.5 rounded-full bg-brand-primary text-[8px] font-black text-white uppercase tracking-widest mb-3">
                                                        {pkg.destaque}
                                                    </span>
                                                )}
                                                <h4 className="text-lg font-black text-white tracking-tight">{pkg.nome}</h4>
                                                <p className="text-2xl font-black text-brand-primary mt-1">
                                                    {pkg.creditos.toLocaleString('pt-BR')} <span className="text-xs font-bold text-white/30 uppercase tracking-widest">créditos</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                                                <span className="text-xl font-black text-white/90">
                                                    {Number(pkg.preco_eur).toLocaleString('pt-BR', { style: 'currency', currency: 'EUR' })}
                                                </span>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${hoveredPkg === pkg.id ? 'bg-brand-primary text-white scale-110' : 'bg-white/5 text-white/20'
                                                    }`}>
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                            Pagamento processado de forma segura pelo <strong>Stripe</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RechargeSelector;
