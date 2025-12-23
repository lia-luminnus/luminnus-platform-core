import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Clock, User } from 'lucide-react';

/**
 * COMPONENTE: DashboardConversas
 *
 * Página de histórico de conversas com a Lia
 */
const DashboardConversas = () => {
  // Placeholder - futuramente virá do Supabase
  const conversas: any[] = [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Conversas com a Lia
        </h1>
        <p className="text-white/60">
          Histórico completo de todas as suas interações
        </p>
      </div>

      {/* LISTA DE CONVERSAS OU PLACEHOLDER */}
      {conversas.length === 0 ? (
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#6A00FF]/20 to-[#00C2FF]/20 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-[#00C2FF]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhuma conversa ainda
            </h3>
            <p className="text-white/60 text-center max-w-md">
              Suas conversas com a Lia aparecerão aqui. Comece a conversar para ver o histórico completo de interações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversas.map((conversa, index) => (
            <Card key={index} className="bg-white/5 backdrop-blur-lg border border-white/10 hover:border-[#00C2FF]/30 transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6A00FF] to-[#00C2FF] flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">
                        {conversa.titulo}
                      </CardTitle>
                      <CardDescription className="text-white/60 flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        {conversa.data}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardConversas;
