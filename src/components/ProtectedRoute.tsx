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

  const isPaymentPage = 
    location.pathname === '/precos' || 
    location.pathname === '/founders' || 
    location.pathname === '/billing-success' || 
    location.pathname === '/billing-cancel';

  if (!isPaymentPage && profile?.role !== 'admin') {
    const isSubscribed = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
    const isCompanyMember = !!profile?.company_id && profile?.company_role === 'member';

    if (isCompanyMember) {
      // Membros herdam o status da empresa. Só bloqueia se a empresa estiver inativa.
      if (!isSubscribed) {
        return <Navigate to="/precos" replace />;
      }
    } else {
      // Donos de empresa ou usuários individuais precisam ter status ativo
      // (Se o admin ativou manualmente, o usuário pode não ter Stripe ID, então confiamos no status)
      if (!isSubscribed) {
        if (profile?.plan_type === 'founder') {
          return <Navigate to="/founders" replace />;
        }
        return <Navigate to="/precos" replace />;
      }
    }
  }

  return <>{children}</>;
};