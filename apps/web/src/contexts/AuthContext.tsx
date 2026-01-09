import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Company, Plan } from '@luminnus/shared';

const ADMIN_EMAILS = ["luminnus.lia.ai@gmail.com"];

// Emails de administradores da imobiliaria
const IMOB_ADMIN_EMAILS = ["admin@imobiliaria.com", "luminnus.lia.ai@gmail.com"];

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

    if (data?.role === 'admin') return 'admin';
    if (data?.role === 'cliente') return 'cliente';

    // Fallback: verifica se o email está na lista de admins
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      console.log('[AuthContext] Admin por email:', user.email);
      return 'admin';
    }

    // Se não tiver role e não for admin por email, retorna cliente
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

    if (existingCliente) {
      return existingCliente.id;
    }

    // Se nao existe, cria novo registro (upsert por segurança)
    const { data: newCliente, error } = await supabase
      .from("clientes")
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

    return newCliente?.id || null;
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

      const response = await fetch('/api/me', {
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

    // Verifica se o usuário é admin e redireciona
    if (data?.user) {
      const userRole = await getUserRole(data.user);
      if (userRole === 'admin') {
        window.location.href = '/admin-dashboard';
        return { data, error: null };
      }
    }

    // Para usuários comuns, verifica se tem plano ativo
    if (data?.user) {
      try {
        const { data: planData } = await supabase
          .from('planos')
          .select('*')
          .eq('user_id', data.user.id)
          .eq('status', 'ativo')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Se tiver plano ativo, redireciona para o dashboard modular (porta 3000)
        if (planData) {
          // Get session tokens for AuthBridge
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            const bridgeUrl = `http://localhost:3000/#/auth-bridge?access_token=${sessionData.session.access_token}&refresh_token=${sessionData.session.refresh_token}`;
            window.location.href = bridgeUrl;
          } else {
            // Fallback to main site dashboard
            window.location.href = '/dashboard';
          }
        } else {
          // Se não tiver plano, redireciona para a página principal
          window.location.href = '/';
        }
      } catch (err) {
        console.error('Erro ao verificar plano do usuário:', err);
        // Em caso de erro, redireciona para a página principal
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
   * Redireciona para a Área do Cliente após sucesso
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
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
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setRole(null);
      setClienteId(null);
      console.log('[AuthContext] Logout completo, redirecionando...');
      // Força redirecionamento limpo
      window.location.href = '/';
    } catch (error) {
      console.error('[AuthContext] Erro no logout:', error);
      // Mesmo com erro, limpa estados e redireciona
      setSession(null);
      setUser(null);
      setRole(null);
      setClienteId(null);
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { data: null, error: { message: getErrorMessage(error) } };
    }

    // Update role immediately after login
    if (data?.user) {
      const userRole = await getUserRole(data.user);
      setRole(userRole);

      // Sincroniza registro do cliente
      const id = await syncClienteRecord(data.user);
      setClienteId(id);

      // Redireciona baseado no role
      if (userRole === 'admin') {
        window.location.href = '/admin-imob';
      } else {
        window.location.href = '/cliente';
      }
    }

    return { data, error: null };
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
