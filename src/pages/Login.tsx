import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/PasswordInput';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logoImg from "@/assets/logo.png";

const Login = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');

  // Se já estiver logado, redireciona
  useEffect(() => {
    if (session) navigate('/');
  }, [session, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
            }
          }
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email ou faça login.");
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro durante a autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-center mb-8">
          <img src={logoImg} alt="Frame Pro" className="h-12 w-auto object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          {isLogin ? 'Faça login para gerenciar seu negócio' : 'Preencha os dados abaixo para começar'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                placeholder="Seu nome"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              showStrength={!isLogin} // Só exibe força de senha no cadastro
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-orange-400 hover:bg-orange-500 text-white mt-2 font-bold py-6 rounded-xl shadow-md"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isLogin ? 'Entrar na Plataforma' : 'Criar minha Conta'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          </span>{' '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-orange-500 font-bold hover:underline"
          >
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;