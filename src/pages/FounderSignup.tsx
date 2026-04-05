import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/PasswordInput';
import { Loader2, Star, ShieldCheck, MailCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function FounderSignup() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const logoImg = "/logo.webp";
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

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
            plan_type: 'founder'
          }
        }
      });
      
      if (error) throw error;

      if (data?.user && !data.session) {
        setIsRegistered(true);
        toast.success("Conta criada! Confirme seu e-mail.");
      } else if (data?.session) {
        await refreshProfile();
        toast.success("Conta Founder criada com sucesso!");
        navigate('/founders');
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao criar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 font-sans py-10">
        <div className="w-full max-w-md bg-white text-gray-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center border-4 border-orange-100">
              <MailCheck className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black mb-4">Verifique seu e-mail</h2>
          <p className="text-gray-600 mb-6 font-medium">
            Enviamos um link de confirmação para <strong className="text-gray-900">{email}</strong>.
            Por favor, clique no link para ativar sua conta Founder e prosseguir para o pagamento.
          </p>
          <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-sm font-semibold border border-orange-100 mb-6">
            Não encontrou o e-mail? Verifique sua pasta de Spam ou Lixo Eletrônico.
          </div>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-6 rounded-xl shadow-lg transition-all"
          >
            Ir para a página de Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 font-sans selection:bg-orange-500/30 py-10">
      <div className="w-full max-w-md bg-white text-gray-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-10 -mr-10 -mt-10 pointer-events-none"></div>

        <div className="flex justify-center mb-6">
          <img src={logoImg} alt="Frame Pro" className="h-10 w-auto object-contain" />
        </div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <Star className="w-3.5 h-3.5 fill-current" />
            Convite VIP Founder
          </div>
          <h1 className="text-2xl font-black mb-2">Crie sua conta Founder</h1>
          <p className="text-gray-500 text-sm font-medium">Garanta o plano especial Founder Pack no momento do cadastro.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 relative z-10">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="font-bold text-gray-700">Seu Nome</Label>
            <Input
              id="firstName"
              placeholder="Ex: João Silva"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="bg-gray-50 border-gray-200 focus:ring-orange-400 h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="font-bold text-gray-700">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={handlePhoneChange}
              required
              maxLength={15}
              className="bg-gray-50 border-gray-200 focus:ring-orange-400 h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold text-gray-700">Seu Melhor Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-gray-50 border-gray-200 focus:ring-orange-400 h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="font-bold text-gray-700">Crie uma Senha</Label>
            <PasswordInput
              id="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              showStrength={true}
              className="bg-gray-50 border-gray-200 focus:ring-orange-400 h-12 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gray-900 hover:bg-black text-white mt-4 font-black py-6 rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            GARANTIR MINHA VAGA
          </Button>
        </form>

        <div className="mt-8 text-center text-xs font-semibold">
          <span className="text-gray-400">Já garantiu sua vaga?</span>{' '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 transition-colors">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}