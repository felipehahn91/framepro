import React, { useState } from 'react';
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Loader2, CreditCard, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

export default function Pricing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (plan: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ planType: plan })
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Escolha seu plano</h1>
          <p className="text-lg text-gray-500">Comece hoje com 30 dias de teste gratuito.</p>
        </div>

        <div className="grid md:grid-cols-1 gap-8 max-w-lg mx-auto">
          <div className="bg-white border-2 border-orange-100 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase">Popular</div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Plano Mensal</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black text-gray-900 tracking-tight">R$ 97</span>
              <span className="text-gray-500 font-bold">/mês</span>
            </div>

            <ul className="space-y-4 mb-10">
              {[
                "30 dias de teste GRÁTIS",
                "Gestão ilimitada de clientes",
                "Contratos com assinatura digital",
                "Integração WhatsApp",
                "Agenda Inteligente",
                "Suporte prioritário"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-600 font-medium">
                  <div className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe('monthly')}
              disabled={loading}
              className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              INICIAR MEU TESTE GRÁTIS
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">Cancele a qualquer momento sem custos</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}