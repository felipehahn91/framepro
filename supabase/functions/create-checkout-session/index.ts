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

    const { planType } = await req.json() // 'monthly' ou 'founder'
    
    // Configurações dos Planos (ID dos preços do seu Stripe Dashboard)
    // Substitua pelos seus IDs Reais do Stripe!
    const prices = {
      monthly: 'price_1Q_MONTHLY_ID', // R$ 97 / mês com trial
      founder: 'price_1Q_FOUNDER_ID'   // R$ 804 / ano (R$ 67/mês)
    }

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
      line_items: [{ price: prices[planType], quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/billing-success`,
      cancel_url: `${req.headers.get('origin')}/billing-cancel`,
    }

    // Adiciona 30 dias de trial apenas no plano mensal
    if (planType === 'monthly') {
      sessionParam.subscription_data = { trial_period_days: 30 }
    }

    const session = await stripe.checkout.sessions.create(sessionParam)

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})