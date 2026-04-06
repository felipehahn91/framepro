import React, { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Loader2, Zap, Star, X, ShieldCheck, Building2, ArrowRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Pricing() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  useEffect(() => {
    if (user?.email) {
      supabase.from('company_invites').select('*, companies(name)').eq('email', user.email)
        .then(({ data }) => {
          if (data) setPendingInvites(data);
        });
    }
  }, [user]);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase.rpc('accept_company_invite', { invite_id: inviteId });
      if (error) throw error;
      toast.success('Convite aceito com sucesso!');
      await refreshProfile();
      navigate('/');
    } catch (e) {
      toast.error('Erro ao aceitar convite.');
    }
  };

  const handleSubscribe = async (plan: string) => {
    setLoading(true);
    setLoadingPlan(plan);
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
      setLoadingPlan(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 pb-32">
        
        {pendingInvites.length > 0 && (
          <div className="max-w-3xl mx-auto mb-12 bg-blue-50 border border-blue-200 rounded-3xl p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Você tem convites pendentes!</h3>
                <p className="text-sm text-blue-700 font-medium mt-1">Aceite um convite para pular a assinatura e acessar o CRM da sua equipe.</p>
              </div>
            </div>
            <div className="space-y-3">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-2xl border border-blue-100 shadow-sm gap-4">
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{invite.companies?.name || 'Empresa'}</p>
                    <p className="text-sm text-gray-500 font-medium">Convite para {invite.role === 'admin' ? 'Administrador' : 'Membro'}</p>
                  </div>
                  <button 
                    onClick={() => handleAcceptInvite(invite.id)}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    Aceitar Convite <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Escolha o plano ideal para você</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">Comece hoje mesmo com 14 dias de teste gratuito e cancele quando quiser.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {/* STARTER */}
          <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow flex flex-col relative mt-4 lg:mt-8 mb-4 lg:mb-0">
            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-wide">Starter</h3>
            <p className="text-gray-500 text-sm mb-6 font-medium h-10">O essencial para organizar suas vendas e crescer.</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-black text-gray-900 tracking-tight">R$ 97</span>
              <span className="text-gray-500 font-bold">/mês</span>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {[
                "14 dias de teste GRÁTIS",
                "Gestão ilimitada de clientes (CRM)",
                "Propostas e Orçamentos",
                "Contratos com assinatura digital",
                "Gestão Financeira Básica",
                "Suporte por e-mail"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 font-semibold text-sm">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  {item}
                </li>
              ))}
              {[
                "Integração WhatsApp",
                "Sincronização com Google",
                "Boletos e Pix Automáticos",
                "Fluxos de Cadência"
              ].map((item, i) => (
                <li key={`x-${i}`} className="flex items-start gap-3 text-gray-400 font-medium text-sm opacity-60 line-through">
                  <div className="w-5 h-5 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3 h-3" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe('starter')}
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 mt-auto"
            >
              {loadingPlan === 'starter' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              ASSINAR STARTER
            </button>
          </div>

          {/* PLUS */}
          <div className="bg-gradient-to-b from-orange-50 to-white border-2 border-orange-400 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col transform lg:-translate-y-4">
            <div className="absolute top-0 right-0 bg-orange-500 text-white px-6 py-1.5 rounded-bl-2xl text-xs font-black uppercase tracking-widest shadow-sm">
              Mais Escolhido
            </div>
            
            <div className="flex items-center gap-2 mb-2 mt-2">
              <h3 className="text-2xl font-black text-orange-600 uppercase tracking-wide">Plus</h3>
              <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
            </div>
            
            <p className="text-gray-600 text-sm mb-6 font-medium h-10">Tudo do Starter + Automação total de comunicação e pagamentos.</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-black text-gray-900 tracking-tight">R$ 147</span>
              <span className="text-gray-500 font-bold">/mês</span>
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-start gap-3 text-gray-900 font-bold text-sm">
                <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                Tudo que está no plano Starter, mais:
              </li>
              {[
                "Integração WhatsApp (Evolution API)",
                "Sincronização Google Calendar",
                "Emissão de Boletos e Pix (PagHiper)",
                "Fluxo de Cadência Automático",
                "Mapa de Calor dos Orçamentos",
                "Suporte prioritário via WhatsApp"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-800 font-semibold text-sm">
                  <div className="w-5 h-5 bg-orange-200 text-orange-700 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe('plus')}
              disabled={loading}
              className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-[0_8px_30px_rgb(249,115,22,0.3)] hover:bg-orange-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mt-auto"
            >
              {loadingPlan === 'plus' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              TESTAR PLUS GRÁTIS
            </button>
          </div>

          {/* FOUNDER */}
          <div className="bg-gray-900 border-2 border-gray-800 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all flex flex-col relative text-white mt-4 lg:mt-8 mb-4 lg:mb-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
            
            <div className="absolute top-6 right-6 bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-gray-700 shadow-sm">
              VIP Anual
            </div>

            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Founder</h3>
            <p className="text-gray-400 text-sm mb-6 font-medium h-10">Desconto agressivo e benefícios vitalícios para os primeiros membros.</p>
            
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-5xl font-black text-white tracking-tight">R$ 67</span>
              <span className="text-gray-500 font-bold">/mês</span>
            </div>
            <p className="text-orange-400 text-[11px] font-black uppercase tracking-wider mb-8 bg-orange-400/10 inline-block px-2 py-1 rounded-md border border-orange-500/20">
              Pagamento único de R$ 804 / 1 ano
            </p>

            <ul className="space-y-4 mb-10 flex-1 relative z-10">
              <li className="flex items-start gap-3 text-white font-bold text-sm">
                <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                Tudo que está no plano Plus, mais:
              </li>
              {[
                "Mais de 50% de desconto no ano",
                "Desconto vitalício garantido na renovação",
                "Selo 'Founder' no seu perfil",
                "Grupo exclusivo de networking",
                "Treinamento de Onboarding VIP (1h)"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 font-semibold text-sm">
                  <div className="w-5 h-5 bg-gray-800 text-orange-400 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => handleSubscribe('founder')}
              disabled={loading}
              className="w-full py-4 bg-white text-gray-900 font-black rounded-2xl shadow-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2 mt-auto relative z-10"
            >
              {loadingPlan === 'founder' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              ASSINAR FOUNDER
            </button>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Pagamento seguro via Stripe • Cancele a qualquer momento</p>
        </div>
      </div>
    </Layout>
  );
}