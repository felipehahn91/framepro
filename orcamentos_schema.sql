-- 1. Criar a tabela principal de Orçamentos
CREATE TABLE public.orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- Define se é 'builder' ou 'pdf'
  view_count INTEGER DEFAULT 0,
  share_token TEXT UNIQUE,
  sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Segurança em Nível de Linha (Obrigatório no Supabase)
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- 3. Política para o Dono do Orçamento: Acesso total (CRUD)
CREATE POLICY "Users can manage their orcamentos" 
ON public.orcamentos
FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Política Pública: Permite que o cliente abra o link do orçamento sem precisar de login
CREATE POLICY "Public can view orcamentos by token" 
ON public.orcamentos
FOR SELECT 
USING (true);

-- 5. Política Pública: Permite atualizar APENAS para incrementar as visualizações (view_count)
CREATE POLICY "Public can update orcamentos view count" 
ON public.orcamentos
FOR UPDATE 
USING (true);