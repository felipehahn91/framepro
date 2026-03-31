import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function BillingCancel() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isFounder = profile?.plan_type === 'founder';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-100">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Poxa, que pena!</h2>
          
          {isFounder ? (
            <p className="text-gray-500 mb-8 font-medium leading-relaxed">
              Sua assinatura Founder não foi concluída. Não perca a chance de fazer parte do grupo exclusivo com <strong className="text-gray-900">30% de desconto vitalício</strong> na plataforma.
            </p>
          ) : (
            <p className="text-gray-500 mb-8 font-medium leading-relaxed">
              O processo de assinatura não foi concluído. Tente novamente para garantir seu acesso completo e alavancar suas vendas com o Frame Pro.
            </p>
          )}
          
          <button 
            onClick={() => navigate(isFounder ? '/founders' : '/precos')}
            className="w-full py-4 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 mb-3"
          >
            <RefreshCcw className="w-4 h-4" /> TENTAR NOVAMENTE
          </button>

          <button 
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-white text-gray-500 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para o Login
          </button>
        </div>
      </div>
    </div>
  );
}