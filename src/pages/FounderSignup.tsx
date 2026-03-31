import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Star, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import logoImg from "@/assets/logo.png";

export default function FounderSignup() {
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    if (session) navigate('/');
  }, [session, navigate]);

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
          }
        }
      });
      
      if (error) throw error;

      if (data?.user) {
        // Imediatamente após criar a conta, marcamos o perfil como 'founder'
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan_type: 'founder' })
          .eq('id', data.user.id);
          
        if (profileError) throw profileError;

        await refreshProfile();
        toast.success("Conta Founder criada com sucesso!");
        navigate('/'); // O ProtectedRoute vai redirecionar automaticamente para /founders
      }
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao criar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 font-sans selection:bg-orange-500/30">
      <div className="w-full max-w-md bg-white text-gray-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        
        {/* Detalhe visual premium */}
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
          <p className="text-gray-500 text-sm font-medium">Garanta 30% de desconto vitalício na assinatura anual da plataforma.</p>
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
            <Input
              id="password"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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