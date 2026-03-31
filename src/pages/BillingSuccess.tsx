import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function BillingSuccess() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let interval: NodeJS.Timeout;
    let attempts = 0;

    const checkSubscriptionStatus = async () => {
      attempts++;
      
      // Busca diretamente no banco para ter o dado mais fresco e ignorar o cache
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        if (data.subscription_status === 'active' || data.subscription_status === 'trialing') {
          // O Webhook do Stripe confirmou o pagamento no banco de dados!
          await refreshProfile(); // Atualiza a permissão global do usuário
          setLoading(false);
          clearInterval(interval);
          return;
        }
      }

      // Fallback: Se demorar mais de 10 tentativas (20 segundos), 
      // libera a tela para não travar o usuário indefinidamente (pode ser só um atraso na rede).
      if (attempts >= 10) {
        await refreshProfile();
        setLoading(false);
        clearInterval(interval);
      }
    };

    // Primeira checagem imediata
    checkSubscriptionStatus();

    // Começa a verificar a cada 2 segundos até o Stripe confirmar
    interval = setInterval(checkSubscriptionStatus, 2000);

    return () => clearInterval(interval);
  }, [user, refreshProfile]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in-95 duration-500">
        {loading ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-12 h-12 text-orange-400 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Validando pagamento...</h2>
            <p className="text-gray-500 mt-2">Aguarde um momento enquanto o banco confirma sua transação.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Tudo Certo!</h2>
            <p className="text-gray-500 mb-8">Sua assinatura foi ativada com sucesso. Bem-vindo à Frame Pro!</p>
            
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              ACESSAR MEU CRM <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}