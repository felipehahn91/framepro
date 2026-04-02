// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get User Profile & Settings
    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user_id).single(),
      supabase.from('platform_settings').select('openai_api_key').single()
    ]);

    if (!settings?.openai_api_key) {
      return new Response(JSON.stringify({ error: "OpenAI not configured" }), { status: 400, headers: corsHeaders });
    }

    // 2. Collect Stats for Prompt
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Stats
    const [
      { count: leadsCount },
      { count: clientsCount },
      { count: contractsCount },
      { data: transactions }
    ] = await Promise.all([
      supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('user_id', user_id).eq('is_client', false),
      supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('user_id', user_id).eq('is_client', true),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('user_id', user_id).in('status', ['active', 'Ativo']),
      supabase.from('transactions').select('*').eq('user_id', user_id)
    ]);

    // Calculate monthly revenue
    let monthlyRevenue = 0;
    transactions?.forEach(tx => {
      // Check for simple transaction or installments
      if (tx.status === 'Pago' || tx.status === 'Recebido') {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          monthlyRevenue += Number(tx.amount);
        }
      }
      // Simplified: Just summarizing paid amounts in DB for now
    });

    const goal = profile?.monthly_revenue_goal || 0;
    const goalPercentage = goal > 0 ? (monthlyRevenue / goal) * 100 : 0;

    // 3. Prepare Prompt
    const prompt = `Você é um Mentor de Negócios e Estrategista especializado em FOTOGRAFIA.
Seu objetivo é dar um insight equilibrado (nem muito curto, nem muito longo) para o fotógrafo baseado nos dados reais dele.

DADOS REAIS DO USUÁRIO:
- Nome: ${profile?.first_name || 'Fotógrafo'}
- Leads/Oportunidades em aberto: ${leadsCount}
- Clientes convertidos: ${clientsCount}
- Contratos ativos: ${contractsCount}
- Meta de faturamento: R$ ${goal}
- Faturamento atual do mês: R$ ${monthlyRevenue} (${goalPercentage.toFixed(1)}% da meta)

INSTRUÇÕES DE RESPOSTA:
- Mencione os números do usuário de forma natural (ex: "Vi que você tem ${leadsCount} leads precisando de um clique de conversão").
- Seja útil: se a meta estiver longe, dê uma dica prática para o funil. Se estiver perto, parabenize e incentive o "clique final".
- Use terminologia de fotografia (foco, luz, enquadramento, revelação, exposição, ISO, cena).
- O texto deve ter entre 2 e 4 frases bem construídas.
- Use poucos emojis, apenas para pontuar.
- Responda em Português do Brasil.

Retorne APENAS um JSON no formato:
{
  "title": "Título estratégico e curto",
  "content": "A análise detalhada mas direta em um único parágrafo",
  "mood": "enthusiastic | strategic | alert"
}`;

    // 4. Call OpenAI
    const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openai_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await openAIRes.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // 5. Update Profile
    const finalSummary = {
      ...result,
      updated_at: new Date().toISOString()
    };

    await supabase.from('profiles').update({
      ai_summary: finalSummary
    }).eq('id', user_id);

    return new Response(JSON.stringify(finalSummary), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});