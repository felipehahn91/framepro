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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let evoUrl = Deno.env.get('EVO_API_URL')?.replace(/\/$/, '');
    let evoKey = Deno.env.get('EVO_API_KEY');

    if (!evoUrl || !evoKey) {
      // Tentar buscar do banco de dados (platform_settings)
      const { data: settings } = await supabase.from('platform_settings').select('*').limit(1).single();
      if (settings && settings.evo_api_url && settings.evo_api_key) {
        evoUrl = settings.evo_api_url.replace(/\/$/, '');
        evoKey = settings.evo_api_key;
      } else {
        console.error("[process-cadencia] EVO_API_URL ou EVO_API_KEY não configurados.");
        return new Response("EVO_API credentials not configured", { status: 500, headers: corsHeaders });
      }
    }

    // 1. Buscar itens pendentes na fila cujo horário agendado seja menor ou igual a agora
    const { data: queueItems, error: queueError } = await supabase
      .from('cadencia_queue')
      .select('*, opportunities(phone, name)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50); // processa em lotes de 50

    if (queueError) {
      console.error("[process-cadencia] Erro ao buscar fila:", queueError);
      return new Response("Error fetching queue", { status: 500, headers: corsHeaders });
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum item pendente" }), { headers: corsHeaders });
    }

    console.log(`[process-cadencia] Processando ${queueItems.length} mensagens da cadência.`);

    for (const item of queueItems) {
      try {
        // Obter a instância do WhatsApp do usuário
        const { data: instanceData } = await supabase
          .from('whatsapp_instances')
          .select('instance_name')
          .eq('user_id', item.user_id)
          .in('status', ['open', 'connected']) // Pode ser 'open' ou 'connected'
          .single();

        if (!instanceData) {
          throw new Error("Nenhuma instância do WhatsApp conectada para este usuário.");
        }

        const instanceName = instanceData.instance_name;
        const phone = item.opportunities?.phone?.replace(/\D/g, '');
        const payload = item.payload; // esperado: { type: 'text'|'audio'|'image', content: '...' }

        if (!phone) {
          throw new Error("Oportunidade sem número de telefone.");
        }

        let endpoint = '';
        let body = {};

        // Substituir variáveis no texto (ex: {{nome}} para o nome do lead)
        const processText = (text: string) => {
           let processed = text;
           if (item.opportunities?.name) {
               processed = processed.replace(/\{\{nome\}\}/gi, item.opportunities.name.split(' ')[0]);
           }
           return processed;
        };

        if (payload.type === 'text') {
          endpoint = `/message/sendText/${instanceName}`;
          body = { number: phone, text: processText(payload.content), delay: 1200 };
        } else if (payload.type === 'image') {
          endpoint = `/message/sendMedia/${instanceName}`;
          body = { 
            number: phone, 
            mediatype: "image", 
            media: payload.content, // URL
            caption: payload.caption ? processText(payload.caption) : "",
            delay: 1200 
          };
        } else if (payload.type === 'audio') {
          endpoint = `/message/sendWhatsAppAudio/${instanceName}`;
          body = { number: phone, audio: payload.content, delay: 1200 };
        } else {
          throw new Error(`Tipo de mensagem não suportado: ${payload.type}`);
        }

        // Enviar para a Evolution API
        const evoResponse = await fetch(`${evoUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evoKey
          },
          body: JSON.stringify(body)
        });

        if (!evoResponse.ok) {
          const errData = await evoResponse.text();
          throw new Error(`Erro na Evolution API: ${errData}`);
        }

        // Marcar como concluído
        await supabase
          .from('cadencia_queue')
          .update({ status: 'completed' })
          .eq('id', item.id);

      } catch (err: any) {
        console.error(`[process-cadencia] Erro ao processar item ${item.id}:`, err);
        // Marcar como falho
        await supabase
          .from('cadencia_queue')
          .update({ status: 'failed', error_message: err.message || 'Erro desconhecido' })
          .eq('id', item.id);
      }
    }

    return new Response(JSON.stringify({ processed: queueItems.length }), { headers: corsHeaders });
  } catch (err) {
    console.error("[process-cadencia] Erro geral:", err);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
})
