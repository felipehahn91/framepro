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
    const { target_user_id } = await req.json();
    if (!target_user_id) throw new Error("Faltando ID do usuário alvo.");

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Não autorizado");

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // @ts-ignore
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // @ts-ignore
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 1. Cliente com o token JWT de quem fez a requisição para checar se ele é admin
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) throw new Error("Acesso negado");

    // 2. Cliente Admin (Service Role) para pular as regras RLS e contar os dados
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') throw new Error("Acesso restrito a administradores");

    // 3. Buscar as estatísticas exatas (apenas contagem para otimização)
    const [
      { count: leadsCount },
      { count: clientsCount },
      { count: contractsCount },
      { count: orcamentosCount }
    ] = await Promise.all([
      supabaseAdmin.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', target_user_id).eq('is_client', false),
      supabaseAdmin.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', target_user_id).eq('is_client', true),
      supabaseAdmin.from('contracts').select('id', { count: 'exact', head: true }).eq('user_id', target_user_id),
      supabaseAdmin.from('orcamentos').select('id', { count: 'exact', head: true }).eq('user_id', target_user_id)
    ]);

    return new Response(JSON.stringify({
      leads: leadsCount || 0,
      clients: clientsCount || 0,
      contracts: contractsCount || 0,
      orcamentos: orcamentosCount || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
});