import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/PasswordInput';
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Signup = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const logoImg = "/logo.webp";
  
  const [isRegistered, setIsRegistered] = useState(false);
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
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

      if (data?.user && !data.session) {
        setIsRegistered(true);
        toast.success("Conta criada! Confirme seu e-mail.");
      } else if (data?.session) {
        toast.success("Conta criada com sucesso!");
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro durante o cadastro");
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl relative overflow-hidden text-center animate-in zoom-in-95 duration-300 border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-4 border-orange-100">
              <MailCheck className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verifique seu e-mail</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            Enviamos um link de confirmação para <strong className="text-gray-900">{email}</strong>.
            Por favor, clique no link para ativar sua conta e acessar a plataforma.
          </p>
          <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-xs font-semibold border border-orange-100 mb-8">
            Não encontrou o e-mail? Verifique sua pasta de Spam ou Lixo Eletrônico.
          </div>
          <Button
            asChild
            className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-6 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Link to="/login">Ir para a página de Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100 my-8 animate-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-8">
          <img src={logoImg} alt="Frame Pro" className="h-12 w-auto object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">Crie sua conta</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Preencha os dados abaixo para começar</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              placeholder="Seu nome completo"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
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
              required
              maxLength={15}
            />
          </div>

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
              showStrength={true}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-orange-400 hover:bg-orange-500 text-white mt-2 font-bold py-6 rounded-xl shadow-md"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Criar minha Conta
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">Já tem uma conta?</span>{' '}
          <Link
            to="/login"
            className="text-orange-500 font-bold hover:underline"
          >
            Faça login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;