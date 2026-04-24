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

  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const id = url.searchParams.get('id')
  const userAgent = req.headers.get('user-agent') || ''

  console.log(`[og-proxy] Request: type=${type}, id=${id}, UA=${userAgent}`)

  try {
    if (!type || !id) {
      return new Response('Missing type or id', { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    let title = 'Frame Pro | O CRM Definitivo para Fotógrafos'
    let description = 'O sistema de gestão completo para fotógrafos de casamento e eventos.'
    let image = 'https://app.framepro.click/pwa-icon.png'

    if (type === 'orcamento') {
      const { data, error } = await supabase.rpc('get_public_orcamento', { p_token: id })
      if (error) {
        console.error(`[og-proxy] RPC Error (orcamento):`, error)
        title = `Erro ao carregar orçamento`
      } else if (data) {
        const sections = data.sections || []
        const globalSec = sections.find((s: any) => s.type === 'global-settings')
        const globalSettings = globalSec?.styles || {}
        
        title = globalSettings.seoTitle || data.name || title
        description = globalSettings.seoDescription || 'Acesse este link para visualizar a proposta comercial.'
        if (globalSettings.seoImage) image = globalSettings.seoImage
      }
    } else if (type === 'contract') {
      const { data, error } = await supabase.rpc('get_public_contract', { p_token: id })
      if (error) {
        console.error(`[og-proxy] RPC Error (contract):`, error)
        title = `Erro ao carregar contrato`
      } else if (data) {
        title = data.seo_title || data.title || 'Contrato'
        description = data.seo_description || 'Acesse este link para visualizar o contrato.'
        if (data.seo_image) image = data.seo_image
      }
    } else if (type === 'link') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        const { data, error } = await supabase.rpc('get_public_link_form', { p_id: id })
        if (error) {
          console.error(`[og-proxy] RPC Error (link):`, error)
          title = `Erro ao carregar formulário`
        } else if (data) {
          title = data.seo_title || data.name || 'Formulário de Contato'
          description = data.seo_description || 'Preencha os dados para solicitar um orçamento ou contato.'
          if (data.seo_image) image = data.seo_image
        }
      }
    }

    // Generate HTML with robust OpenGraph tags
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'app.framepro.click';
    const path = type === 'orcamento' ? 'orcamentos/public' : type === 'contract' ? 'contratos/public' : 'link-form';
    const canonicalUrl = `https://${host}/${path}/${id}`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Frame Pro CRM">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">

  <meta name="robots" content="noindex">
</head>
<body>
  <p>Redirecionando...</p>
  <script>
    window.location.href = "${canonicalUrl}${canonicalUrl.includes('?') ? '&' : '?'}bot=false";
  </script>
</body>
</html>
    `.trim()

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60' 
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
