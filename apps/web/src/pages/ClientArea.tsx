import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, LogOut, Loader2 } from 'lucide-react';

/**
 * PÁGINA ÁREA DO CLIENTE
 *
 * Esta é a página protegida que só pode ser acessada por usuários autenticados.
 * Funcionalidades:
 * - Verifica se o usuário está logado ao carregar a página
 * - Redireciona para /auth se não estiver logado
 * - Exibe informações do usuário (nome e email)
 * - Permite fazer logout
 */
const ClientArea = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  /**
   * VERIFICAÇÃO DE AUTENTICAÇÃO
   * Executa sempre que a página carrega ou quando o estado de 'user' ou 'loading' muda
   * Se não houver usuário logado e não estiver carregando, redireciona para login
   */
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  /**
   * FUNÇÃO DE LOGOUT
   * Desloga o usuário e redireciona para a página inicial
   */
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  /**
   * LOADING STATE
   * Enquanto verifica a autenticação, mostra um spinner de carregamento
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0B0F] via-[#1a1a2e] to-[#0B0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  /**
   * PROTEÇÃO ADICIONAL
   * Se não houver usuário após o loading, não renderiza nada
   * (o useEffect já vai redirecionar para /auth)
   */
  if (!user) {
    return null;
  }

  /**
   * EXTRAÇÃO DE DADOS DO USUÁRIO
   * Pega o nome do usuário dos metadados ou usa o email como fallback
   */
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const userEmail = user.email || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B0F] via-[#1a1a2e] to-[#0B0B0F] pt-32 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* HEADER DA ÁREA DO CLIENTE */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Área do Cliente
          </h1>
          <p className="text-white/60 text-lg">
            Bem-vindo(a) de volta, {userName}!
          </p>
        </div>

        {/* CARD DE INFORMAÇÕES DO USUÁRIO */}
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações da Conta
            </CardTitle>
            <CardDescription className="text-white/60">
              Dados do seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* NOME DO USUÁRIO */}
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <User className="w-5 h-5 text-[#00C2FF]" />
              <div>
                <p className="text-white/60 text-sm">Nome</p>
                <p className="text-white font-medium">{userName}</p>
              </div>
            </div>

            {/* EMAIL DO USUÁRIO */}
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
              <Mail className="w-5 h-5 text-[#00C2FF]" />
              <div>
                <p className="text-white/60 text-sm">Email</p>
                <p className="text-white font-medium">{userEmail}</p>
              </div>
            </div>

            {/* BOTÃO DE LOGOUT */}
            <div className="pt-4">
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da Conta
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO DE RECURSOS (PLACEHOLDER PARA FUTURA EXPANSÃO) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-white text-lg">Meus Dados</CardTitle>
              <CardDescription className="text-white/60">
                Gerencie suas informações
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-white text-lg">Chat com Lia</CardTitle>
              <CardDescription className="text-white/60">
                Converse com a assistente
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-white text-lg">Meu Plano</CardTitle>
              <CardDescription className="text-white/60">
                Veja detalhes do seu plano
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientArea;
