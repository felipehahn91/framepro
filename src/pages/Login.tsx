import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  // Se já estiver logado, redireciona para a página principal
  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">Frame Pro</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Faça login para gerenciar seu negócio</p>
        
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#fb923c',
                  brandAccent: '#f97316',
                }
              }
            },
            className: {
              button: 'rounded-lg font-medium',
              input: 'rounded-lg bg-gray-50 border-gray-200',
            }
          }}
          theme="light"
          providers={[]}
        />
      </div>
    </div>
  );
};

export default Login;