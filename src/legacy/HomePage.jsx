
import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Target, Users, TrendingUp, Calendar, CheckCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const features = [
    {
      icon: Target,
      title: 'Pipeline visual de vendas',
      description: 'Gerencie suas oportunidades com quadros Kanban personalizáveis e arraste cards entre etapas.'
    },
    {
      icon: Users,
      title: 'Gestão completa de clientes',
      description: 'Centralize informações, histórico de interações e documentos de todos os seus clientes.'
    },
    {
      icon: TrendingUp,
      title: 'Análise financeira em tempo real',
      description: 'Acompanhe receitas, contratos ativos e pagamentos pendentes com dashboards intuitivos.'
    },
    {
      icon: Calendar,
      title: 'Agenda e tarefas integradas',
      description: 'Organize compromissos, defina prioridades e nunca perca um follow-up importante.'
    },
  ];

  return (
    <>
      <Helmet>
        <title>Frame Pro - CRM completo para gestão de vendas</title>
        <meta name="description" content="Gerencie vendas, clientes e oportunidades com o Frame Pro. Pipeline visual, análise financeira e automação de processos. Teste grátis por 30 dias." />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />

        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background"></div>
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ letterSpacing: '-0.02em' }}>
                Transforme leads em clientes com o CRM mais completo
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl mx-auto">
                Gerencie todo o ciclo de vendas em uma única plataforma. Pipeline visual, automação de tarefas e análise financeira integrada.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-base">
                  <Link to="/signup">Cadastre-se grátis 30 dias</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa para vender mais</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Recursos pensados para equipes de vendas que querem resultados reais
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Comece agora, sem compromisso</h2>
                <p className="text-lg text-muted-foreground">
                  Teste todas as funcionalidades por 30 dias. Sem cartão de crédito.
                </p>
              </div>

              <Card className="shadow-xl">
                <CardContent className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                        Teste grátis
                      </div>
                      <h3 className="text-3xl font-bold mb-4">R$ 0</h3>
                      <p className="text-muted-foreground mb-6">
                        Primeiros 30 dias gratuitos. Depois, apenas R$ 97/mês por usuário.
                      </p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>Pipeline ilimitado de oportunidades</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>Gestão completa de clientes e contratos</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>Relatórios financeiros em tempo real</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>Suporte prioritário via chat</span>
                        </li>
                      </ul>
                      <Button asChild size="lg" className="w-full">
                        <Link to="/signup">Começar teste grátis</Link>
                      </Button>
                    </div>

                    <div className="bg-muted/50 rounded-2xl p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Configuração rápida</p>
                            <p className="text-sm text-muted-foreground">Comece a usar em menos de 5 minutos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Equipe ilimitada</p>
                            <p className="text-sm text-muted-foreground">Adicione quantos usuários precisar</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Sem fidelidade</p>
                            <p className="text-sm text-muted-foreground">Cancele quando quiser, sem multas</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default HomePage;
