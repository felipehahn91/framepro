// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Autenticando o usuário que fez a requisição
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const payload = await req.json();
    const { transaction_id, installment_id, amount, description, payer_name, payer_email, payer_cpf, due_date } = payload;

    // Buscar credenciais do usuário logado
    const { data: profile } = await supabase
      .from('profiles')
      .select('paghiper_api_key, paghiper_token')
      .eq('id', user.id)
      .single();

    if (!profile?.paghiper_api_key || !profile?.paghiper_token) {
      return new Response(JSON.stringify({ error: "Credenciais do PagHiper não configuradas. Vá até as Configurações." }), { status: 400, headers: corsHeaders });
    }

    // Calcula os dias até o vencimento
    const dueDateMs = new Date(due_date).getTime();
    let daysDue = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
    if (daysDue < 1) daysDue = 1;

    // Converte valor para centavos
    const price_cents = Math.round(amount * 100);
    const orderId = installment_id ? `${transaction_id}_${installment_id}` : transaction_id;

    // Payload para o endpoint de PIX do PagHiper
    const paghiperData = {
      apiKey: profile.paghiper_api_key,
      order_id: orderId,
      payer_email: payer_email || "cliente@email.com",
      payer_name: payer_name || "Cliente",
      payer_cpf_cnpj: payer_cpf.replace(/\D/g, ''),
      days_due_date: daysDue,
      items: [
        {
          description: description,
          quantity: 1,
          item_id: "1",
          price_cents: price_cents
        }
      ]
    };

    // Usando endpoint de PIX
    const response = await fetch('https://pix.paghiper.com/invoice/create/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paghiperData)
    });

    const result = await response.json();

    if (result.pix_create_request?.result === 'reject') {
      return new Response(JSON.stringify({ error: result.pix_create_request.response_message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
       pix_url: result.pix_create_request.pix_code.qrcode_image_url,
       pix_code: result.pix_create_request.pix_code.emv,
       transaction_id: result.pix_create_request.transaction_id
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})