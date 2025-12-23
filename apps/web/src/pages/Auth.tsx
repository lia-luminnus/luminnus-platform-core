import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { Button } from '@/components/ui/button';

const ADMIN_EMAILS = ["luminnus.lia.ai@gmail.com"];
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import liaLoginBg from '@/assets/lia-login-bg.png';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [showExpiredPlanWarning, setShowExpiredPlanWarning] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { userPlan, hasActivePlan, loading: planLoading } = useUserPlan();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Clear form fields when toggling between login/signup
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  /**
   * REDIRECIONAMENTO AUTOMÁTICO BASEADO EM PLANO E ROLE
   * Se o usuário já estiver logado:
   * - Se é admin → redireciona para /admin-dashboard
   * - Se tem plano ativo → redireciona para /dashboard
   * - Se tem plano expirado/inativo → mostra aviso
   * - Se não tem plano → redireciona para /
   */
  useEffect(() => {
    // Only redirect if we have a user AND plan loading is complete
    if (!user || planLoading) return;

    // Stop checking plan once we have the answer
    setCheckingPlan(false);
    setLoading(false);

    // Admin check first
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      navigate('/admin-dashboard', { replace: true });
      return;
    }

    // User with active plan goes to dashboard
    if (hasActivePlan) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // User with expired/inactive plan shows warning
    if (userPlan && (userPlan.status === 'expirado' || userPlan.status === 'inativo')) {
      setShowExpiredPlanWarning(true);
      return;
    }

    // User without any plan goes to home (to see pricing)
    navigate('/', { replace: true });
  }, [user, hasActivePlan, userPlan, planLoading, navigate]);

  /**
   * VALIDAÇÃO DE FORMULÁRIO
   * Verifica se todos os campos obrigatórios estão preenchidos
   */
  const validateForm = (): string | null => {
    if (!email.trim()) {
      return 'Preencha o campo de email';
    }

    if (!password.trim()) {
      return 'Preencha o campo de senha';
    }

    if (!isLogin && !fullName.trim()) {
      return 'Preencha o campo de nome completo';
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email inválido';
    }

    // Validação de senha mínima
    if (password.length < 6) {
      return 'A senha deve ter no mínimo 6 caracteres';
    }

    return null;
  };

  /**
   * FUNÇÃO DE SUBMIT DO FORMULÁRIO
   * Valida os campos e envia para autenticação
   * Após login bem-sucedido, verifica o plano e redireciona adequadamente
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação dos campos
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Erro de validação',
        description: validationError,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    // Tentativa de autenticação
    const result = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, fullName);

    if (result.error) {
      setLoading(false);
      toast({
        title: 'Erro',
        description: result.error.message,
        variant: 'destructive'
      });
    } else {
      // For sign up, check if we got a session. 
      // If no session, it means email confirmation is required.
      const hasSession = (result as any).data?.session;

      if (!isLogin && !hasSession) {
        setLoading(false);
        setCheckingPlan(false);
        toast({
          title: 'Conta criada!',
          description: 'Por favor, verifique seu e-mail para confirmar sua conta antes de fazer login.',
        });
        setIsLogin(true); // Switch to login mode
        return;
      }

      toast({
        title: 'Sucesso!',
        description: isLogin ? 'Login realizado com sucesso' : 'Conta criada com sucesso'
      });

      // O redirecionamento será feito pelo useEffect após verificar o plano
      // Mantém loading ativo enquanto verifica
      setCheckingPlan(true);
    }
  };

  /**
   * FUNÇÃO DE LOGIN COM GOOGLE
   * Inicia o fluxo de autenticação OAuth do Google
   * O redirecionamento pós-login será feito pelo useEffect baseado no plano
   */
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();

    if (error) {
      setLoading(false);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
    // Se não houver erro, o usuário será redirecionado para o Google OAuth
    // O useEffect cuidará do redirecionamento baseado no plano após autenticação
  };

  /**
   * LOADING STATE VISUAL
   * Mostra spinner quando está verificando o plano após login
   */
  // Only show loading if we're actively checking (not just waiting indefinitely)
  if (checkingPlan && planLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center px-4">
        <Loader2 className="w-12 h-12 text-[#00C2FF] animate-spin mb-4" />
        <p className="text-white/60 text-lg">Verificando seu plano...</p>
      </div>
    );
  }

  /**
   * AVISO DE PLANO EXPIRADO/INATIVO
   * Mostra mensagem quando o plano do usuário está expirado ou inativo
   */
  if (showExpiredPlanWarning) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Plano {userPlan?.status === 'expirado' ? 'Expirado' : 'Inativo'}
            </h1>
            <p className="text-white/60">
              {userPlan?.status === 'expirado'
                ? 'Seu plano expirou. Contrate um novo plano para continuar usando a Lia.'
                : 'Seu plano está inativo. Ative ou contrate um novo plano para continuar.'
              }
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/planos')}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90"
            >
              Ver Planos Disponíveis
            </Button>

            <Button
              onClick={() => {
                setShowExpiredPlanWarning(false);
                navigate('/');
              }}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B0F] via-[#1A1037] to-[#0B0B0F] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Column - Form */}
        <div className="p-8 lg:p-12 flex flex-col justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mb-8 text-white/50 hover:text-white transition-colors text-sm w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site
          </button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-3">
              {isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}
            </h1>
            <p className="text-white/60 text-lg">
              {isLogin ? 'Entre para conversar com a LIA' : 'Comece sua jornada com a LIA'}
            </p>
          </div>

          {/* Botão Google OAuth */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="w-full bg-white hover:bg-white/90 text-gray-800 font-medium shadow-md mb-6 h-12"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </Button>

          {/* Divisor */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-white/40">ou continue com email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-white/80 text-sm font-medium mb-2 block">Nome completo</label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
                />
              </div>
            )}

            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
              />
            </div>

            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Senha</label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#FF2E9E] hover:opacity-90 h-12 text-lg font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                isLogin ? 'Entrar' : 'Criar Conta'
              )}
            </Button>
          </form>

          <button
            onClick={toggleMode}
            className="w-full mt-6 text-white/60 hover:text-white transition-colors text-center"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>

        {/* Right Column - Image */}
        <div className="hidden lg:block relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/20 via-[#FF2E9E]/10 to-transparent"></div>
          <img
            src={liaLoginBg}
            alt="LIA - Inteligência Artificial Cognitiva"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent"></div>
          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-3xl font-bold text-white mb-3">
              LIA — IA com consciência cognitiva
            </h2>
            <p className="text-white/80 text-lg">
              Desenvolvida para empresas que buscam excelência
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
