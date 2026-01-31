import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Company, Plan } from '@/types/shared';
import { ADMIN_EMAILS, isAdminEmail, AUTH_URLS } from '@/config/auth';
import { apiUrl } from '@/lib/api';

export type UserRole = "cliente" | "admin" | null;

/**
 * INTERFACE DO CONTEXTO DE AUTENTICACAO
 * Define os tipos e metodos disponiveis no AuthContext
 */
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole;
  clienteId: string | null;
  company: Company | null;
  plan: Plan | null;
  entitlements: string[];
  refreshPlatformData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, fullName: string, phone?: string, address?: string) => Promise<{ data: any; error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ data: any; error: any }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, fullName: string, phone?: string, address?: string) => Promise<{ data: any; error: any }>;
}

/**
 * FUNÇÃO HELPER: TRADUZ ERROS DO SUPABASE PARA PORTUGUÊS
 * Recebe um erro do Supabase e retorna uma mensagem amigável
 */
const getErrorMessage = (error: any): string => {
  if (!error) return 'Erro desconhecido';

  // Erro de credenciais inválidas (mensagem específica solicitada)
  if (error.message?.includes('Invalid login credentials') ||
    error.message?.includes('Invalid email or password')) {
    return 'E-mail ou senha inválidos';
  }

  // Erro de email já cadastrado
  if (error.message?.includes('User already registered') ||
    error.message?.includes('already exists')) {
    return 'Este email já está cadastrado';
  }

  // Erro de senha fraca
  if (error.message?.includes('Password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres';
  }

  // Erro de email inválido
  if (error.message?.includes('Invalid email') ||
    error.message?.includes('valid email')) {
    return 'Email inválido';
  }

  // Erro de rede/conexão (mensagem específica solicitada)
  if (error.message?.includes('Failed to fetch') ||
    error.message?.includes('Network') ||
    error.message?.includes('network') ||
    error.message?.includes('connection')) {
    return 'Erro ao conectar. Tente novamente.';
  }

  // Erro de tempo de conexão esgotado
  if (error.message?.includes('timeout')) {
    return 'Erro ao conectar. Tente novamente.';
  }

  // Erro de campos vazios (será capturado na validação do form)
  if (error.message?.includes('required') ||
    error.message?.includes('empty')) {
    return 'Preencha todos os campos';
  }

  // Retorna a mensagem original se não for reconhecida
  return error.message || 'Erro ao conectar. Tente novamente.';
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Helper function to determine user role from user_roles table
 * IMPORTANTE: Busca role na tabela user_roles, com fallback para ADMIN_EMAILS
 */
const getUserRole = async (user: User | null): Promise<UserRole> => {
  if (!user) return null;

  try {
    // Consulta a tabela user_roles
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const roleData = data as { role: string } | null;
    console.log('[AuthContext] getUserRole - DB result:', roleData);
    if (roleData?.role === 'admin') return 'admin';
    if (roleData?.role === 'cliente') return 'cliente';

    // Fallback: verifica se o email está na lista de admins
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      console.log('[AuthContext] Admin detectado por email:', user.email, 'Lista de admins:', ADMIN_EMAILS);
      return 'admin';
    }

    // Se não tiver role e não for admin por email, retorna cliente
    console.log('[AuthContext] Nenhum role encontrado, defaultando para cliente. Email:', user.email);
    return 'cliente';
  } catch (error) {
    console.error('Erro ao buscar role:', error);
    // Mesmo em caso de erro, verifica se é admin por email
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      return 'admin';
    }
    return 'cliente';
  }
};

/**
 * Busca ou cria registro do cliente na tabela clientes
 */
const syncClienteRecord = async (user: User): Promise<string | null> => {
  if (!user) return null;

  try {
    // v3.0: Usar maybeSingle e upsert para evitar erros de constraint
    const { data: existingCliente } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const existing = existingCliente as { id: string } | null;
    if (existing) {
      return existing.id;
    }

    // Se nao existe, cria novo registro (upsert por segurança)
    const { data: newCliente, error } = await (supabase
      .from("clientes") as any)
      .upsert({
        user_id: user.id,
        nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
        email: user.email || '',
        telefone: user.user_metadata?.phone || null,
        endereco: user.user_metadata?.address || null,
        status_processo: 'inicial'
      }, { onConflict: 'user_id' })
      .select("id")
      .single();

    if (error) {
      console.error('Erro ao sincronizar registro de cliente:', error);
      return null;
    }

    return (newCliente as { id: string })?.id || null;
  } catch (err) {
    console.error('Erro ao sincronizar cliente:', err);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [entitlements, setEntitlements] = useState<string[]>([]);

  /**
   * Obtem dados da plataforma core (company, plan, entitlements)
   */
  const refreshPlatformData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCompany(null);
        setPlan(null);
        setEntitlements([]);
        return;
      }

      const response = await fetch(apiUrl('/api/me'), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompany(data.company);
        setPlan(data.plan);
        setEntitlements(data.entitlements || []);
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao buscar dados da plataforma:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);
        // Apenas atualizações síncronas no callback principal
        setSession(session);
        setUser(session?.user ?? null);

        // Chamadas async com setTimeout para evitar deadlock
        if (session?.user) {
          setTimeout(async () => {
            const userRole = await getUserRole(session.user);
            setRole(userRole);
            const id = await syncClienteRecord(session.user);
            setClienteId(id);
            await refreshPlatformData();
            setLoading(false);
          }, 0);
        } else {
          setRole(null);
          setClienteId(null);
          setCompany(null);
          setPlan(null);
          setEntitlements([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      const userRole = await getUserRole(session?.user ?? null);
      setRole(userRole);

      // Sincroniza registro do cliente
      if (session?.user) {
        const id = await syncClienteRecord(session.user);
        setClienteId(id);
        // Carrega dados da plataforma
        await refreshPlatformData();
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * FUNÇÃO DE LOGIN
   * Autentica o usuário com email e senha
   * Retorna erro traduzido em português se houver falha
   * Redireciona automaticamente:
   * - Admins para /admin-dashboard
   * - Usuários com plano ativo para /dashboard
   * - Usuários sem plano para /
   */
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { data: null, error: { message: getErrorMessage(error) } };
    }

    // Verify Role & Plan for consistent redirection
    if (data?.user) {
      const userRole = await getUserRole(data.user);
      setRole(userRole);

      if (userRole === 'admin') {
        window.location.href = '/admin-dashboard';
        return { data, error: null };
      }

      // Check Plan for regular users
      const { data: planData } = await (supabase
        .from('planos' as any) as any)
        .select('*')
        .eq('user_id', data.user.id)
        .eq('status', 'ativo')
        .maybeSingle();

      if (planData) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/';
      }
    }

    return { data, error: null };
  };

  /**
   * FUNÇÃO DE CADASTRO
   * Cria uma nova conta de usuário
   * Retorna erro traduzido em português se houver falha
   */
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    address?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          phone: phone || '',
          address: address || ''
        }
      }
    });

    if (error) {
      return { data: null, error: { message: getErrorMessage(error) } };
    }

    return { data, error: null };
  };

  /**
   * FUNÇÃO DE LOGIN COM GOOGLE
   * Autentica o usuário usando OAuth do Google
   * Redireciona para /oauth-callback que verificará o plano do usuário
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redireciona para auth-callback que vai verificar se tem plano
        redirectTo: `${window.location.origin}/auth-callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      return { error: { message: getErrorMessage(error) } };
    }

    return { error: null };
  };

  /**
   * FUNCAO DE LOGOUT
   * Remove a sessao do usuario e limpa os dados de autenticacao
   */
  const signOut = async () => {
    console.log('[AuthContext] Iniciando logout...');
    try {
      // 1. Limpa explicitamente as chaves de armazenamento conhecidas
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'trnszeolsvyikavhqqid';
      localStorage.removeItem('sb-dashboard-auth');
      localStorage.removeItem(`sb-${projectId}-auth-token`);

      // 2. Notifica o Supabase para invalidar o token no servidor
      await supabase.auth.signOut();

      // 3. Limpa estados locais imediatamente
      setSession(null);
      setUser(null);
      setRole(null);
      setClienteId(null);
      setCompany(null);
      setPlan(null);
      setEntitlements([]);

      console.log('[AuthContext] Logout completo, redirecionando...');

      // 4. Redirecionamento limpo com delay para garantir limpeza de cache/storage
      setTimeout(() => {
        window.location.href = '/';
      }, 100);

    } catch (error) {
      console.error('[AuthContext] Erro no logout:', error);
      // Limpeza de emergência mesmo em caso de erro
      localStorage.removeItem('sb-dashboard-auth');
      window.location.href = '/';
    }
  };

  /**
   * FUNCAO DE LOGIN (alias para signIn)
   * Autentica o usuario com email e senha para area da imobiliaria
   * Redireciona baseado no role:
   * - admin -> /admin-imob
   * - cliente -> /cliente
   */
  const login = async (email: string, password: string) => {
    return signIn(email, password);
  };

  /**
   * FUNCAO DE LOGOUT (alias para signOut)
   */
  const logout = async () => {
    await signOut();
  };

  /**
   * FUNCAO DE REGISTRO (alias para signUp)
   * Cria uma nova conta de usuario na imobiliaria
   */
  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    address?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/cliente`,
        data: {
          full_name: fullName,
          phone: phone || '',
          address: address || '',
          role: 'cliente'
        }
      }
    });

    if (error) {
      return { data: null, error: { message: getErrorMessage(error) } };
    }

    return { data, error: null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      role,
      clienteId,
      company,
      plan,
      entitlements,
      refreshPlatformData,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
