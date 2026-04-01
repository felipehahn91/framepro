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
  const [isRecovering, setIsRecovering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (session) navigate('/');
  }, [session, navigate]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    setPhone(value);
  };

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
              phone: phone,
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Preencha seu email para recuperar a senha.");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setIsRecovering(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao solicitar recuperação de senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100 my-8 animate-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-8">
          <img src={logoImg} alt="Frame Pro" className="h-12 w-auto object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {isRecovering ? 'Recuperar Senha' : isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          {isRecovering 
            ? 'Enviaremos um link para você redefinir sua senha' 
            : isLogin 
              ? 'Faça login para gerenciar seu negócio' 
              : 'Preencha os dados abaixo para começar'}
        </p>

        {isRecovering ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
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

            <Button 
              type="submit" 
              className="w-full bg-orange-400 hover:bg-orange-500 text-white mt-2 font-bold py-6 rounded-xl shadow-md"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Enviar Link de Recuperação
            </Button>

            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsRecovering(false)}
                className="text-gray-500 font-medium hover:text-gray-700 transition-colors"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    placeholder="Seu nome completo"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    required={!isLogin}
                    maxLength={15}
                  />
                </div>
              </>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => setIsRecovering(true)}
                    className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                showStrength={!isLogin}
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
        )}

        {!isRecovering && (
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
        )}
      </div>
    </div>
  );
};

export default Login;