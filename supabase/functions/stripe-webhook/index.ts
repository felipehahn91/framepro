// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Cria o provedor de criptografia compatível com o Deno / Edge Runtime
const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  try {
    const body = await req.text();
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    // Verificação de segurança
    if (!endpointSecret) {
      console.error("[stripe-webhook] Erro: STRIPE_WEBHOOK_SECRET não está configurado nas variáveis de ambiente do Supabase.");
      return new Response("Configuração do servidor incompleta (Webhook Secret faltando)", { status: 500 });
    }

    let event;
    try {
      // Passamos o cryptoProvider como o quinto argumento!
      event = await stripe.webhooks.constructEventAsync(
        body, 
        signature, 
        endpointSecret,
        undefined,
        cryptoProvider
      );
    } catch (err) {
      console.error(`[stripe-webhook] Erro na assinatura: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[stripe-webhook] Evento recebido: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        
        // Atualiza o perfil do usuário para 'active' e salva o customer_id
        const { error } = await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'active',
            stripe_customer_id: customerId
          })
          .eq('stripe_customer_id', customerId);
          
        if (error) throw error;
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // 'active', 'past_due', 'canceled', etc.

        await supabase
          .from('profiles')
          .update({ subscription_status: status })
          .eq('stripe_customer_id', customerId);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { 'Content-Type': 'application/json' },
      status: 200 
    });
  } catch (err) {
    console.error(`[stripe-webhook] Erro processando evento: ${err.message}`);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
})