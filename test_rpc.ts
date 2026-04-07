import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wsytmrzgvkvbufpqqxwi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzeXRtcnpndmt2YnVmcHFxeHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDE5OTMsImV4cCI6MjA5MDQ3Nzk5M30.HtuaCGLFiQ7hvpLpaS0RC3YPk5O4Lnft5cmY2XVpgtw";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase.rpc('get_public_contract', { p_token: '67036537-27d3-4f7b-819f-718e3b0174b4' });
  console.log("Data:", data);
  console.log("Error:", error);
}

test();