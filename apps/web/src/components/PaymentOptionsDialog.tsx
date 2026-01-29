import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Calendar, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface PaymentOptionsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    monthlyPrice: string;
    annualPrice: string;
    monthlyCommitPrice: string;
    discount: number;
    onSelectOption: (option: 'annual_full' | 'annual_12x' | 'monthly') => void;
}

export function PaymentOptionsDialog({
    isOpen,
    onClose,
    planName,
    monthlyPrice,
    annualPrice,
    monthlyCommitPrice,
    discount,
    onSelectOption,
}: PaymentOptionsDialogProps) {
    const [selectedOption, setSelectedOption] = useState<'annual_full' | 'annual_12x' | null>(null);
    const [showCommitmentWarning, setShowCommitmentWarning] = useState(false);

    const handleSelectOption = (option: 'annual_full' | 'annual_12x') => {
        if (option === 'annual_12x') {
            setSelectedOption(option);
            setShowCommitmentWarning(true);
        } else {
            onSelectOption(option);
            onClose();
        }
    };

    const handleConfirmCommitment = () => {
        if (selectedOption) {
            onSelectOption(selectedOption);
            onClose();
            setShowCommitmentWarning(false);
        }
    };

    // Parse prices for display
    const annualValue = annualPrice.replace(/[^0-9.,]/g, '');
    const monthlyCommitValue = monthlyCommitPrice.replace(/[^0-9.,]/g, '');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#0B0B0F] border-[#7C3AED]/30 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-white">
                        Escolha a forma de pagamento
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        Plano {planName} - Faturamento Anual
                    </DialogDescription>
                </DialogHeader>

                {!showCommitmentWarning ? (
                    <div className="space-y-4 py-4">
                        <button
                            onClick={() => handleSelectOption('annual_full')}
                            className="w-full p-5 rounded-xl border border-white/10 hover:border-[#22D3EE] transition-all bg-white/5 hover:bg-white/10 text-left group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-lg">À vista (1x/ano)</p>
                                        <p className="text-white/60 text-sm">Cobrança única anual • Sem fidelidade</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-[#22D3EE]">{annualPrice}/ano</p>
                                    <p className="text-xs text-green-400">Pague uma vez e aproveite</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleSelectOption('annual_12x')}
                            className="w-full p-5 rounded-xl border border-[#7C3AED]/50 hover:border-[#FF2E9E] transition-all bg-gradient-to-br from-[#7C3AED]/10 to-[#FF2E9E]/10 text-left group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-lg">Anual em 12x</p>
                                        <p className="text-white/60 text-sm">Cobrança mensal com desconto • Fidelidade 12 meses</p>
                                    </div>
                                </div>
                                <div className="text-right max-w-[150px]">
                                    <p className="text-lg font-bold bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] bg-clip-text text-transparent leading-tight">
                                        {monthlyCommitPrice}/mês
                                    </p>
                                    {(() => {
                                        const savingsMap: Record<string, string> = {
                                            'Start': '€36',
                                            'Plus': '€600',
                                            'Pro': '€5.400'
                                        };
                                        const savings = savingsMap[planName] || `aprox. ${discount}%`;
                                        return (
                                            <p className="text-[10px] font-bold text-green-400">
                                                Economia: {savings}/ano
                                            </p>
                                        );
                                    })()}
                                </div>
                            </div>
                        </button>
                    </div>
                ) : (
                    /* Commitment Warning */
                    <div className="py-6 space-y-6">
                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-yellow-400 mb-2">Atenção: Fidelidade de 12 meses</p>
                                    <p className="text-white/80 text-sm leading-relaxed">
                                        Ao escolher o pagamento em 12x, você se compromete com um período mínimo de <strong>12 meses</strong>.
                                    </p>
                                    <ul className="mt-3 space-y-1 text-sm text-white/70">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                            Cancelamento antes do período: sujeito a multa
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                            Após 12 meses: cancele quando quiser
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowCommitmentWarning(false)}
                                variant="outline"
                                className="flex-1 border-white/20 text-white hover:bg-white/10"
                            >
                                Voltar
                            </Button>
                            <Button
                                onClick={handleConfirmCommitment}
                                className="flex-1 bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] border-0"
                            >
                                Confirmar e Continuar
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
