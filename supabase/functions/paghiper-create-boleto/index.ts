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

    // Calcula os dias até o vencimento. Se a data já passou ou for hoje, bota 1 dia pra não dar erro.
    const dueDateMs = new Date(due_date).getTime();
    let daysDue = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
    if (daysDue < 1) daysDue = 1;

    // Converte valor para centavos (Requisito do PagHiper)
    const price_cents = Math.round(amount * 100);

    const orderId = installment_id ? `${transaction_id}_${installment_id}` : transaction_id;

    // Montando o Payload do PagHiper
    const paghiperData = {
      apiKey: profile.paghiper_api_key,
      order_id: orderId,
      payer_email: payer_email || "cliente@email.com",
      payer_name: payer_name || "Cliente",
      payer_cpf_cnpj: payer_cpf.replace(/\D/g, ''),
      days_due_date: daysDue,
      type_bank_slip: 'boletoA4',
      items: [
        {
          description: description,
          quantity: 1,
          item_id: "1",
          price_cents: price_cents
        }
      ]
    };

    console.log(`[paghiper-create-boleto] Enviando requisição para o PagHiper...`, { orderId });

    const response = await fetch('https://api.paghiper.com/transaction/create/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paghiperData)
    });

    const result = await response.json();

    if (result.create_request?.result === 'reject') {
      console.error("[paghiper-create-boleto] Rejeitado pelo PagHiper:", result.create_request.response_message);
      return new Response(JSON.stringify({ error: result.create_request.response_message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
       url_slip: result.create_request.bank_slip.url_slip,
       linha_digitavel: result.create_request.bank_slip.digitable_line,
       transaction_id: result.create_request.transaction_id
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});

  } catch (err: any) {
    console.error("[paghiper-create-boleto] Erro interno:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})