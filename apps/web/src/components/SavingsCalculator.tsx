import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingDown, Clock, Euro, ArrowRight, Zap } from "lucide-react";

const SavingsCalculator = () => {
    const { t } = useLanguage();
    const [tickets, setTickets] = useState<number>(500);
    const [minutesPerTicket, setMinutesPerTicket] = useState<number>(30);
    const [hourlyCost, setHourlyCost] = useState<number>(10);
    const [showResults, setShowResults] = useState(false);

    const calculateSavings = () => {
        setShowResults(true);
    };

    const hoursPerMonth = (tickets * minutesPerTicket) / 60;
    const monthlyCost = hoursPerMonth * hourlyCost;
    const annualCost = monthlyCost * 12;

    // Assuming Lia saves 85% of time/cost
    const liaSavingRate = 0.85;
    const savingsMonthly = monthlyCost * liaSavingRate;
    const savingsAnnual = annualCost * liaSavingRate;

    return (
        <div className="w-full max-w-4xl mx-auto p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
            <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white">{t('calc_title')}</h3>
                        <p className="text-white/60">{t('calc_subtitle')}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-white/70 ml-1">{t('calc_label_tickets')}</label>
                            <Input
                                type="number"
                                value={tickets}
                                onChange={(e) => setTickets(Number(e.target.value))}
                                className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-[#00C2FF]/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-white/70 ml-1">Tempo médio por atendimento (minutos)</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={minutesPerTicket}
                                    onChange={(e) => setMinutesPerTicket(Number(e.target.value))}
                                    className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-[#00C2FF]/20 pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs">min</span>
                            </div>
                            <p className="text-[10px] text-white/40 ml-1 italic">
                                Ex: 30 minutos equivale a 0.5 horas de trabalho.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-white/70 ml-1">{t('calc_label_cost')} por hora (€)</label>
                            <Input
                                type="number"
                                value={hourlyCost}
                                onChange={(e) => setHourlyCost(Number(e.target.value))}
                                className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-[#00C2FF]/20"
                            />
                        </div>

                        <Button
                            onClick={calculateSavings}
                            className="w-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90 h-14 rounded-xl text-lg font-bold shadow-xl transition-all"
                        >
                            {t('calc_cta')}
                        </Button>
                    </div>
                </div>

                <div className="relative flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {!showResults ? (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center p-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center space-y-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                    <TrendingDown className="w-8 h-8 text-white/20" />
                                </div>
                                <p className="text-white/40 text-sm italic">
                                    Preencha os dados ao lado para descobrir o prejuízo invisível da sua operação.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                <div className="p-6 rounded-2xl bg-[#FF2E9E]/10 border border-[#FF2E9E]/20 text-center space-y-2">
                                    <p className="text-[#FF2E9E] font-bold text-sm uppercase tracking-widest">{t('calc_result_loss')}</p>
                                    <h4 className="text-5xl font-black text-white">€{annualCost.toLocaleString()}</h4>
                                    <p className="text-white/40 text-xs">Isso é o que a ineficiência tira do seu bolso todos os anos.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-4 h-4 text-[#00C2FF]" />
                                            <span className="text-xs text-white/40 font-medium uppercase">Horas Perdidas</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{(hoursPerMonth * 12).toLocaleString()}h</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Euro className="w-4 h-4 text-green-400" />
                                            <span className="text-xs text-white/40 font-medium uppercase">Economia Potencial</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-400">€{savingsAnnual.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#7C3AED]/20 to-[#FF2E9E]/10 border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <Zap className="w-12 h-12 text-white" />
                                    </div>
                                    <p className="text-white/80 text-sm leading-relaxed relative z-10">
                                        "A LIA não é um custo, é uma recuperação de ativos. Enquanto você gasta €{monthlyCost.toLocaleString()} por mês, a LIA faz o mesmo por uma fração do preço, trabalhando 24/7."
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default SavingsCalculator;
