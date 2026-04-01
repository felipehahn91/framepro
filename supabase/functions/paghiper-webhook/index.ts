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

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Se estiver pago ou completado
    if (status === 'paid' || status === 'completed') {
      if (orderId.includes('_')) {
        // É uma parcela ("ID_da_transacao_ID_da_parcela")
        const [txId, instId] = orderId.split('_');
        
        const { data: tx } = await supabaseAdmin.from('transactions')
          .select('*, opportunities(name)')
          .eq('id', txId)
          .single();
        
        if (tx && tx.installments) {
           const insts = typeof tx.installments === 'string' ? JSON.parse(tx.installments) : tx.installments;
           
           let paidAmount = 0;
           let isAlreadyPaid = false;

           const updatedInsts = insts.map((i: any) => {
             if (i.id === instId) {
               if (i.status === 'Pago') isAlreadyPaid = true;
               paidAmount = Number(i.amount) || 0;
               return { ...i, status: 'Pago', paidDate: new Date().toISOString() };
             }
             return i;
           });
           
           if (!isAlreadyPaid) {
             const allPaid = updatedInsts.every((i: any) => i.status === 'Pago');
             
             await supabaseAdmin.from('transactions').update({
               installments: updatedInsts,
               status: allPaid ? 'Pago' : 'Pendente' // Updated to 'Pago' to match Financeiro
             }).eq('id', txId);

             // Create Notification
             const clientName = tx.opportunities?.name || 'Cliente';
             const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
             await supabaseAdmin.from('notifications').insert({
               user_id: tx.user_id,
               title: 'Pagamento Pix Recebido',
               content: `Uma parcela de ${formatter.format(paidAmount)} do cliente ${clientName} acabou de ser paga via Pix Automático!`,
               type: 'success',
               related_entity_type: 'transaction',
               related_entity_id: tx.id
             });
           }
        }
      } else {
        // É um recebimento de cota única
        const { data: updatedTx, error } = await supabaseAdmin.from('transactions')
          .update({
            status: 'Pago' // Changed from 'Recebido' to 'Pago'
          })
          .eq('id', orderId)
          .select('*, opportunities(name)')
          .single();
          
        if (updatedTx && !error) {
          const clientName = updatedTx.opportunities?.name || 'Cliente';
          const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
          await supabaseAdmin.from('notifications').insert({
            user_id: updatedTx.user_id,
            title: 'Pagamento Pix Recebido',
            content: `O pagamento de ${formatter.format(Number(updatedTx.amount) || 0)} do cliente ${clientName} acabou de ser pago via Pix Automático!`,
            type: 'success',
            related_entity_type: 'transaction',
            related_entity_id: updatedTx.id
          });
        }
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