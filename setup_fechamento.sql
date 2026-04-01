-- 1. Adicionar colunas de documentos na tabela de oportunidades (se não existirem)
ALTER TABLE public.opportunities 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS civil_status TEXT,
ADD COLUMN IF NOT EXISTS profession TEXT;

-- 2. Criar a tabela de links de fechamento
CREATE TABLE public.closing_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  value NUMERIC NOT NULL,
  event_date DATE,
  max_installments INTEGER DEFAULT 1,
  contract_template_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Políticas de Segurança (RLS)
ALTER TABLE public.closing_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their closing links" 
ON public.closing_links FOR ALL TO authenticated 
USING (auth.uid() = user_id);

-- Permite que o cliente acesse o link sem estar logado
CREATE POLICY "Public read access for closing links" 
ON public.closing_links FOR SELECT USING (true);

CREATE POLICY "Public update access for closing links" 
ON public.closing_links FOR UPDATE USING (true);