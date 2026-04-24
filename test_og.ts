import { createClient } from '@supabase/supabase-js';

const url = "https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/og-proxy?type=orcamento&id=123";
fetch(url, {
  headers: {
    "User-Agent": "WhatsApp/2.21.12.21 A"
  }
}).then(res => res.text()).then(console.log).catch(console.error);
