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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const event = payload.event || payload.eventType;
    const instanceName = payload.instance;

    if (!instanceName) return new Response('Nenhuma instância informada', { status: 400 });

    const { data: instanceData } = await supabase
      .from('whatsapp_instances')
      .select('user_id')
      .eq('instance_name', instanceName)
      .single();

    if (!instanceData) return new Response('Instance not mapped', { status: 404 });

    const userId = instanceData.user_id;

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      let messages = [];
      if (Array.isArray(payload.data)) messages = payload.data;
      else if (payload.data?.messages) messages = payload.data.messages;
      else if (payload.data) messages = [payload.data];

      for (const msg of messages) {
        const msgCore = msg.message?.key ? msg.message : msg;
        const remoteJid = msgCore.key?.remoteJid || msg.key?.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') continue;

        const fromMe = msgCore.key?.fromMe || msg.key?.fromMe || false;
        const messageId = msgCore.key?.id || msg.key?.id;
        const pushName = msgCore.pushName || msg.pushName || remoteJid.split('@')[0];
        
        const timestamp = new Date().toISOString();
        const content = msgCore.message || msg.message || msgCore;
        let text = content?.conversation || content?.extendedTextMessage?.text || "";

        // --- LÓGICA DE GATILHO ---
        if (!fromMe && text) {
          const { data: triggers } = await supabase
            .from('whatsapp_triggers')
            .select('*')
            .eq('user_id', userId)
            .eq('enabled', true);

          if (triggers && triggers.length > 0) {
            const matchedTrigger = triggers.find(t => 
              text.toLowerCase().includes(t.trigger_phrase.toLowerCase())
            );

            if (matchedTrigger) {
              // Verifica se já existe esse lead para não duplicar no mesmo dia
              const { data: existing } = await supabase
                .from('opportunities')
                .select('id')
                .eq('user_id', userId)
                .eq('phone', remoteJid)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(1);

              if (!existing || existing.length === 0) {
                await supabase.from('opportunities').insert({
                  user_id: userId,
                  name: pushName,
                  phone: remoteJid,
                  pipeline_id: matchedTrigger.pipeline_id,
                  column_id: matchedTrigger.column_id,
                  tag: matchedTrigger.tag,
                  observations: `Lead criado via gatilho de WhatsApp: "${matchedTrigger.trigger_phrase}"`,
                  is_client: false
                });
                console.log(`[webhook] Lead criado via gatilho: ${pushName}`);
              }
            }
          }
        }

        // Upsert do Chat e Mensagem (Fluxo normal do WebChat)
        const { data: chatData } = await supabase
          .from('whatsapp_chats')
          .upsert({ user_id: userId, instance_name: instanceName, remote_jid: remoteJid, name: pushName, last_message: text, last_message_time: timestamp, updated_at: new Date().toISOString() }, { onConflict: 'user_id,remote_jid' })
          .select().single();

        if (chatData && messageId) {
          await supabase.from('whatsapp_messages').upsert({ user_id: userId, chat_id: chatData.id, message_id: messageId, remote_jid: remoteJid, text, from_me: fromMe, timestamp }, { onConflict: 'user_id,message_id' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})