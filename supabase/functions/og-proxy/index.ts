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
    const url = new URL(req.url)
    const type = url.searchParams.get('type')
    const id = url.searchParams.get('id')

    if (!type || !id) {
      return new Response('Missing type or id', { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    let title = 'FramePro CRM'
    let description = 'Acesse este link para visualizar o conteúdo.'
    let image = ''

    if (type === 'orcamento') {
      const { data, error } = await supabase.rpc('get_public_orcamento', { p_token: id })
      if (!error && data) {
        const sections = data.sections || []
        const globalSec = sections.find((s: any) => s.type === 'global-settings')
        const globalSettings = globalSec?.styles || {}
        
        title = globalSettings.seoTitle || data.name || 'Proposta Comercial'
        description = globalSettings.seoDescription || 'Acesse este link para visualizar a proposta comercial.'
        image = globalSettings.seoImage || ''
      }
    } else if (type === 'contract') {
      const { data, error } = await supabase.rpc('get_public_contract', { p_token: id })
      if (!error && data) {
        title = data.seo_title || data.title || 'Contrato'
        description = data.seo_description || 'Acesse este link para visualizar o contrato.'
        image = data.seo_image || ''
      }
    } else if (type === 'link') {
      // Check if id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        const { data, error } = await supabase.rpc('get_public_link_form', { p_id: id })
        if (!error && data) {
          title = data.seo_title || data.name || 'Formulário de Contato'
          description = data.seo_description || 'Preencha os dados para solicitar um orçamento ou contato.'
          image = data.seo_image || ''
        }
      }
    }

    // Generate HTML with OpenGraph tags
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'framepro.com.br';
    const canonicalUrl = `https://${host}/${type === 'orcamento' ? 'orcamento' : type === 'contract' ? 'contract' : 'link'}/${id}`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <meta name="description" content="${description}">
        
        <!-- Open Graph / Facebook / WhatsApp -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${canonicalUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        ${image ? `<meta property="og:image" content="${image}">` : ''}
        
        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${canonicalUrl}">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        ${image ? `<meta property="twitter:image" content="${image}">` : ''}
      </head>
      <body>
        <p>Redirecionando...</p>
        <script>
          // Fallback redirect if a real browser hits this page
          window.location.href = "/${type === 'orcamento' ? 'orcamento' : type === 'contract' ? 'contract' : 'link'}/${id}?bot=false";
        </script>
      </body>
      </html>
    `

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
