// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("[evolution-webhook] Evento Recebido:", payload.event);

    const event = payload.event;
    const instanceName = payload.instance;

    if (!instanceName) {
      return new Response('Nenhuma instância informada', { status: 400 });
    }

    // 1. Descobrir qual usuário do CRM é dono desta instância
    const { data: instanceData } = await supabase
      .from('whatsapp_instances')
      .select('user_id')
      .eq('instance_name', instanceName)
      .single();

    if (!instanceData) {
      console.error("[evolution-webhook] Instância não mapeada para um usuário:", instanceName);
      return new Response('Instance not mapped', { status: 404 });
    }

    const userId = instanceData.user_id;

    // 2. Processar a mensagem (MESSAGES_UPSERT)
    if (event === 'messages.upsert') {
      const messages = Array.isArray(payload.data) ? payload.data : (payload.data?.messages || [payload.data?.message].filter(Boolean));
      
      for (const msg of messages) {
        const remoteJid = msg.key?.remoteJid;
        
        // Ignora grupos e broadcast por enquanto para manter o CRM focado em Leads
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') continue;

        const fromMe = msg.key.fromMe || false;
        const messageId = msg.key.id;
        const pushName = msg.pushName || remoteJid.split('@')[0];
        const timestamp = msg.messageTimestamp 
          ? new Date(msg.messageTimestamp * 1000).toISOString() 
          : new Date().toISOString();

        // Extrai o texto priorizando as diferentes formas que o WhatsApp envia
        let text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   msg.message?.imageMessage?.caption || 
                   msg.message?.videoMessage?.caption || 
                   "";

        if (!text && msg.message) {
          if (msg.message.imageMessage) text = "📷 Imagem";
          else if (msg.message.videoMessage) text = "🎥 Vídeo";
          else if (msg.message.audioMessage) text = "🎵 Áudio";
          else if (msg.message.documentMessage) text = "📄 Documento";
          else if (msg.message.stickerMessage) text = "✨ Figurinha";
          else text = "📎 Mídia/Anexo";
        }

        // 3. Upsert do Chat (Atualiza a conversa na lateral)
        const { data: chatData, error: chatError } = await supabase
          .from('whatsapp_chats')
          .upsert({ 
            user_id: userId, 
            instance_name: instanceName, 
            remote_jid: remoteJid, 
            name: pushName, 
            last_message: text, 
            last_message_time: timestamp, 
            updated_at: new Date().toISOString() 
          }, { onConflict: 'user_id,remote_jid' })
          .select()
          .single();

        if (chatError) console.error("[evolution-webhook] Erro ao atualizar chat:", chatError);

        // 4. Insere a Mensagem
        if (chatData) {
          const { error: msgError } = await supabase
            .from('whatsapp_messages')
            .upsert({ 
              user_id: userId, 
              chat_id: chatData.id, 
              message_id: messageId, 
              remote_jid: remoteJid, 
              text: text, 
              from_me: fromMe, 
              timestamp: timestamp 
            }, { onConflict: 'user_id,message_id' });
            
          if (msgError) console.error("[evolution-webhook] Erro ao inserir mensagem:", msgError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[evolution-webhook] Erro Crítico:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})