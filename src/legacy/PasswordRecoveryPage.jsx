
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const PasswordRecoveryPage = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestPasswordReset(email);
      setEmailSent(true);
      toast.success('Email de recuperação enviado');
    } catch (error) {
      toast.error('Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Recuperar senha - Frame Pro</title>
        <meta name="description" content="Recupere sua senha do Frame Pro" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">F</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Recuperar senha</CardTitle>
            <CardDescription className="text-center">
              {emailSent
                ? 'Enviamos um link de recuperação para seu email'
                : 'Digite seu email para receber o link de recuperação'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-foreground"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para login
                  </Link>
                </Button>
              </div>
            )}

            {!emailSent && (
              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para login
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PasswordRecoveryPage;
