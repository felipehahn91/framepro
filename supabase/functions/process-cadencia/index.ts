// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Pega mensagens pendentes que já deveriam ter sido enviadas
    const { data: pendingItems, error: fetchError } = await supabase
      .from('cadencia_queue')
      .select('*, opportunities(phone, name)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10); // Processa de 10 em 10 para evitar timeouts

    if (fetchError) throw fetchError;
    if (!pendingItems || pendingItems.length === 0) {
      return new Response(JSON.stringify({ message: 'Nada para processar' }), { headers: corsHeaders });
    }

    console.log(`[process-cadencia] Processando ${pendingItems.length} envios...`);

    for (const item of pendingItems) {
      try {
        const phone = item.opportunities?.phone;
        if (!phone) throw new Error("Lead sem telefone");

        // 2. Busca a instância do WhatsApp do usuário
        const { data: instance } = await supabase
          .from('whatsapp_instances')
          .select('*')
          .eq('user_id', item.user_id)
          .eq('status', 'connected')
          .single();

        if (!instance) throw new Error("WhatsApp não conectado");

        // 3. Pega Configurações Globais da API (Simulado aqui, idealmente via DB ou Vault)
        // No Dyad, usamos o localStorage para a Key, mas em Edge Function precisamos de Env Vars ou Config DB.
        // Vamos assumir que as credenciais estão em variáveis de ambiente do projeto.
        const evoUrl = "https://evolution.framepro.com.br"; // Substitua pela sua URL real
        const evoKey = "SUA_GLOBAL_KEY"; // Substitua pela sua Key real

        // 4. Envia cada mensagem do Step
        const messages = item.payload.items || [];
        for (const msg of messages) {
          let endpoint = "";
          let body = { number: phone.replace(/\D/g, ''), delay: 1000 };

          if (msg.type === 'text') {
            endpoint = "/message/sendText";
            body.text = msg.content;
          } else if (msg.type === 'audio') {
            endpoint = "/message/sendWhatsAppAudio";
            body.audio = msg.content; // URL base64 ou link dependendo da config da Evo
          } else if (msg.type === 'image') {
            endpoint = "/message/sendMedia";
            body.media = msg.content;
            body.mediatype = "image";
            body.caption = msg.caption || "";
          }

          const res = await fetch(`${evoUrl}${endpoint}/${instance.instance_name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
            body: JSON.stringify(body)
          });

          if (!res.ok) {
            const errTxt = await res.text();
            throw new Error(`Erro na Evolution: ${errTxt}`);
          }
          
          // Delay entre mensagens do mesmo bloco
          await new Promise(r => setTimeout(r, 2000));
        }

        // Marcar como enviado
        await supabase.from('cadencia_queue').update({ status: 'sent' }).eq('id', item.id);

      } catch (err: any) {
        console.error(`[process-cadencia] Erro no item ${item.id}:`, err.message);
        await supabase.from('cadencia_queue').update({ 
          status: 'error', 
          error_message: err.message 
        }).eq('id', item.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})