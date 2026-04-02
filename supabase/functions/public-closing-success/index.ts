// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { link_token, transaction_id, installment_id, amount, payer_name, payer_cpf, due_date, client_phone, contract_id, client_edited_installments } = payload;

    if (!link_token) {
      return new Response("Missing link_token", { status: 400, headers: corsHeaders });
    }

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get the user_id from the closing link
    const { data: link } = await supabaseAdmin
      .from('closing_links')
      .select('user_id, value, opportunities(*)')
      .eq('token', link_token)
      .single();

    if (!link) {
      return new Response("Invalid link token", { status: 400, headers: corsHeaders });
    }
    const userId = link.user_id;

    // 2. Generate Pix via PagHiper (APENAS SE A DATA DA PRIMEIRA PARCELA FOR HOJE)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('paghiper_api_key, paghiper_token')
      .eq('id', userId)
      .single();

    let pixUrl = null;
    let pixCode = null;

    // Verifica se a data de vencimento é hoje (usando UTC-3 para o Brasil)
    const todayStr = new Date(Date.now() - 3 * 3600 * 1000).toISOString().split('T')[0];
    const dueDateStr = due_date ? due_date.split('T')[0] : '';
    const isDueDateToday = dueDateStr === todayStr;

    if (isDueDateToday && profile?.paghiper_api_key && profile?.paghiper_token) {
      const dueDateMs = new Date(due_date).getTime();
      let daysDue = Math.ceil((dueDateMs - Date.now()) / (1000 * 3600 * 24));
      if (daysDue < 1) daysDue = 1;

      const price_cents = Math.round(amount * 100);
      const orderId = installment_id ? `${transaction_id}_${installment_id}` : transaction_id;

      const paghiperData = {
        apiKey: profile.paghiper_api_key,
        order_id: orderId,
        payer_email: link.opportunities?.email || "cliente@email.com",
        payer_name: payer_name || "Cliente",
        payer_cpf_cnpj: payer_cpf.replace(/\D/g, ''),
        days_due_date: daysDue,
        items: [
          {
            description: `Pagamento: ${link.opportunities?.name}`,
            quantity: 1,
            item_id: "1",
            price_cents: price_cents
          }
        ]
      };

      const phRes = await fetch('https://pix.paghiper.com/invoice/create/', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(paghiperData)
      });
      
      const phResult = await phRes.json();
      if (phResult.pix_create_request?.result !== 'reject') {
        pixUrl = phResult.pix_create_request.pix_code.qrcode_image_url;
        pixCode = phResult.pix_create_request.pix_code.emv;

        // Atualizar a transação no banco de dados com o PIX
        if (installment_id) {
          const { data: tx } = await supabaseAdmin.from('transactions').select('installments').eq('id', transaction_id).single();
          if (tx && tx.installments) {
            const updatedInsts = tx.installments.map((i: any) => i.id === installment_id ? { ...i, pix_url: pixUrl, pix_code: pixCode } : i);
            await supabaseAdmin.from('transactions').update({ installments: updatedInsts }).eq('id', transaction_id);
          }
        } else {
          await supabaseAdmin.from('transactions').update({ pix_url: pixUrl, pix_code: pixCode }).eq('id', transaction_id);
        }
      }
    }

    // Notify user about contract signed
    if (payload.contract_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: link.user_id,
        title: 'Novo Contrato Assinado',
        content: `O cliente ${payer_name} assinou o contrato no valor de ${formatCurrency(amount)}.`,
        type: 'success',
        related_entity_type: 'contract',
        related_entity_id: payload.contract_id
      });
    }

    // Notify user about custom installments edit
    if (client_edited_installments) {
      await supabaseAdmin.from('notifications').insert({
        user_id: link.user_id,
        title: 'Plano de Pagamento Personalizado',
        content: `O cliente ${payer_name || 'Cliente'} ajustou os valores ou datas das parcelas antes de assinar o contrato. Verifique seu financeiro.`,
        type: 'info',
        related_entity_type: 'transaction',
        related_entity_id: transaction_id
      });
    }

    // Notify user about PIX generated
    if (pixCode) {
      await supabaseAdmin.from('notifications').insert({
        user_id: link.user_id,
        title: 'Cobrança via Pix Gerada e Enviada',
        content: `Pix automático no valor de ${formatCurrency(amount)} foi gerado e enviado para ${payer_name} via WhatsApp.`,
        type: 'info',
        related_entity_type: 'transaction',
        related_entity_id: transaction_id
      });
    }

    // 3. Send WhatsApp via Evolution API
    const { data: settings } = await supabaseAdmin.from('platform_settings').select('evo_api_url, evo_api_key').single();
    if (settings?.evo_api_url && settings?.evo_api_key && client_phone) {
      const { data: waInstance } = await supabaseAdmin
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (waInstance) {
        const evoUrl = settings.evo_api_url.replace(/\/$/, '');
        const evoKey = settings.evo_api_key;
        
        let formattedPhone = client_phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10) {
          formattedPhone = `55${formattedPhone}`;
        }
        
        const firstName = payer_name ? payer_name.split(' ')[0] : 'Cliente';
        let messageText = `Olá ${firstName}! 🎉 Muito obrigado por fechar negócio conosco!\n\nSeu contrato foi assinado e salvo com sucesso.\n`;
        
        if (pixCode) {
          messageText += `\nAbaixo estão os dados para o pagamento do seu acordo:`;
        } else if (dueDateStr) {
          const [year, month, day] = dueDateStr.split('-');
          messageText += `\nSua primeira parcela está agendada para o dia ${day}/${month}/${year}. Entraremos em contato próximo a esta data.\n\nQualquer dúvida, estamos à disposição!`;
        } else {
          messageText += `\nQualquer dúvida, estamos à disposição!`;
        }

        // Send 1: Welcome and Text
        await fetch(`${evoUrl}/message/sendText/${waInstance.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evoKey,
            'Authorization': `Bearer ${evoKey}`
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: messageText,
            delay: 1500
          })
        });

        if (pixCode && pixUrl) {
          // Send 2: QR Code Image
          await fetch(`${evoUrl}/message/sendMedia/${waInstance.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evoKey,
              'Authorization': `Bearer ${evoKey}`
            },
            body: JSON.stringify({
              number: formattedPhone,
              options: { delay: 2000, presence: "composing" },
              mediaMessage: {
                mediatype: "image",
                fileName: "qrcode_pix.png",
                caption: "QR Code do PIX para pagamento.",
                media: pixUrl
              }
            })
          });

          // Send 3: Pix Copy and Paste
          await fetch(`${evoUrl}/message/sendText/${waInstance.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evoKey,
              'Authorization': `Bearer ${evoKey}`
            },
            body: JSON.stringify({
              number: formattedPhone,
              text: pixCode,
              delay: 3000
            })
          });
        }
      }
    }

    // Trigger AI Insight update (Background)
    fetch(`${supabaseUrl}/functions/v1/generate-ai-insight`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ user_id: userId })
    }).catch(console.error);

    return new Response(JSON.stringify({ success: true, pixCode, pixUrl }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[public-closing-success] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});