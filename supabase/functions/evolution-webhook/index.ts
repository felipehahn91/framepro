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

    console.log(`[evolution-webhook] Evento: ${event} | Instância: ${instanceName}`);

    if (!instanceName) {
      return new Response('Nenhuma instância informada', { status: 400 });
    }

    const { data: instanceData } = await supabase
      .from('whatsapp_instances')
      .select('user_id')
      .eq('instance_name', instanceName)
      .single();

    if (!instanceData) {
      return new Response('Instance not mapped', { status: 404 });
    }

    const userId = instanceData.user_id;

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      let messages = [];
      if (Array.isArray(payload.data)) {
        messages = payload.data;
      } else if (payload.data?.messages && Array.isArray(payload.data.messages)) {
        messages = payload.data.messages;
      } else if (payload.data) {
        messages = [payload.data];
      }

      for (const msg of messages) {
        const msgCore = msg.message?.key ? msg.message : msg;
        const remoteJid = msgCore.key?.remoteJid || msg.key?.remoteJid;
        
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
          continue;
        }

        const fromMe = msgCore.key?.fromMe || msg.key?.fromMe || false;
        const messageId = msgCore.key?.id || msg.key?.id;
        const pushName = msgCore.pushName || msg.pushName || remoteJid.split('@')[0];
        
        const msgTimestamp = msgCore.messageTimestamp || msg.messageTimestamp;
        const timestamp = msgTimestamp 
          ? new Date(msgTimestamp * 1000).toISOString() 
          : new Date().toISOString();

        const content = msgCore.message || msg.message || msgCore;
        let text = content?.conversation || 
                   content?.extendedTextMessage?.text || 
                   content?.imageMessage?.caption || 
                   content?.videoMessage?.caption || 
                   "";

        // Tratamento de Mídia
        let mediaUrl = "";
        const isImage = !!content?.imageMessage;
        const isAudio = !!content?.audioMessage || (!!content?.extendedTextMessage?.text === false && !!content?.audioMessage);
        const isVideo = !!content?.videoMessage;
        
        // Base64 enviado pela Evolution caso tenha ativado no webhook
        const base64String = msgCore.base64 || msg.base64 || content?.imageMessage?.base64 || content?.audioMessage?.base64;
        
        if (base64String && (isImage || isAudio || isVideo)) {
           const ext = isImage ? 'jpg' : isAudio ? 'ogg' : isVideo ? 'mp4' : 'bin';
           const mime = isImage ? 'image/jpeg' : isAudio ? 'audio/ogg' : isVideo ? 'video/mp4' : 'application/octet-stream';
           const fileName = `${userId}/chat/${messageId}.${ext}`;
           
           try {
             const binaryString = atob(base64String);
             const bytes = new Uint8Array(binaryString.length);
             for (let i = 0; i < binaryString.length; i++) {
                 bytes[i] = binaryString.charCodeAt(i);
             }
             
             const { error: uploadError } = await supabase.storage.from('contract_images').upload(fileName, bytes.buffer, { contentType: mime, upsert: true });
             
             if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('contract_images').getPublicUrl(fileName);
                mediaUrl = publicUrl;
             } else {
                console.error("Upload error", uploadError);
             }
           } catch(err) {
             console.error("Base64 processing error", err);
           }
        }
        
        let finalMessageText = text;
        if (mediaUrl) {
           if (isImage) finalMessageText = `[IMAGE]${mediaUrl} ${text}`.trim();
           else if (isAudio) finalMessageText = `[AUDIO]${mediaUrl}`;
           else if (isVideo) finalMessageText = `[VIDEO]${mediaUrl} ${text}`.trim();
        } else if (!text) {
           if (isImage) finalMessageText = "📷 Imagem";
           else if (isVideo) finalMessageText = "🎥 Vídeo";
           else if (isAudio) finalMessageText = "🎵 Áudio";
           else if (content?.documentMessage) finalMessageText = "📄 Documento";
           else if (content?.stickerMessage) finalMessageText = "✨ Figurinha";
           else finalMessageText = "📎 Mídia/Anexo";
        }

        if (!messageId) continue;

        // Upsert do Chat
        const { data: chatData } = await supabase
          .from('whatsapp_chats')
          .upsert({ 
            user_id: userId, 
            instance_name: instanceName, 
            remote_jid: remoteJid, 
            name: pushName, 
            last_message: finalMessageText, 
            last_message_time: timestamp, 
            updated_at: new Date().toISOString() 
          }, { onConflict: 'user_id,remote_jid' })
          .select()
          .single();

        // Insere a Mensagem
        if (chatData) {
          await supabase
            .from('whatsapp_messages')
            .upsert({ 
              user_id: userId, 
              chat_id: chatData.id, 
              message_id: messageId, 
              remote_jid: remoteJid, 
              text: finalMessageText, 
              from_me: fromMe, 
              timestamp: timestamp 
            }, { onConflict: 'user_id,message_id' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[evolution-webhook] Erro Crítico Global:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})