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
    let notification_id, transaction_id, apiKey;
    
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
       const json = await req.json();
       notification_id = json.notification_id;
       transaction_id = json.transaction_id;
       apiKey = json.apiKey;
    } else {
       const bodyText = await req.text();
       const params = new URLSearchParams(bodyText);
       notification_id = params.get('notification_id');
       transaction_id = params.get('transaction_id');
       apiKey = params.get('apiKey');
    }

    if (!notification_id || !transaction_id || !apiKey) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Service role para ignorar RLS e atualizar via backend
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Encontra a qual usuário pertence esta chave de API
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, paghiper_token')
      .eq('paghiper_api_key', apiKey)
      .single();

    if (!profile || !profile.paghiper_token) {
      return new Response("User not found or token missing", { status: 404, headers: corsHeaders });
    }

    // Consulta na API do PagHiper qual o status real dessa notificação
    const checkRes = await fetch('https://pix.paghiper.com/invoice/notification/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: profile.paghiper_token,
        apiKey: apiKey,
        transaction_id: transaction_id,
        notification_id: notification_id
      })
    });

    const result = await checkRes.json();
    const statusRequest = result.status_request;

    if (statusRequest.result === 'reject') {
      return new Response("Notification rejected by PagHiper", { status: 400, headers: corsHeaders });
    }

    const status = statusRequest.status; // 'paid', 'completed', 'canceled', etc.
    const orderId = statusRequest.order_id; // Formato no nosso DB: "txId" ou "txId_instId"

    // Se estiver pago ou completado
    if (status === 'paid' || status === 'completed') {
      if (orderId.includes('_')) {
        // É uma parcela ("ID_da_transacao_ID_da_parcela")
        const [txId, instId] = orderId.split('_');
        
        const { data: tx } = await supabase.from('transactions').select('installments').eq('id', txId).single();
        
        if (tx && tx.installments) {
           const insts = typeof tx.installments === 'string' ? JSON.parse(tx.installments) : tx.installments;
           const updatedInsts = insts.map((i: any) => {
             if (i.id === instId) {
               return { ...i, status: 'Pago', paidDate: new Date().toISOString() };
             }
             return i;
           });
           
           const allPaid = updatedInsts.every((i: any) => i.status === 'Pago');
           
           await supabase.from('transactions').update({
             installments: updatedInsts,
             status: allPaid ? 'Recebido' : 'Pendente'
           }).eq('id', txId);
        }
      } else {
        // É um recebimento de cota única
        await supabase.from('transactions').update({
          status: 'Recebido'
        }).eq('id', orderId);
      }
    } else if (status === 'canceled') {
      // Se foi cancelado/expirado, podemos tratar aqui caso ache necessário no futuro
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error("[paghiper-webhook] Erro interno:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})