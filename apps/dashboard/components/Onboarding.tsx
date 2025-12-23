
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessCategory, ModuleId } from '../types';
import { useAppStore } from '../store/useAppStore';
import { MODULE_REGISTRY, CATEGORY_PRESETS } from '../config/modules';
import { LanguageContext } from '../App';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { completeOnboarding as completeOnboardingService } from '../services/profileService';
import toast from 'react-hot-toast';

const categories: BusinessCategory[] = [
  { id: 'technical_services', title: 'Serviços Técnicos', description: 'Organize atendimentos, orçamentos e serviços em campo.', icon: 'build' },
  { id: 'liberal_professionals', title: 'Profissionais Liberais', description: 'Gestão completa de processos, contratos e clientes.', icon: 'gavel' },
  { id: 'health_wellness', title: 'Saúde & Bem-Estar', description: 'Controle agendas, pacientes e evoluções de tratamento.', icon: 'monitor_heart' },
  { id: 'real_estate', title: 'Imobiliária & Construção', description: 'Gerencie imóveis, obras, propostas e clientes.', icon: 'apartment' },
  { id: 'retail', title: 'Comércio & Lojas', description: 'Administre estoque, vendas e pedidos.', icon: 'storefront' },
  { id: 'food', title: 'Alimentação & Restaurantes', description: 'Pedidos, cardápio, reservas e fluxo operacional.', icon: 'restaurant' },
  { id: 'logistics', title: 'Transporte & Logística', description: 'Rotas, entregas, motoristas e acompanhamento.', icon: 'local_shipping' },
  { id: 'tech', title: 'Tecnologia & Software', description: 'Projetos, tickets, documentação e clientes.', icon: 'terminal' },
  { id: 'creative', title: 'Conteúdo & Criativos', description: 'Campanhas, arquivos, postagens e clientes.', icon: 'palette' },
  { id: 'business_services', title: 'Serviços Empresariais', description: 'Operações administrativas, financeiras e relatórios.', icon: 'domain' },
  { id: 'education', title: 'Educação & Treinamento', description: 'Aulas, materiais, agenda e acompanhamento.', icon: 'school' },
  { id: 'other', title: 'Outros (Personalizado)', description: 'Descreva seu negócio e a LIA montará o painel ideal.', icon: 'auto_awesome' },
];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { setBusinessInfo, completeOnboarding: completeOnboardingLocal, setModules } = useAppStore();
  const { user, refreshProfile } = useDashboardAuth();
  const { t } = useContext(LanguageContext);

  const [step, setStep] = useState<'category' | 'modules'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDescription, setSelectedDescription] = useState<string>('');
  const [tempModules, setTempModules] = useState<ModuleId[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Select Category
  const handleSelectCategory = (category: BusinessCategory) => {
    if (category.id === 'other') {
      setIsModalOpen(true);
    } else {
      proceedToModules(category.id, category.title);
    }
  };

  const proceedToModules = (type: string, description: string) => {
    const defaultModules = CATEGORY_PRESETS[type] || CATEGORY_PRESETS['other'];
    setSelectedCategory(type);
    setSelectedDescription(description);
    // Garantir que integrations está sempre incluído
    const modulesWithIntegrations = defaultModules.includes('integrations')
      ? defaultModules
      : [...defaultModules, 'integrations'];
    setTempModules(modulesWithIntegrations as any);
    setStep('modules');
  };

  const handleCustomSubmit = () => {
    if (!customDescription.trim()) return;
    setIsModalOpen(false);
    proceedToModules('other', customDescription);
  };

  // Step 2: Toggle Modules
  const toggleTempModule = (id: ModuleId) => {
    // integrations é fixo, não pode ser desabilitado
    if (MODULE_REGISTRY[id].isCore || id === 'integrations') return;
    if (tempModules.includes(id)) {
      setTempModules(tempModules.filter(m => m !== id));
    } else {
      setTempModules([...tempModules, id]);
    }
  };

  // Finalize - Now saves to Supabase with timeout protection
  const finalizeOnboarding = async () => {
    if (!user) {
      toast.error('Erro: usuário não autenticado');
      return;
    }

    setIsLoading(true);
    toast.loading('A LIA está construindo seu painel modular...');

    // Timeout wrapper
    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), ms)
        )
      ]);
    };

    let supabaseSaved = false;

    try {
      // 1. Try to save to Supabase with timeout (non-blocking)
      try {
        await withTimeout(
          completeOnboardingService(user.id, {
            segment: selectedCategory,
            modules: tempModules
          }),
          8000 // 8 second timeout
        );
        supabaseSaved = true;
        console.log('[Onboarding] Saved to Supabase successfully');
      } catch (dbError: any) {
        console.warn('[Onboarding] Could not save to Supabase:', dbError.message);
        // Continue anyway - local state will be primary
      }

      // 2. Update local store for immediate UI updates (always works)
      setBusinessInfo(selectedCategory, selectedDescription);
      setModules(tempModules);
      completeOnboardingLocal();

      // 3. Refresh the auth context profile (with timeout)
      try {
        await withTimeout(refreshProfile(), 5000);
      } catch {
        console.warn('[Onboarding] Could not refresh profile - continuing');
      }

      toast.dismiss();

      if (supabaseSaved) {
        toast.success('Painel pronto!');
      } else {
        toast.success('Painel configurado! (modo offline)');
      }

      // 4. Navigate to the main dashboard
      console.log('[Onboarding] Navigating to /home');
      navigate('/home', { replace: true });

    } catch (error: any) {
      console.error('[Onboarding] Error completing onboarding:', error);
      toast.dismiss();

      // Even on error, try to continue with local state
      completeOnboardingLocal();
      setBusinessInfo(selectedCategory, selectedDescription);
      setModules(tempModules);

      toast.success('Painel configurado!');
      navigate('/home', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0c0f17] text-white">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-blue-500 flex items-center justify-center mb-8 animate-pulse shadow-[0_0_30px_rgba(139,92,246,0.5)]">
          <span className="material-symbols-outlined text-5xl text-white animate-spin">settings_suggest</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">A LIA está organizando seus módulos...</h2>
        <p className="text-gray-400">Criando uma experiência única para {selectedDescription}.</p>
      </div>
    );
  }

  // Render Step 2: Module Selection
  if (step === 'modules') {
    return (
      <div className="h-full w-full bg-[#0c0f17] text-white p-8 flex flex-col items-center animate-fade-in overflow-y-auto">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Personalize seu Painel</h1>
            <p className="text-gray-400">Selecione as ferramentas que você vai usar. Você pode mudar isso depois.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Object.values(MODULE_REGISTRY).filter(m => !m.isCore || m.id === 'integrations').map((module) => {
              const isSelected = tempModules.includes(module.id);
              const isFixed = module.id === 'integrations';
              return (
                <div
                  key={module.id}
                  onClick={() => !isFixed && toggleTempModule(module.id)}
                  className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${isFixed
                      ? 'bg-brand-primary/30 border-brand-primary cursor-default'
                      : isSelected
                        ? 'bg-brand-primary/20 border-brand-primary shadow-[0_0_15px_rgba(139,92,246,0.2)] cursor-pointer'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected || isFixed ? 'bg-brand-primary text-white' : 'bg-white/10 text-gray-400'}`}>
                    <span className="material-symbols-outlined">{module.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-sm ${isSelected || isFixed ? 'text-white' : 'text-gray-400'}`}>
                      {t(module.translationKey as any)}
                      {isFixed && <span className="ml-2 text-[10px] uppercase tracking-wider opacity-60">(Obrigatório)</span>}
                    </h3>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected || isFixed ? 'bg-brand-primary border-brand-primary' : 'border-gray-500'}`}>
                    {(isSelected || isFixed) && <span className="material-symbols-outlined text-xs text-white">check</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStep('category')}
              className="px-6 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={finalizeOnboarding}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 text-white font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <span>Finalizar Setup</span>
              <span className="material-symbols-outlined">check_circle</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Step 1: Category Selection
  return (
    <div className="h-full w-full bg-[#0c0f17] text-white p-8 flex flex-col items-center animate-fade-in overflow-y-auto">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12 mt-4">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-6 border border-white/10">
            <span className="material-symbols-outlined text-4xl text-brand-primary">rocket_launch</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Escolha o tipo do seu negócio
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            A LIA irá pré-configurar os módulos ideais para sua área de atuação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {categories.map((category, index) => (
            <button
              key={category.id}
              onClick={() => handleSelectCategory(category)}
              className="group relative flex flex-col items-start p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] text-left"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl">{category.icon}</span>
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-brand-primary transition-colors">
                {category.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {category.description}
              </p>
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                <span className="material-symbols-outlined text-brand-primary">arrow_forward</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Description Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-blue-500 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl text-white">auto_awesome</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Conte para a LIA sobre seu negócio</h2>
              <p className="text-gray-400 text-sm">
                Descreva o que você faz para sugerirmos os melhores módulos.
              </p>
            </div>

            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Ex: Sou um personal trainer focado em consultoria online..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none text-sm mb-6"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCustomSubmit}
                disabled={!customDescription.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-blue-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Continuar</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
