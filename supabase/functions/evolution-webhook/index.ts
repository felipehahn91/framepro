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

    console.log(`[evolution-webhook] Evento Recebido: ${event} | Instância: ${instanceName}`);

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
      console.error(`[evolution-webhook] Instância não mapeada para um usuário no banco: ${instanceName}`);
      return new Response('Instance not mapped', { status: 404 });
    }

    const userId = instanceData.user_id;

    // 2. Processar a mensagem (MESSAGES_UPSERT)
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      
      // Log do payload cru para debugar caso algo venha com formato desconhecido
      console.log("[evolution-webhook] Dados recebidos (RAW):", JSON.stringify(payload.data).substring(0, 500));
      
      // A Evolution pode mandar as mensagens em vários formatos dependendo da versão
      let messages = [];
      if (Array.isArray(payload.data)) {
        messages = payload.data;
      } else if (payload.data?.messages) {
        messages = payload.data.messages;
      } else if (payload.data?.message) {
        messages = [payload.data.message];
      } else if (payload.data?.key) {
        messages = [payload.data];
      }

      console.log(`[evolution-webhook] Encontradas ${messages.length} mensagens para processar.`);

      for (const msg of messages) {
        // Algumas versões da API envelopam a mensagem dentro de outro objeto 'message'
        const msgCore = msg.message?.message ? msg.message : msg;
        
        const remoteJid = msgCore.key?.remoteJid || msg.key?.remoteJid;
        
        // Ignora grupos e broadcast para manter o CRM focado em Leads 1 a 1
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
          console.log(`[evolution-webhook] Ignorando JID (Grupo/Status): ${remoteJid}`);
          continue;
        }

        const fromMe = msgCore.key?.fromMe || msg.key?.fromMe || false;
        const messageId = msgCore.key?.id || msg.key?.id;
        const pushName = msgCore.pushName || msg.pushName || remoteJid.split('@')[0];
        
        const msgTimestamp = msgCore.messageTimestamp || msg.messageTimestamp;
        const timestamp = msgTimestamp 
          ? new Date(msgTimestamp * 1000).toISOString() 
          : new Date().toISOString();

        // Extrai o texto priorizando as diferentes formas de envio de mídia do WhatsApp
        const content = msgCore.message || msg.message || msgCore;
        let text = content?.conversation || 
                   content?.extendedTextMessage?.text || 
                   content?.imageMessage?.caption || 
                   content?.videoMessage?.caption || 
                   "";

        if (!text) {
          if (content?.imageMessage) text = "📷 Imagem";
          else if (content?.videoMessage) text = "🎥 Vídeo";
          else if (content?.audioMessage) text = "🎵 Áudio";
          else if (content?.documentMessage) text = "📄 Documento";
          else if (content?.stickerMessage) text = "✨ Figurinha";
          else text = "📎 Mídia/Anexo";
        }

        console.log(`[evolution-webhook] Processando: ID=${messageId} | JID=${remoteJid} | Texto="${text.substring(0,30)}"`);

        if (!messageId) {
           console.log(`[evolution-webhook] Mensagem sem ID ignorada.`);
           continue;
        }

        // 3. Upsert do Chat (Atualiza a conversa na lateral do CRM)
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

        if (chatError) {
           console.error("[evolution-webhook] Erro ao salvar Chat no banco:", chatError);
        }

        // 4. Insere a Mensagem na conversa
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
            
          if (msgError) {
             console.error("[evolution-webhook] Erro ao salvar Mensagem no banco:", msgError);
          } else {
             console.log(`[evolution-webhook] Mensagem salva com sucesso no chat de ${pushName}!`);
          }
        }
      }
    } else {
      console.log(`[evolution-webhook] Evento ignorado: ${event}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("[evolution-webhook] Erro Crítico Global:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})