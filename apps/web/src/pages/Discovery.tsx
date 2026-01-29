import { motion } from "framer-motion";
import { Bot, Sparkles, Target, Users, Zap, ArrowRight, MessageSquare, ShieldCheck, Heart } from "lucide-react";
import UnifiedHeader from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import SavingsCalculator from "@/components/SavingsCalculator";
import LiaSimulator from "@/components/LiaSimulator";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const Discovery = () => {
    const { t } = useLanguage();

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    };

    const capabilities = [
        {
            icon: <MessageSquare className="w-8 h-8 text-[#00C2FF]" />,
            title: "Atendimento Humanizado",
            description: "Esqueça bots robotizados. Lia compreende nuances, gírias e intenções, respondendo com a empatia e clareza de um humano."
        },
        {
            icon: <Target className="w-8 h-8 text-[#FF2E9E]" />,
            title: "Foco total em Conversão",
            description: "Lia não apenas responde, ela guia o cliente pelo funil, tira dúvidas e facilita o fechamento de vendas em tempo real."
        },
        {
            icon: <Users className="w-8 h-8 text-[#7C3AED]" />,
            title: "Escalabilidade Infinita",
            description: "Atenda 10 ou 10.000 pessoas ao mesmo tempo com a mesma qualidade. Sua empresa nunca mais terá fila de espera."
        },
        {
            icon: <ShieldCheck className="w-8 h-8 text-green-400" />,
            title: "Segurança e Ética",
            description: "Dados protegidos com criptografia de ponta e uma IA treinada para seguir rigorosamente os valores da sua marca."
        }
    ];

    return (
        <div className="min-h-screen bg-[#0B0B0F] text-white">
            <UnifiedHeader />

            {/* Hero Section - Emotional & Impactful */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#1A1037]/20 via-transparent to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#7C3AED]/10 rounded-full blur-[120px] -z-10" />

                <div className="container mx-auto px-4 text-center space-y-8 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[#00C2FF] text-sm font-medium mb-4"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>{t('discovery_subtitle')}</span>
                    </motion.div>

                    <motion.h1
                        {...fadeIn}
                        className="text-5xl lg:text-7xl font-black tracking-tight leading-tight max-w-5xl mx-auto"
                    >
                        {t('discovery_title')}
                    </motion.h1>

                    <motion.p
                        {...fadeIn}
                        transition={{ delay: 0.2 }}
                        className="text-xl lg:text-2xl text-white/60 max-w-3xl mx-auto leading-relaxed"
                    >
                        A Lia nasceu da necessidade de devolver humanidade e eficiência aos negócios. Ela não é apenas software; ela é a consciência que sua empresa precisava para crescer sem limites.
                    </motion.p>

                    <motion.div
                        {...fadeIn}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
                    >
                        <Button
                            onClick={() => window.location.href = '/auth'}
                            className="bg-white text-black hover:bg-white/90 px-10 h-14 rounded-full text-lg font-bold flex items-center gap-2"
                        >
                            Criar minha conta agora
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth' })}
                            className="border-white/10 hover:bg-white/5 px-10 h-14 rounded-full text-lg"
                        >
                            Ver impacto financeiro
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* Video / Visual Impact Placeholder */}
            <section className="py-20 bg-black/40">
                <div className="container mx-auto px-4 text-center">
                    <motion.div
                        {...fadeIn}
                        className="max-w-4xl mx-auto aspect-video rounded-3xl bg-gradient-to-br from-[#1C1C26] to-[#0B0B0F] border border-white/10 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED]/10 via-transparent to-[#FF2E9E]/10" />
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 group-hover:scale-110 transition-transform">
                            <Zap className="w-10 h-10 text-white fill-white" />
                        </div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Apresentação Exclusiva</p>
                            <h3 className="text-xl font-bold">Lia: A Revolução Cognitiva</h3>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Savings Calculator Section */}
            <section id="calculadora" className="py-32 relative overflow-hidden">
                <div className="container mx-auto px-4 space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl lg:text-5xl font-bold">A Economia Real do seu Negócio</h2>
                        <p className="text-xl text-white/50 max-w-2xl mx-auto">Use nossa calculadora para descobrir quanto você está perdendo mensalmente com processos manuais e lentos.</p>
                    </div>
                    <SavingsCalculator />
                </div>
            </section>

            {/* Capabilities Section */}
            <section className="py-32 bg-white/[0.02]">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {capabilities.map((cap, i) => (
                            <motion.div
                                key={i}
                                {...fadeIn}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-2xl bg-white/5 border border-white/10 space-y-4 hover:border-white/20 transition-colors"
                            >
                                <div className="p-3 rounded-lg bg-white/5 w-fit">
                                    {cap.icon}
                                </div>
                                <h3 className="text-xl font-bold">{cap.title}</h3>
                                <p className="text-white/50 leading-relaxed text-sm">{cap.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Emotive Message */}
            <section className="py-32 relative">
                <div className="container mx-auto px-4 text-center space-y-12">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Heart className="w-12 h-12 text-[#FF2E9E] mx-auto animate-pulse" />
                        <h2 className="text-4xl lg:text-6xl font-black italic">"Não é sobre tecnologia, é sobre liberdade."</h2>
                        <p className="text-2xl text-white/60">
                            Liberdade para você focar no que ama. Liberdade para seus clientes serem ouvidos. Liberdade para sua empresa voar alto.
                        </p>
                    </div>
                </div>
            </section>

            {/* Interactive Simulator Section */}
            <section id="simulador" className="py-32 bg-black/60">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-4xl lg:text-5xl font-bold">Tire todas as suas dúvidas com a Lia</h2>
                        <p className="text-xl text-white/50 max-w-2xl mx-auto">Experimente agora e veja como ela compreende o seu contexto de negócio.</p>
                    </div>
                    <LiaSimulator />
                </div>
            </section>

            {/* FAQ / Doubts Section */}
            <section className="py-32">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto space-y-8">
                        <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
                        {[
                            { q: "A Lia substitui humanos?", a: "A Lia potencializa humanos. Ela cuida do repetitivo para que sua equipe foque no que exige criatividade e empatia complexa." },
                            { q: "É difícil de configurar?", a: "Pelo contrário. Com nosso onboarding guiado, você tem a Lia ativa no seu negócio em menos de 5 minutos." },
                            { q: "Ela aprende sobre minha empresa?", a: "Sim! A Lia tem uma memória cognitiva treinável que absorve seus manuais, produtos e tom de voz." }
                        ].map((item, i) => (
                            <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                <h4 className="font-bold text-lg text-white">{item.q}</h4>
                                <p className="text-white/50">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#7C3AED]/20 to-transparent" />
                <div className="container mx-auto px-4 text-center space-y-8 relative z-10">
                    <h2 className="text-5xl font-bold">Dê o primeiro passo para o futuro.</h2>
                    <p className="text-xl text-white/60">Milhares de atendimentos são perdidos agora. Não deixe o próximo ser o seu.</p>
                    <Button
                        onClick={() => window.location.href = '/planos'}
                        className="bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90 px-12 h-16 rounded-full text-xl font-bold shadow-2xl"
                    >
                        Ver planos e começar hoje
                    </Button>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Discovery;
