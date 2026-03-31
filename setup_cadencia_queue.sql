-- Tabela de fila de envios automáticos
CREATE TABLE public.cadencia_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES public.cadencia_flows(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, error
  error_message TEXT,
  payload JSONB NOT NULL, -- Contém as mensagens (texto, áudio, img)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.cadencia_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their queue" ON public.cadencia_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their queue" ON public.cadencia_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Índice para performance do motor
CREATE INDEX idx_cadencia_queue_scheduled ON public.cadencia_queue (status, scheduled_for);