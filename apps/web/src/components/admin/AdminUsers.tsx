import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Trash2, Edit, Ban, CheckCircle, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  full_name: string | null;
  plan_type: string | null;
  created_at: string;
}

interface UserWithEmail extends User {
  email: string;
}

export const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [userToReset, setUserToReset] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query: Buscar usuários
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", searchTerm, selectedPlan],
    queryFn: async () => {
      let query = (supabase as any)
        .from("profiles")
        .select("id, full_name, email, plan_type, created_at")
        .order("created_at", { ascending: false });

      if (selectedPlan !== "all") {
        query = query.eq("plan_type", selectedPlan);
      }

      const { data: profiles, error } = await (query as any);
      if (error) throw error;

      return profiles as UserWithEmail[];

      // Filtrar por termo de busca
      if (searchTerm) {
        return profiles.filter(
          (user: any) =>
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return profiles;
    },
  });

  // Mutation: Deletar usuário (via Edge Function para deletar de auth.users)
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: session } = await (supabase as any).auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, action: "delete" }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao deletar usuário");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido completamente do sistema.",
      });
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation: Alterar plano do usuário
  const changePlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string; newPlan: string }) => {
      console.log('[AdminUsers] Changing plan for user:', userId, 'to:', newPlan);
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ plan_type: newPlan } as any)
        .eq("id", userId);
      if (error) {
        console.error('[AdminUsers] Error changing plan:', error);
        throw error;
      }
      console.log('[AdminUsers] Plan changed successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "✅ Plano alterado",
        description: "O plano do usuário foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao alterar plano",
        description: error.message || "Verifique as permissões de RLS no Supabase.",
        variant: "destructive",
      });
    },
  });


  // Mutation: Resetar conta do usuário (via Edge Function)
  const resetAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: session } = await (supabase as any).auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, action: "reset" }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao resetar usuário");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "✅ Conta resetada",
        description: "O cliente poderá configurar o dashboard novamente sem precisar pagar de novo.",
      });
      setUserToReset(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao resetar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getPlanBadge = (plan: string | null) => {
    const planColors: Record<string, string> = {
      free: "bg-gray-100 text-gray-800",
      start: "bg-blue-100 text-blue-800",
      plus: "bg-purple-100 text-purple-800",
      pro: "bg-amber-100 text-amber-800",
      cliente: "bg-gray-100 text-gray-800", // Fallback para usuários antigos
    };

    // Normalizar o nome do plano
    const normalizedPlan = plan?.toLowerCase() || "free";
    const displayName = normalizedPlan === "cliente" ? "FREE" : normalizedPlan.toUpperCase();

    return (
      <Badge className={planColors[normalizedPlan] || "bg-gray-100 text-gray-800"}>
        {displayName}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-purple-900">
          Gerenciar Usuários
        </h2>
        <p className="text-muted-foreground">
          Visualize e gerencie todos os usuários da plataforma
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="start">Start</SelectItem>
              <SelectItem value="plus">Plus</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            {users?.length || 0} usuário(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "Sem nome"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getPlanBadge(user.plan_type)}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Select
                            onValueChange={(value) =>
                              changePlanMutation.mutate({ userId: user.id, newPlan: value })
                            }
                          >
                            <SelectTrigger className="h-8 w-[100px]">
                              <Edit className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="start">Start</SelectItem>
                              <SelectItem value="plus">Plus</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            title="Resetar configuração (mantém assinatura)"
                            onClick={() => setUserToReset(user.id)}
                          >
                            <RotateCcw className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            title="Excluir usuário"
                            onClick={() => setUserToDelete(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário será permanentemente removido do
              sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Account Confirmation Dialog */}
      <AlertDialog open={!!userToReset} onOpenChange={() => setUserToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🔄 Resetar Configuração do Cliente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta ação vai resetar a configuração do dashboard do cliente, permitindo que ele
                configure novamente a profissão e os módulos.
              </p>
              <p className="font-medium text-green-600">
                ✅ A assinatura e o plano serão mantidos - o cliente NÃO precisará pagar novamente.
              </p>
              <p className="text-sm text-muted-foreground">
                O cliente precisará limpar o cache do navegador (localStorage) para ver as mudanças.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToReset && resetAccountMutation.mutate(userToReset)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Resetar Configuração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
