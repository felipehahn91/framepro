// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() })
    
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Não autorizado')

    const { planType } = await req.json() // 'starter', 'plus' ou 'founder'
    
    // IDs dos preços do Stripe
    const prices = {
      starter: 'price_1TH6XxE4KSfiMx6gkMrcJHZN', // ID do Plano Starter (R$ 97)
      plus: 'price_1THmFnE4KSfiMx6gEUrYgYrc', // Plano Plus (R$ 147)
      founder: 'price_1TFlPTE4KSfiMx6g3ikCABIk', // R$ 804 / ano (R$ 67/mês)
      monthly: 'price_1TH6XxE4KSfiMx6gkMrcJHZN' // Retrocompatibilidade temporária se precisar
    }

    const priceId = prices[planType] || prices.starter;

    // Busca ou cria o cliente no Stripe
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabaseUUID: user.id } })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const sessionParam: any = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/billing-success`,
      cancel_url: `${req.headers.get('origin')}/billing-cancel`,
      metadata: {
        plan_type: planType // Para o webhook do stripe saber qual plano
      }
    }

    // Adiciona 30 dias de trial apenas para novos planos mensais (se desejado)
    if (planType === 'starter' || planType === 'plus') {
      sessionParam.subscription_data = { trial_period_days: 30 }
    } else if (planType === 'founder') {
      // Habilita o parcelamento (installments) do cartão de crédito para a assinatura anual
      sessionParam.payment_method_options = {
        card: {
          installments: {
            enabled: true
          }
        }
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParam)

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
