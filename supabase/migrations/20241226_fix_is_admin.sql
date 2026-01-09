-- ============================================
-- FIX: Corrigir função is_admin para evitar erro 500
-- ============================================

-- Recriar a função is_admin sem usar RLS (SECURITY DEFINER já bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = uid AND role = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro (tabela não existe, etc), retornar false
        RETURN FALSE;
END;
$$;

-- Garantir que o admin existe
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'luminnus.lia.ai@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
