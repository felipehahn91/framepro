-- Crie a tabela de fluxos de cadência
CREATE TABLE public.cadencia_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilite Row Level Security
ALTER TABLE public.cadencia_flows ENABLE ROW LEVEL SECURITY;

-- Crie as políticas de segurança
CREATE POLICY "Users can manage their own cadencia flows" ON public.cadencia_flows
FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);