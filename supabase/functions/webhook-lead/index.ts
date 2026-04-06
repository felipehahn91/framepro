// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const formId = url.searchParams.get('form_id');

    if (!formId) {
      throw new Error("O parâmetro form_id é obrigatório na URL.");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar as configurações de roteamento do formulário
    const { data: form, error: formErr } = await supabase
      .from('link_forms')
      .select('user_id, pipeline_id, column_id, tag')
      .eq('id', formId)
      .single();

    if (formErr || !form) {
      throw new Error("Formulário não encontrado ou ID inválido.");
    }

    // 2. Ler o payload enviado pelo Zapier/Make/Meta
    const payload = await req.json();
    
    // Extrair os campos (aceitando variações comuns de nomes de campos)
    const name = payload.name || payload.nome || payload.full_name || 'Lead via Integração';
    const email = payload.email || payload.e_mail || null;
    const phone = payload.phone || payload.telefone || payload.whatsapp || payload.celular || null;
    const instagram = payload.instagram || payload.ig || null;
    const notes = payload.notes || payload.observacoes || payload.description || 'Lead capturado via Webhook/Integração';

    // 3. Inserir a Oportunidade no Kanban
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .insert({
        user_id: form.user_id,
        pipeline_id: form.pipeline_id,
        column_id: form.column_id,
        name: name,
        email: email,
        phone: phone,
        instagram: instagram,
        observations: notes,
        tag: form.tag,
        is_client: false
      })
      .select()
      .single();

    if (oppErr) throw oppErr;

    return new Response(JSON.stringify({ success: true, message: "Lead criado com sucesso", id: opp.id }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201
    });

  } catch (err: any) {
    console.error("[webhook-lead] Erro:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})