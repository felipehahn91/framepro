import React, { useState } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Check, Loader2, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

export default function FounderPack() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const logoImg = "/logo.png";

  import { toast } from 'sonner';

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ planType: 'founder' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar checkout na Stripe.");
      }
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Não foi possível iniciar o pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-orange-500/30">
      <div className="max-w-4xl mx-auto py-20 px-6">
        <div className="flex justify-center mb-12">
          <img src={logoImg} alt="Frame Pro" className="h-12 brightness-0 invert opacity-80" />
        </div>

        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-orange-500/30">
            <Star className="w-3.5 h-3.5 fill-current" /> Acesso Founder Ativo
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Seja um dos fundadores da <span className="text-orange-500">Frame Pro.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
            Você foi selecionado para entrar na primeira turma com um desconto vitalício de 30% em relação ao plano anual comum.
          </p>
        </div>

        <div className="bg-white rounded-[40px] p-8 md:p-12 text-gray-900 shadow-2xl relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-black mb-6">O que você ganha como Founder:</h3>
              <ul className="space-y-5">
                {[
                  "Plataforma completa vitalícia",
                  "Selo 'Founder' no seu perfil",
                  "Acesso antecipado a novas funções",
                  "Grupo exclusivo no WhatsApp",
                  "Desconto vitalício de 30%",
                  "Treinamento individual (1h)"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-gray-700 font-bold">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Assinatura Anual</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black tracking-tight">R$ 804</span>
                <span className="text-gray-400 font-bold">/ano</span>
              </div>
              <p className="text-orange-600 font-bold text-sm mb-8">Pague em até 10x de R$ 80,40 no cartão</p>
              
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full py-5 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                GARANTIR MINHA VAGA
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mt-12 text-gray-500 text-sm font-medium">
          Dúvidas? Fale com nosso suporte via chat. <br/>
          Pagamento processado com segurança pelo Stripe.
        </p>
      </div>
    </div>
  );
}