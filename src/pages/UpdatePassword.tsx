import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/PasswordInput';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const logoImg = "/logo.png";

  useEffect(() => {
    // O Supabase Auth lida com o token automaticamente no cliente
    // Apenas verificamos se há uma sessão.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Sessão de recuperação inválida ou expirada.');
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast.success("Senha atualizada com sucesso!");
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar a senha.");
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
          Redefinir Senha
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Digite a sua nova senha abaixo.
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              showStrength={true}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-orange-400 hover:bg-orange-500 text-white mt-4 font-bold py-6 rounded-xl shadow-md"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Nova Senha
          </Button>
        </form>
      </div>
    </div>
  );
}