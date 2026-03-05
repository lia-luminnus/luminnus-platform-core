import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, CreditCard, Mail, ShieldAlert } from 'lucide-react';

/**
 * PÁGINA: CONTA CONGELADA
 *
 * Exibida quando a assinatura do cliente está em status 'frozen'
 * após 10 dias de inadimplência. A conta não é cancelada —
 * dados são mantidos e o acesso é restaurado ao regularizar.
 */
const AccountFrozen = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background glow effects */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[150px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[150px]" />

            <div className="max-w-lg w-full relative z-10">
                {/* Icon */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                        <Lock className="w-10 h-10 text-red-400" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                        Conta Temporariamente Suspensa
                    </h1>
                    <p className="text-white/50 text-lg">
                        Pagamento pendente detectado
                    </p>
                </div>

                {/* Main card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ShieldAlert className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg mb-2">O que aconteceu?</h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Após várias tentativas, não conseguimos processar o pagamento da sua assinatura.
                                Sua conta foi <strong className="text-white/90">temporariamente congelada</strong> como
                                medida de proteção.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-white/70 text-sm">Seus dados estão seguros e intactos</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-white/70 text-sm">Histórico de conversas preservado</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-white/70 text-sm">Reative instantaneamente ao regularizar</span>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                    <Button
                        onClick={() => navigate('/minha-conta')}
                        className="w-full h-14 bg-gradient-to-r from-red-500 to-orange-500 hover:shadow-[0_0_30px_rgba(239,68,68,0.3)] border-0 text-lg font-bold transition-all hover:scale-[1.01]"
                    >
                        <CreditCard className="w-5 h-5 mr-2" />
                        Atualizar Pagamento
                    </Button>

                    <Button
                        onClick={() => window.open('mailto:suporte@luminnus.com.br?subject=Conta%20Congelada%20-%20Preciso%20de%20Ajuda', '_blank')}
                        variant="outline"
                        className="w-full h-12 border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Falar com Suporte
                    </Button>
                </div>

                {/* Footer info */}
                <p className="text-center text-white/30 text-xs mt-8">
                    Ao regularizar o pagamento, sua conta será reativada automaticamente em até 2 minutos.
                </p>
            </div>
        </div>
    );
};

export default AccountFrozen;
