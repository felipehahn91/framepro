import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Define quais páginas são do fluxo de pagamento
  const isPaymentPage = 
    location.pathname === '/precos' || 
    location.pathname === '/founders' || 
    location.pathname === '/billing-success' || 
    location.pathname === '/billing-cancel';

  // Se não for admin e não estiver na página de pagamento, verificamos a assinatura
  if (!isPaymentPage && profile?.role !== 'admin') {
    const isSubscribed = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
    const hasStripeId = !!profile?.stripe_customer_id;

    // Se o usuário não passou pelo Stripe ou não tem status ativo/trial, bloqueia.
    if (!hasStripeId || !isSubscribed) {
      // Se for um usuário Founder que ainda não pagou, manda para a página de Founders
      if (profile?.plan_type === 'founder') {
        return <Navigate to="/founders" replace />;
      }
      // Se for usuário comum, manda para a página de preços padrão
      return <Navigate to="/precos" replace />;
    }
  }

  return <>{children}</>;
};