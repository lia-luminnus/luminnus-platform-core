/**
 * ============================================================
 * 🚀 LIVE MODE - Em Breve / Coming Soon
 * ============================================================
 * 
 * Tela profissional de "Em Breve" para o Live Mode
 * Enquanto a funcionalidade não está disponível para todos
 * 
 * ============================================================
 */

import React, { useState, useEffect } from "react";
import { Zap, Sparkles, Bell, CheckCircle2, Clock, Rocket, Stars, Radio } from "lucide-react";

// Animação de partículas de fundo
const FloatingParticle = ({ delay, size, top, left }: { delay: number; size: number; top: string; left: string }) => (
    <div
        className="absolute rounded-full bg-gradient-to-r from-pink-500/20 to-cyan-500/20 blur-sm animate-pulse"
        style={{
            width: `${size}px`,
            height: `${size}px`,
            top,
            left,
            animationDelay: `${delay}s`,
            animationDuration: `${3 + Math.random() * 2}s`
        }}
    />
);

export function LiveMode() {
    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

    // Countdown para "lançamento" (placeholder - ajuste para data real)
    useEffect(() => {
        const targetDate = new Date('2026-02-01T00:00:00');

        const updateCountdown = () => {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();

            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setCountdown({ days, hours, minutes });
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            setIsSubscribed(true);
            // Aqui você pode adicionar integração com backend para salvar o email
            console.log('📧 Email registrado para notificação:', email);
        }
    };

    const features = [
        { icon: <Radio className="w-5 h-5" />, text: "Conversa em tempo real com avatar 3D" },
        { icon: <Sparkles className="w-5 h-5" />, text: "Reconhecimento de voz ultra-rápido" },
        { icon: <Stars className="w-5 h-5" />, text: "Respostas instantâneas com emoção" },
        { icon: <Rocket className="w-5 h-5" />, text: "Integração total com Google Workspace" },
    ];

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#050810] via-[#0A0F1A] to-[#0D1117] overflow-hidden relative">
            {/* Partículas de fundo animadas */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingParticle delay={0} size={200} top="10%" left="10%" />
                <FloatingParticle delay={1} size={150} top="60%" left="80%" />
                <FloatingParticle delay={2} size={100} top="30%" left="60%" />
                <FloatingParticle delay={0.5} size={180} top="70%" left="20%" />
                <FloatingParticle delay={1.5} size={120} top="15%" left="75%" />
            </div>

            {/* Glow central */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[600px] h-[600px] bg-gradient-radial from-pink-500/10 via-transparent to-transparent rounded-full blur-3xl" />
            </div>

            {/* Conteúdo principal */}
            <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-cyan-500/20 border border-pink-500/30 mb-8 backdrop-blur-sm">
                    <Zap className="w-4 h-4 text-pink-400" />
                    <span className="text-xs font-bold tracking-wider text-pink-300 uppercase">Chegando em Breve</span>
                </div>

                {/* Título principal */}
                <h1 className="text-5xl md:text-6xl font-black mb-4 leading-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
                        LIA Live
                    </span>
                </h1>

                {/* Subtítulo */}
                <p className="text-xl md:text-2xl text-gray-300 mb-8 font-light">
                    A experiência mais avançada de IA conversacional
                </p>

                {/* Descrição */}
                <p className="text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed">
                    Estamos finalizando os últimos detalhes para trazer a você uma experiência
                    de conversação em tempo real com avatar 3D, reconhecimento de voz avançado
                    e respostas instantâneas.
                </p>

                {/* Countdown */}
                <div className="flex justify-center gap-6 mb-12">
                    {[
                        { value: countdown.days, label: 'Dias' },
                        { value: countdown.hours, label: 'Horas' },
                        { value: countdown.minutes, label: 'Min' }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-2 backdrop-blur-sm">
                                <span className="text-3xl font-black text-white">
                                    {String(item.value).padStart(2, '0')}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Features preview */}
                <div className="grid grid-cols-2 gap-4 mb-10 max-w-md mx-auto">
                    {features.map((feature, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl text-left backdrop-blur-sm hover:bg-white/10 transition-all"
                        >
                            <div className="text-pink-400">{feature.icon}</div>
                            <span className="text-xs text-gray-300">{feature.text}</span>
                        </div>
                    ))}
                </div>

                {/* Formulário de notificação */}
                {!isSubscribed ? (
                    <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <div className="flex-1 relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Seu melhor e-mail"
                                className="w-full bg-white/5 border border-white/20 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none text-sm"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-600/25 hover:shadow-pink-600/40 active:scale-95"
                        >
                            <Bell className="w-4 h-4" />
                            <span>Me Avise</span>
                        </button>
                    </form>
                ) : (
                    <div className="flex items-center justify-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl max-w-md mx-auto">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span className="text-green-300 font-medium">
                            Você será notificado quando o LIA Live estiver disponível!
                        </span>
                    </div>
                )}

                {/* Footer info */}
                <p className="mt-10 text-xs text-gray-600 flex items-center justify-center gap-2">
                    <Clock className="w-3 h-3" />
                    Disponível em breve para usuários do plano Pro
                </p>
            </div>
        </div>
    );
}

export default LiveMode;
