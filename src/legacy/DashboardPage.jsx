
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbaseClient';
import { pbFetch } from '@/lib/pbFetch';
import { useCache } from '@/contexts/CacheContext';
import ErrorFallback from '@/components/ErrorFallback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Users, Target, FileText, DollarSign, Pencil, Check, X, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState(0);

  const isMounted = useRef(true);
  const subsInitialized = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { data, isLoading, error, refetch } = useCache('dashboard_stats', async () => {
    const [clientsRes, opportunitiesRes, contractsRes, transactionsRes, settingsRes, tasksRes] = await Promise.all([
      pbFetch(() => pb.collection('clients').getList(1, 1, { filter: `userId = "${currentUser.id}"`, $autoCancel: false }), 'Fetch Clients Count'),
      pbFetch(() => pb.collection('opportunities').getList(1, 500, { filter: `userId = "${currentUser.id}"`, $autoCancel: false }), 'Fetch Opportunities'),
      pbFetch(() => pb.collection('contracts').getList(1, 1, { filter: `userId = "${currentUser.id}" && status = "Ativo"`, $autoCancel: false }), 'Fetch Active Contracts Count'),
      pbFetch(() => pb.collection('transactions').getList(1, 1000, { filter: `userId = "${currentUser.id}"`, $autoCancel: false }), 'Fetch Transactions'),
      pbFetch(() => pb.collection('dashboard_settings').getList(1, 1, { filter: `userId = "${currentUser.id}"`, $autoCancel: false }), 'Fetch Settings'),
      pbFetch(() => pb.collection('tasks').getList(1, 5, { filter: `userId = "${currentUser.id}"`, sort: '-created', $autoCancel: false }), 'Fetch Recent Tasks'),
    ]);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let monthRevenue = 0;
    let totalFaturamento = 0;
    let pendenteFaturamento = 0;
    let atrasadoFaturamento = 0;

    transactionsRes.items.forEach(t => {
      if (t.isInstallment && t.installments) {
        t.installments.forEach(inst => {
          if (inst.status === 'Pago') {
            totalFaturamento += inst.amount;
            const d = new Date(inst.paidDate || inst.dueDate);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
              monthRevenue += inst.amount;
            }
          } else {
            if (new Date(inst.dueDate) < new Date(new Date().setHours(0,0,0,0))) {
              atrasadoFaturamento += inst.amount;
            } else {
              pendenteFaturamento += inst.amount;
            }
          }
        });
      } else {
        if (t.status === 'Recebido') {
          totalFaturamento += t.amount;
          const d = new Date(t.date);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            monthRevenue += t.amount;
          }
        } else if (t.status === 'Atrasado' || (t.status === 'Pendente' && new Date(t.date) < new Date(new Date().setHours(0,0,0,0)))) {
          atrasadoFaturamento += t.amount;
        } else {
          pendenteFaturamento += t.amount;
        }
      }
    });

    const metrics = {
      totalClients: clientsRes.totalItems,
      openOpportunities: opportunitiesRes.items.filter(o => o.status !== 'Fechado').length,
      activeContracts: contractsRes.totalItems,
      monthRevenue,
      totalFaturamento,
      pendenteFaturamento,
      atrasadoFaturamento
    };

    const statusCounts = opportunitiesRes.items.reduce((acc, opp) => {
      const status = opp.status || 'Sem status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const pipelineData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const recentActivities = tasksRes.items.map(task => ({
      id: task.id,
      title: task.title,
      type: 'Tarefa',
      date: new Date(task.created).toLocaleDateString('pt-BR'),
      status: task.status,
    }));

    const target = settingsRes.items.length > 0 ? (settingsRes.items[0].monthlyTarget || 0) : 0;

    return { metrics, pipelineData, recentActivities, monthlyTarget: target };
  }, { dependencies: [currentUser?.id] });

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    if (!currentUser?.id || !pb.authStore.isValid) return;
    if (subsInitialized.current) return;

    let isSubscribed = true;
    const collectionsToWatch = ['clients', 'opportunities', 'contracts', 'transactions', 'tasks', 'dashboard_settings'];

    const setupSubscriptions = async () => {
      try {
        for (const col of collectionsToWatch) {
          await pb.collection(col).unsubscribe('*').catch(() => {});
        }
        
        if (!isSubscribed) return;

        const handleRealtimeUpdate = (e) => {
          if (!isMounted.current) return;
          if (e.record.userId === currentUser.id) {
            refetchRef.current();
          }
        };

        for (const col of collectionsToWatch) {
          await pb.collection(col).subscribe('*', handleRealtimeUpdate).catch(() => {});
        }

        subsInitialized.current = true;
      } catch (error) {
        if (isSubscribed) console.error('Failed to initialize dashboard subscriptions:', error);
      }
    };

    setupSubscriptions();

    return () => {
      isSubscribed = false;
      subsInitialized.current = false;
      if (pb.authStore.isValid) {
        collectionsToWatch.forEach(col => {
          pb.collection(col).unsubscribe('*').catch(() => {});
        });
      }
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (data?.monthlyTarget !== undefined) {
      setMonthlyTarget(data.monthlyTarget);
      setTargetInput(data.monthlyTarget.toString());
    }
  }, [data?.monthlyTarget]);

  const handleSaveTarget = async () => {
    try {
      const targetValue = parseFloat(targetInput) || 0;
      const settingsRes = await pbFetch(() => pb.collection('dashboard_settings').getList(1, 1, {
        filter: `userId = "${currentUser.id}"`,
        $autoCancel: false
      }), 'Check Settings');

      if (settingsRes.items.length > 0) {
        await pbFetch(() => pb.collection('dashboard_settings').update(settingsRes.items[0].id, {
          monthlyTarget: targetValue,
        }, { $autoCancel: false }), 'Update Target');
      } else {
        await pbFetch(() => pb.collection('dashboard_settings').create({
          userId: currentUser.id,
          monthlyTarget: targetValue,
        }, { $autoCancel: false }), 'Create Target');
      }

      setMonthlyTarget(targetValue);
      setEditingTarget(false);
      refetch();
      toast.success('Meta atualizada com sucesso');
    } catch (err) {
      toast.error('Erro ao salvar meta');
    }
  };

  const metrics = data?.metrics || { totalClients: 0, openOpportunities: 0, activeContracts: 0, monthRevenue: 0, totalFaturamento: 0, pendenteFaturamento: 0, atrasadoFaturamento: 0 };
  const pipelineData = data?.pipelineData || [];
  const recentActivities = data?.recentActivities || [];

  const COLORS = ['#FF8C00', '#FFA500', '#FFB84D', '#FFC966'];
  const targetPercentage = monthlyTarget > 0 ? Math.min(100, Math.round((metrics.monthRevenue / monthlyTarget) * 100)) : 0;

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
                  <CardContent><Skeleton className="h-8 w-16" /></CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <ErrorFallback message={error.message || 'Erro ao carregar dashboard'} onRetry={refetch} />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - Frame Pro</title>
        <meta name="description" content="Visão geral do seu CRM" />
      </Helmet>

      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Visão geral do seu negócio</p>
              </div>

              <Card className="relative overflow-hidden border-none shadow-lg bg-orange-fade">
                <CardHeader className="relative z-10 pb-2">
                  <CardTitle className="flex items-center justify-between text-lg font-medium text-black">
                    <span>Meta de Faturamento Mensal</span>
                    {!editingTarget && (
                      <Button variant="ghost" size="sm" className="hover:bg-black/10 text-black" onClick={() => { setEditingTarget(true); setTargetInput(monthlyTarget.toString()); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  {editingTarget ? (
                    <div className="flex gap-2 max-w-xs">
                      <Input type="number" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} placeholder="Digite a meta" className="bg-white text-black" />
                      <Button onClick={handleSaveTarget} size="icon" className="bg-black text-white hover:bg-black/80"><Check className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" onClick={() => setEditingTarget(false)} className="bg-transparent text-black border-black/30 hover:bg-black/10"><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-4">
                        <p className="text-4xl md:text-5xl font-bold tracking-tight text-black">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyTarget)}
                        </p>
                        <span className="text-lg font-medium text-black/80">{targetPercentage}% alcançado</span>
                      </div>
                      <div className="mt-4 h-2 w-full bg-black/10 rounded-full overflow-hidden">
                        <div className="h-full bg-black transition-all duration-500 ease-out" style={{ width: `${targetPercentage}%` }} />
                      </div>
                      <p className="text-sm text-black/70 mt-2 font-medium">
                        Realizado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.monthRevenue)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-card border-border/50 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Total</CardTitle>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalFaturamento)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Pendente</CardTitle>
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.pendenteFaturamento)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Atrasado</CardTitle>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.atrasadoFaturamento)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total de clientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{metrics.totalClients}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Oportunidades abertas</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{metrics.openOpportunities}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Contratos ativos</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{metrics.activeContracts}</div></CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline de oportunidades</CardTitle>
                    <CardDescription>Distribuição por status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pipelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pipelineData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {pipelineData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhuma oportunidade cadastrada</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Atividades recentes</CardTitle>
                    <CardDescription>Últimas tarefas criadas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentActivities.length > 0 ? (
                      <div className="space-y-4">
                        {recentActivities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                            <div className="flex-1">
                              <p className="font-medium">{activity.title}</p>
                              <p className="text-sm text-muted-foreground">{activity.type} • {activity.date}</p>
                            </div>
                            <span className="text-xs bg-muted px-2 py-1 rounded">{activity.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhuma atividade recente</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
