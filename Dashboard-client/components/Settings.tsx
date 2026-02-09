
import React, { useContext, useState, useEffect } from 'react';
import Header from './Header';
import CustomSelect from './ui/CustomSelect';
import { ThemeContext } from '../App';
import { LanguageContext, Language } from '../contexts/LanguageContext';
import { useAppStore } from '../store/useAppStore';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { updateProfile, uploadAvatar } from '../services/profileService';
import { MODULE_REGISTRY } from '../config/modules';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const businessSectors = [
    { id: 'technical_services', title: 'sector_technical_services', icon: 'build' },
    { id: 'liberal_professionals', title: 'sector_liberal_professionals', icon: 'gavel' },
    { id: 'health_wellness', title: 'sector_health_wellness', icon: 'monitor_heart' },
    { id: 'real_estate', title: 'sector_real_estate', icon: 'apartment' },
    { id: 'retail', title: 'sector_retail', icon: 'storefront' },
    { id: 'logistics', title: 'sector_logistics', icon: 'local_shipping' },
    { id: 'tech', title: 'sector_tech', icon: 'terminal' },
    { id: 'creative', title: 'sector_creative', icon: 'palette' },
    { id: 'other', title: 'sector_other', icon: 'auto_awesome' },
];

const Settings: React.FC = () => {
    const { isDark, toggleTheme } = useContext(ThemeContext);
    const { language, setLanguage, t } = useContext(LanguageContext);
    const { activeModules, toggleModule, setBusinessInfo, businessType, resetOnboarding } = useAppStore();
    const { user, profile, refreshProfile } = useDashboardAuth();

    const [selectedLang, setSelectedLang] = useState<Language>(language);
    const [activeTab, setActiveTab] = useState<'perfil' | 'general' | 'modules' | 'sector'>('perfil');

    // Profile Edit State
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [companyName, setCompanyName] = useState(profile?.company_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [taxId, setTaxId] = useState(profile?.tax_id || '');
    const [address, setAddress] = useState(profile?.address || '');
    const [city, setCity] = useState(profile?.city || '');
    const [state, setState] = useState(profile?.state || '');
    const [postalCode, setPostalCode] = useState(profile?.postal_code || '');
    const [country, setCountry] = useState(profile?.country || 'Brasil');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const taxLabel = country === 'Brasil' ? 'CNPJ / CPF' : country === 'EUA' ? 'Tax ID / SSN' : 'VAT / IVA / NIF';

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setCompanyName(profile.company_name || '');
            setPhone(profile.phone || '');
            setTaxId(profile.tax_id || '');
            setAddress(profile.address || '');
            setCity(profile.city || '');
            setState(profile.state || '');
            setPostalCode(profile.postal_code || '');
            setCountry(profile.country || 'Brasil');
            setAvatarUrl(profile.avatar_url || '');
        }
    }, [profile]);

    useEffect(() => {
        setSelectedLang(language);
    }, [language]);

    const handleSave = () => {
        setLanguage(selectedLang);
        toast.success(t('saved'));
    };

    const handleReset = () => {
        if (confirm(t('resetConfirm'))) {
            resetOnboarding();
            window.location.href = "/";
        }
    }

    // 🚨 SESSION RECOVERY: Tenta recuperar sessão se user for null
    const handleRecoverSession = async () => {
        if (!supabase) {
            toast.error('Supabase não disponível.');
            return;
        }
        toast.loading('Tentando recuperar sessão...', { id: 'recover' });
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (data.session) {
                toast.success('Sessão recuperada! Recarregando...', { id: 'recover' });
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error('Nenhuma sessão ativa. Faça login novamente.', { id: 'recover' });
            }
        } catch (err: any) {
            toast.error(`Erro: ${err.message}`, { id: 'recover' });
        }
    };

    const handleSectorChange = (id: string, titleKey: string) => {
        const translatedTitle = t(titleKey);
        setBusinessInfo(id, translatedTitle);
        toast.success(`${t('sectorChangedTo')} ${translatedTitle}. ${t('loadingNewPanel')}`);
        // Navegar para dashboard e forçar reload para carregar template correto
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    };

    const handleUpdateProfile = async () => {
        if (!user) {
            toast.error('Sessão não encontrada. Faça login novamente.');
            console.error('[Settings] handleUpdateProfile: user is null');
            return;
        }
        setIsSavingProfile(true);
        try {
            await updateProfile(user.id, {
                full_name: fullName,
                company_name: companyName,
                phone: phone,
                tax_id: taxId,
                address: address,
                city: city,
                state: state,
                postal_code: postalCode,
                country: country,
                avatar_url: avatarUrl,
                onboarding_completed: true
            });
            await refreshProfile(user, true);
            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            console.error('[Settings] Erro ao atualizar perfil:', error);
            toast.error(`Erro ao atualizar perfil: ${error.message || 'desconhecido'}`);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!user) {
            toast.error('Sessão não encontrada. Faça login novamente.');
            console.error('[Settings] handleFileChange: user is null');
            return;
        }

        setIsUploading(true);
        const loadingToast = toast.loading('Enviando imagem...');
        try {
            const url = await uploadAvatar(user.id, file);
            setAvatarUrl(url);

            await updateProfile(user.id, { avatar_url: url });
            await refreshProfile(user, true);

            toast.success('Foto atualizada e salva!');
        } catch (error: any) {
            console.error('[Settings] Erro no upload:', error);
            toast.error(`Erro ao enviar foto: ${error.message || 'desconhecido'}`);
        } finally {
            setIsUploading(false);
            toast.dismiss(loadingToast);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-bg">
            <Header title={t('configTitle')} />

            {/* Abas com Animação Profissional */}
            <div className="px-8 pt-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0F1A]">
                <div className="flex gap-8">
                    {[
                        { id: 'perfil', label: 'Perfil', icon: 'person' },
                        { id: 'general', label: t('appearance'), icon: 'palette' },
                        ...(!profile?.onboarding_completed ? [{ id: 'sector', label: t('businessSector'), icon: 'category' }] : []),
                        { id: 'modules', label: t('modulesAndApps'), icon: 'extension' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.span
                                    layoutId="activeTabIndicator"
                                    className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-primary rounded-t-full shadow-[0_-4px_10px_rgba(139,92,246,0.5)]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-8 pt-6 overflow-y-auto max-w-5xl mx-auto w-full scroll-smooth">
                <AnimatePresence mode="wait">
                    {activeTab === 'perfil' && (
                        <motion.div
                            key="perfil"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            {/* 🚨 SESSION WARNING: Alerta se usuário não está logado */}
                            {!user && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-center justify-between shadow-lg backdrop-blur-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-red-500 text-2xl">lock_open</span>
                                        </div>
                                        <div>
                                            <p className="font-black text-red-500 text-sm italic">⚠️ Sua sessão expirou ou não foi detectada.</p>
                                            <p className="text-[10px] text-gray-500 font-medium">Os botões de salvar, sincronização e foto exigem uma sessão ativa. Por favor, faça login pelo site principal.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const landingPage = import.meta.env.VITE_LANDING_PAGE_URL || (window.location.host.includes('localhost') ? 'http://localhost:8080' : window.location.origin);
                                            window.location.href = `${landingPage}/auth-bridge?redirect_to=settings`;
                                        }}
                                        className="px-6 py-2.5 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">login</span>
                                        Fazer Login no Site
                                    </button>
                                </div>
                            )}

                            <div className="glass-panel bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-xl">
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="flex flex-col items-center gap-4">
                                        <div
                                            className="relative group cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <div className="w-24 h-24 rounded-full border-[3px] border-brand-primary shadow-xl overflow-hidden relative">
                                                <img
                                                    src={avatarUrl || `https://ui-avatars.com/api/?name=${fullName || user?.email}&background=8b5cf6&color=fff`}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                                                />
                                                {isUploading && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                                                    <span className="material-symbols-outlined text-white text-2xl">upload</span>
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-lg border-[3px] border-white dark:border-[#0f172a]">
                                                <span className="material-symbols-outlined text-lg">photo_camera</span>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Mudar Foto</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-6">
                                        {/* Dados Pessoais */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black uppercase tracking-tighter text-brand-primary flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base">person</span>
                                                Dados Pessoais
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome Completo</label>
                                                    <input
                                                        type="text"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        placeholder="Seu nome"
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Email</label>
                                                    <div className="relative group">
                                                        <input
                                                            type="email"
                                                            value={profile?.email || user?.email || ''}
                                                            readOnly
                                                            placeholder="Email não identificado"
                                                            className={`w-full bg-gray-100 dark:bg-black/50 border ${(!profile?.email && !user?.email) ? 'border-amber-500/50' : 'border-gray-200 dark:border-white/5'} rounded-xl px-4 py-3 text-xs font-bold text-gray-400 cursor-not-allowed`}
                                                        />
                                                        {(!profile?.email && !user?.email) ? (
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (!user) {
                                                                        toast.error('Sessão não disponível. Tente recarregar a página.');
                                                                        return;
                                                                    }
                                                                    toast.loading('Sincronizando...', { id: 'sync-toast' });
                                                                    await refreshProfile(user, true);
                                                                    toast.success('Perfil sincronizado!', { id: 'sync-toast' });
                                                                }}
                                                                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-500 hover:text-amber-400 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-sm animate-spin-slow">sync</span>
                                                                <span className="text-[8px] font-black uppercase underline decoration-dotted">FORÇAR SINCRONIA</span>
                                                            </button>
                                                        ) : (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-500/50">
                                                                <span className="material-symbols-outlined text-sm">verified</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dados da Empresa */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black uppercase tracking-tighter text-brand-primary flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base">business</span>
                                                    Informações da Empresa
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">País:</label>
                                                    <CustomSelect
                                                        value={country}
                                                        onChange={(value) => setCountry(value)}
                                                        options={[
                                                            { label: 'Brasil 🇧🇷', value: 'Brasil' },
                                                            { label: 'Portugal 🇵🇹', value: 'Portugal' },
                                                            { label: 'EUA 🇺🇸', value: 'EUA' },
                                                            { label: 'Espanha 🇪🇸', value: 'Espanha' },
                                                            { label: 'Outro 🌐', value: 'Outro' }
                                                        ]}
                                                        variant="glass"
                                                        className="min-w-[140px]"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome da Empresa</label>
                                                    <input
                                                        type="text"
                                                        value={companyName}
                                                        onChange={(e) => setCompanyName(e.target.value)}
                                                        placeholder="Nome do seu negócio"
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">{taxLabel}</label>
                                                    <input
                                                        type="text"
                                                        value={taxId}
                                                        onChange={(e) => setTaxId(e.target.value)}
                                                        placeholder={country === 'Brasil' ? '00.000.000/0000-00' : 'Tax / Fiscal ID'}
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Telefone de Contato</label>
                                                    <input
                                                        type="tel"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        placeholder="+00 (00) 00000-0000"
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Localização */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-black uppercase tracking-tighter text-brand-primary flex items-center gap-2">
                                                <span className="material-symbols-outlined text-base">location_on</span>
                                                Localização
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-2 space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Endereço</label>
                                                    <input
                                                        type="text"
                                                        value={address}
                                                        onChange={(e) => setAddress(e.target.value)}
                                                        placeholder="Rua, Número, Bairro"
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Código Postal (CEP)</label>
                                                    <input
                                                        type="text"
                                                        value={postalCode}
                                                        onChange={(e) => setPostalCode(e.target.value)}
                                                        placeholder="00000-000"
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Cidade</label>
                                                    <input
                                                        type="text"
                                                        value={city}
                                                        onChange={(e) => setCity(e.target.value)}
                                                        placeholder="Cidade"
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Estado / Província (UF)</label>
                                                    <input
                                                        type="text"
                                                        value={state}
                                                        onChange={(e) => setState(e.target.value)}
                                                        placeholder="UF / Estado"
                                                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-6 border-t border-gray-100 dark:border-white/5">
                                            <button
                                                onClick={handleUpdateProfile}
                                                disabled={isSavingProfile}
                                                className="px-10 py-3.5 rounded-xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isSavingProfile ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <span className="material-symbols-outlined text-base">verified</span>
                                                )}
                                                Salvar Perfil
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'general' && (
                        <motion.div
                            key="general"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl hover-lift">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-xl font-black mb-1 tracking-tight">{t('theme')}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{t('themeDesc')}</p>
                                    </div>
                                    <div className="flex gap-2 bg-gray-100 dark:bg-black/30 p-1.5 rounded-2xl shadow-inner">
                                        <button
                                            onClick={() => !isDark && toggleTheme()}
                                            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-800'}`}
                                        >
                                            {t('darkMode')}
                                        </button>
                                        <button
                                            onClick={() => isDark && toggleTheme()}
                                            className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isDark ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            {t('lightMode')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl hover-lift">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-xl font-black mb-1 tracking-tight">{t('language')}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{t('chooseLanguage')}</p>
                                    </div>
                                    <CustomSelect
                                        value={selectedLang}
                                        onChange={(value) => setSelectedLang(value as Language)}
                                        options={[
                                            { label: 'English (US)', value: 'en' },
                                            { label: 'Português (BR)', value: 'pt' },
                                            { label: 'Español', value: 'es' }
                                        ]}
                                        variant="glass"
                                        placeholder="Selecione o idioma"
                                        className="w-full md:w-64"
                                    />
                                </div>
                            </div>

                            <div className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl hover-lift border-red-500/10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-xl font-black mb-1 tracking-tight text-red-500">{t('resetPrefs')}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{t('resetPrefsDesc')}</p>
                                    </div>
                                    <button onClick={handleReset} className="px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-500/5">
                                        {t('resetBtn')}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 mt-10">
                                <button
                                    onClick={handleSave}
                                    className="px-12 py-4 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-brand-primary/30 active:scale-95"
                                >
                                    {t('saveChanges')}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'sector' && (
                        <motion.div
                            key="sector"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-6"
                        >
                            <div className="mb-8">
                                <h3 className="text-2xl font-black tracking-tight mb-2">{t('yourSector')}</h3>
                                <p className="text-gray-500 font-medium">{t('sectorChangeDesc')}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {businessSectors.map((sector) => {
                                    const isCurrent = businessType === sector.id;
                                    return (
                                        <button
                                            key={sector.id}
                                            onClick={() => handleSectorChange(sector.id, sector.title)}
                                            className={`p-6 rounded-3xl border text-left premium-transition flex items-center gap-4 group hover-lift ${isCurrent
                                                ? 'bg-brand-primary border-brand-primary shadow-2xl shadow-brand-primary/20 text-white'
                                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-brand-primary/40'
                                                }`}
                                        >
                                            <div className={`p-4 rounded-2xl flex-shrink-0 transition-transform group-hover:rotate-6 ${isCurrent ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-brand-primary'}`}>
                                                <span className="material-symbols-outlined text-3xl">{sector.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-wider">{t(sector.title as any)}</h4>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isCurrent ? 'text-white/60' : 'text-gray-400'}`}>
                                                    {isCurrent ? t('activeNow') : t('clickToChoose')}
                                                </p>
                                            </div>
                                            {isCurrent && <span className="material-symbols-outlined ml-auto text-white">check_circle</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'modules' && (
                        <motion.div
                            key="modules"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="mb-8">
                                <h3 className="text-2xl font-black tracking-tight mb-2">{t('modulePanel')}</h3>
                                <p className="text-gray-500 font-medium">{t('hideShowTabsDesc')}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-in">
                                {Object.values(MODULE_REGISTRY).filter(m => !m.isCore).map((module) => {
                                    const isActive = activeModules.includes(module.id);
                                    return (
                                        <div key={module.id} className="glass-panel bg-white dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-gray-200 dark:border-white/10 shadow-sm hover:border-brand-primary/30 premium-transition">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl premium-transition ${isActive ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-105' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                                    <span className="material-symbols-outlined text-xl">{module.icon}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-xs uppercase tracking-tight">{t(module.translationKey as any)}</h4>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{isActive ? t('moduleActive') : t('moduleHidden')}</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer group scale-90">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isActive}
                                                    onChange={async () => {
                                                        // Update local store
                                                        toggleModule(module.id);

                                                        // Sync with database for persistence
                                                        if (user) {
                                                            const currentModules = isActive
                                                                ? activeModules.filter(id => id !== module.id)
                                                                : [...activeModules, module.id];

                                                            try {
                                                                await updateProfile(user.id, { modules: currentModules });
                                                            } catch (err) {
                                                                console.error("Failed to sync modules to cloud:", err);
                                                            }
                                                        }
                                                    }}
                                                />
                                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary shadow-inner"></div>
                                            </label>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Settings;
