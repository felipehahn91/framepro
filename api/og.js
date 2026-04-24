export default function handler(req, res) {
  const { type, id } = req.query;
  const userAgent = req.headers['user-agent'] || '';
  
  console.log(`[api/og] Request received: type=${type}, id=${id}, UA=${userAgent}`);
  
  // Redirect to the Supabase Edge Function
  const edgeUrl = `https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/og-proxy?type=${type}&id=${id}`;
  
  // Fetch the HTML from the Edge Function and return it
  fetch(edgeUrl, {
    headers: {
      'user-agent': userAgent,
      'x-forwarded-host': req.headers.host || 'app.framepro.click'
    }
  })
  .then(response => response.text())
  .then(html => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).send(html);
  })
  .catch(error => {
    console.error(`[api/og] Error fetching from Edge Function:`, error);
    res.status(500).send('Internal Server Error');
  });
}
