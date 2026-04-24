import https from 'https';

https.get('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/og-proxy?type=orcamento&id=test', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', data);
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
