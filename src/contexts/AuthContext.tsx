import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserProfile = {
  id: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  role: string;
  avatar_url?: string;
  subscription_status?: string;
  stripe_customer_id?: string;
  plan_type?: string;
  company_id?: string;
  company_role?: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      if (data) {
        // Se for membro de uma empresa, herda o plano e status do administrador
        if (data.company_id && data.company_role === 'member') {
          const { data: adminData } = await supabase
            .from('profiles')
            .select('plan_type, subscription_status')
            .eq('company_id', data.company_id)
            .eq('company_role', 'admin')
            .single();
            
          if (adminData) {
            data.plan_type = adminData.plan_type;
            data.subscription_status = adminData.subscription_status;
          }
        }
        setProfile(data);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Apenas seta loading como true se ainda não tivermos o perfil carregado.
          // Isso evita que a página inteira "pisque" e recarregue ao mudar de aba (TOKEN_REFRESHED).
          setProfile((prev) => {
            if (!prev) setLoading(true);
            return prev;
          });
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);