
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    password: '',
    passwordConfirm: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await signup(
        formData.email,
        formData.password,
        formData.passwordConfirm,
        formData.name,
        formData.company
      );
      toast.success('Conta criada com sucesso');
      navigate('/dashboard');
    } catch (error) {
      if (error.message.includes('email')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastre-se - Frame Pro</title>
        <meta name="description" content="Crie sua conta Frame Pro e comece seu teste grátis de 30 dias" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">F</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Crie sua conta</CardTitle>
            <CardDescription className="text-center">
              Comece seu teste grátis de 30 dias. Sem cartão de crédito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="João Silva"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  name="company"
                  type="text"
                  placeholder="Nome da sua empresa"
                  value={formData.company}
                  onChange={handleChange}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirmar senha</Label>
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  required
                  className="text-foreground"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Criando conta...' : 'Criar conta grátis'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                Faça login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SignupPage;
