
import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useCache } from '@/contexts/CacheContext';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, Wallet, Calendar as CalendarIcon, CheckCircle2, Clock, Filter, Plus, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

const FinanceiroPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('faturamento');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    status: 'Pendente',
    clientId: 'none',
    installmentCount: '1'
  });

  const [period, setPeriod] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const { data, isLoading, refetch } = useCache('transactions_list_full', async () => {
    const [transactionsData, clientsData] = await Promise.all([
      pb.collection('transactions').getFullList({
        filter: `userId = "${currentUser.id}"`,
        sort: '-date',
        expand: 'clientId',
        $autoCancel: false
      }),
      pb.collection('clients').getFullList({
        filter: `userId = "${currentUser.id}"`,
        $autoCancel: false
      })
    ]);
    return { transactionsData, clientsData };
  }, { dependencies: [currentUser?.id] });

  const transactions = data?.transactionsData || [];
  const clients = data?.clientsData || [];

  // --- Form Handling ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description || !formData.amount || !formData.date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    setIsSubmitting(true);

    try {
      const count = parseInt(formData.installmentCount, 10);
      const isInstallment = count > 1;
      
      let installments = [];
      // Ensure status is valid according to schema ['Pendente', 'Recebido', 'Cancelado']
      let initialStatus = formData.status;
      if (initialStatus === 'Atrasado') initialStatus = 'Pendente';

      if (isInstallment && !editingTransaction) {
        const baseAmount = Math.floor((amount / count) * 100) / 100;
        const remainder = amount - (baseAmount * count);
        
        for (let i = 0; i < count; i++) {
          const d = new Date(formData.date);
          d.setMonth(d.getMonth() + i);
          
          installments.push({
            id: `inst_${i + 1}`,
            number: i + 1,
            dueDate: d.toISOString(),
            amount: i === count - 1 ? Number((baseAmount + remainder).toFixed(2)) : baseAmount,
            status: 'Pendente',
            paidDate: null
          });
        }
        initialStatus = 'Pendente';
      }

      const payload = {
        date: formData.date,
        description: formData.description,
        amount: amount,
        status: editingTransaction ? initialStatus : initialStatus,
        userId: currentUser.id,
        clientId: formData.clientId === 'none' ? "" : formData.clientId,
      };

      if (!editingTransaction) {
        payload.isInstallment = isInstallment;
        payload.installmentCount = count;
        payload.originalAmount = amount;
        payload.installments = installments;
      }

      if (editingTransaction) {
        await pb.collection('transactions').update(editingTransaction.id, payload, { $autoCancel: false });
        toast.success('Recebimento atualizado');
      } else {
        await pb.collection('transactions').create(payload, { $autoCancel: false });
        toast.success(isInstallment ? 'Recebimento com parcelas criado com sucesso' : 'Recebimento criado com sucesso');
      }

      setIsDialogOpen(false);
      await refetch();
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar recebimento. Verifique os dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      date: transaction.date.split('T')[0],
      description: transaction.description,
      amount: transaction.amount.toString(),
      status: transaction.status,
      clientId: transaction.clientId || 'none',
      installmentCount: transaction.installmentCount?.toString() || '1'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este recebimento?')) return;
    try {
      await pb.collection('transactions').delete(id, { $autoCancel: false });
      toast.success('Recebimento excluído');
      refetch();
    } catch (error) {
      toast.error('Erro ao excluir recebimento');
    }
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      status: 'Pendente',
      clientId: 'none',
      installmentCount: '1'
    });
  };

  const handleMarkInstallmentPaid = async (transaction, installmentId) => {
    try {
      const updatedInstallments = transaction.installments.map(inst => {
        if (inst.id === installmentId) {
          return { ...inst, status: 'Pago', paidDate: new Date().toISOString() };
        }
        return inst;
      });

      const allPaid = updatedInstallments.every(i => i.status === 'Pago');
      const newStatus = allPaid ? 'Recebido' : 'Pendente';

      await pb.collection('transactions').update(transaction.id, {
        installments: updatedInstallments,
        status: newStatus
      }, { $autoCancel: false });

      toast.success('Parcela marcada como paga');
      refetch();
    } catch (error) {
      toast.error('Erro ao atualizar parcela');
    }
  };

  const handleMarkTransactionPaid = async (transaction) => {
    try {
      await pb.collection('transactions').update(transaction.id, {
        status: 'Recebido'
      }, { $autoCancel: false });
      toast.success('Recebimento marcado como concluído');
      refetch();
    } catch (error) {
      toast.error('Erro ao atualizar recebimento');
    }
  };

  // --- Date Range Calculation ---
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (period) {
      case '30d': start.setDate(now.getDate() - 30); break;
      case '60d': start.setDate(now.getDate() - 60); break;
      case '90d': start.setDate(now.getDate() - 90); break;
      case '6m': start.setMonth(now.getMonth() - 6); break;
      case '1y': start.setFullYear(now.getFullYear() - 1); break;
      case 'custom': 
        start = customDateRange.start ? new Date(customDateRange.start) : new Date(0);
        if (customDateRange.end) {
          end = new Date(customDateRange.end);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default: start.setDate(now.getDate() - 30);
    }
    return { start, end };
  }, [period, customDateRange]);

  // --- Faturamento Calculations ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.isInstallment && t.installments) {
        return t.installments.some(inst => {
          const iDate = new Date(inst.dueDate);
          return iDate >= dateRange.start && iDate <= dateRange.end;
        });
      }
      const tDate = new Date(t.date);
      return tDate >= dateRange.start && tDate <= dateRange.end;
    });
  }, [transactions, dateRange]);

  const metrics = useMemo(() => {
    let atual = 0;
    let passado = 0;
    let previsto = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const isPaid = t.status === 'Recebido';
      
      if (t.isInstallment && t.installments) {
        t.installments.forEach(inst => {
          const iDate = new Date(inst.dueDate);
          const iPaid = inst.status === 'Pago';
          
          if (iPaid) {
            if (iDate >= dateRange.start && iDate <= dateRange.end) atual += inst.amount;
            else if (iDate < dateRange.start) passado += inst.amount;
          } else {
            if (iDate >= dateRange.start && iDate <= dateRange.end) previsto += inst.amount;
          }
        });
      } else {
        if (isPaid) {
          if (tDate >= dateRange.start && tDate <= dateRange.end) atual += t.amount;
          else if (tDate < dateRange.start) passado += t.amount;
        } else {
          if (tDate >= dateRange.start && tDate <= dateRange.end) previsto += t.amount;
        }
      }
    });

    return { atual, passado, previsto };
  }, [transactions, dateRange]);

  // --- Charts Data ---
  const monthlyChartData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
      months[key] = { name: key, Pago: 0, Pendente: 0, Atrasado: 0 };
    }

    transactions.forEach(t => {
      if (t.isInstallment && t.installments) {
        t.installments.forEach(inst => {
          const d = new Date(inst.dueDate);
          if (d >= dateRange.start && d <= dateRange.end) {
            const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
            if (months[key]) {
              if (inst.status === 'Pago') months[key].Pago += inst.amount;
              else if (d < new Date(new Date().setHours(0,0,0,0))) months[key].Atrasado += inst.amount;
              else months[key].Pendente += inst.amount;
            }
          }
        });
      } else {
        const d = new Date(t.date);
        if (d >= dateRange.start && d <= dateRange.end) {
          const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
          if (months[key]) {
            if (t.status === 'Recebido') months[key].Pago += t.amount;
            else if (t.status === 'Cancelado') { /* ignore */ }
            else if (d < new Date(new Date().setHours(0,0,0,0))) months[key].Atrasado += t.amount;
            else months[key].Pendente += t.amount;
          }
        }
      }
    });

    return Object.values(months);
  }, [transactions, dateRange]);

  const annualChartData = useMemo(() => {
    const years = {};
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
      years[currentYear - i] = { name: (currentYear - i).toString(), Total: 0 };
    }

    transactions.forEach(t => {
      if (t.isInstallment && t.installments) {
        t.installments.forEach(inst => {
          const d = new Date(inst.dueDate);
          if (d >= dateRange.start && d <= dateRange.end && inst.status === 'Pago') {
            const y = new Date(inst.paidDate || inst.dueDate).getFullYear();
            if (years[y]) years[y].Total += inst.amount;
          }
        });
      } else {
        const d = new Date(t.date);
        if (d >= dateRange.start && d <= dateRange.end && t.status === 'Recebido') {
          const y = d.getFullYear();
          if (years[y]) years[y].Total += t.amount;
        }
      }
    });

    return Object.values(years);
  }, [transactions, dateRange]);

  const getStatusBadge = (status, date) => {
    if (status === 'Recebido' || status === 'Pago') {
      return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Pago</Badge>;
    }
    if (status === 'Cancelado') {
      return <Badge className="bg-gray-500/10 text-gray-600 hover:bg-gray-500/20 border-gray-500/20">Cancelado</Badge>;
    }
    
    const isOverdue = date && new Date(date) < new Date(new Date().setHours(0,0,0,0));
    if (status === 'Atrasado' || isOverdue) {
      return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">Atrasado</Badge>;
    }
    
    return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">Pendente</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid gap-6 md:grid-cols-3 mb-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Financeiro - Frame Pro</title>
        <meta name="description" content="Gerencie suas finanças e faturamento" />
      </Helmet>

      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Financeiro</h1>
                <p className="text-muted-foreground">Acompanhe suas receitas, parcelas e faturamento</p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                  <TabsTrigger value="faturamento">Faturamento Anual</TabsTrigger>
                  <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                </TabsList>

                <TabsContent value="faturamento" className="space-y-6">
                  
                  {/* Controls: Filter & New Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Filter className="w-4 h-4" />
                        <span>Filtrar período:</span>
                      </div>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[160px] h-9 bg-background border-border/50">
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30d">Últimos 30 dias</SelectItem>
                          <SelectItem value="60d">Últimos 60 dias</SelectItem>
                          <SelectItem value="90d">Últimos 90 dias</SelectItem>
                          <SelectItem value="6m">Últimos 6 meses</SelectItem>
                          <SelectItem value="1y">Último 1 ano</SelectItem>
                          <SelectItem value="custom">Customizado</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {period === 'custom' && (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="date" 
                            className="w-[130px] h-9 bg-background border-border/50" 
                            value={customDateRange.start} 
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))} 
                          />
                          <span className="text-muted-foreground">até</span>
                          <Input 
                            type="date" 
                            className="w-[130px] h-9 bg-background border-border/50" 
                            value={customDateRange.end} 
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))} 
                          />
                        </div>
                      )}
                    </div>
                    
                    <Button onClick={handleOpenNew} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Recebimento
                    </Button>
                  </div>

                  {/* 1. Metrics */}
                  <div className="grid gap-6 md:grid-cols-3">
                    <Card className="bg-card border-border/50 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Atual</CardTitle>
                        <Wallet className="h-5 w-5 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.atual)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Recebido no período selecionado</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border/50 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Passado</CardTitle>
                        <TrendingDown className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.passado)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Recebido antes do período</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border/50 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Previsto</CardTitle>
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.previsto)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Pendente/Atrasado no período</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 2. Charts */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>Receita Mensal</CardTitle>
                        <CardDescription>Distribuição por status no período</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                              <Tooltip 
                                formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                              />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Bar dataKey="Pago" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                              <Bar dataKey="Pendente" stackId="a" fill="#eab308" />
                              <Bar dataKey="Atrasado" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm">
                      <CardHeader>
                        <CardTitle>Receita Anual</CardTitle>
                        <CardDescription>Total recebido no período</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={annualChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                              <Tooltip 
                                formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                              />
                              <Bar dataKey="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 3. Transactions List */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Recebimentos do Período</h3>
                    {filteredTransactions.length > 0 ? (
                      <div className="space-y-4">
                        {filteredTransactions.map((transaction) => (
                          <Card key={transaction.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
                            {transaction.isInstallment && transaction.installments ? (
                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value={transaction.id} className="border-none">
                                  <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                                    <div className="flex items-center justify-between w-full pr-4">
                                      <div className="flex flex-col items-start gap-1">
                                        <span className="font-semibold text-base">{transaction.description}</span>
                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                          {transaction.expand?.clientId?.name || 'Sem cliente'} • {transaction.installmentCount} parcelas
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <span className="font-bold block">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.originalAmount || transaction.amount)}
                                          </span>
                                          {getStatusBadge(transaction.status, transaction.date)}
                                        </div>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-6 pb-4 pt-0">
                                    <div className="space-y-2 mt-2 border-t pt-4">
                                      {transaction.installments.map((inst) => (
                                        <div key={inst.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
                                          <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-sm">
                                              {inst.number}
                                            </div>
                                            <div>
                                              <p className="font-medium">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.amount)}
                                              </p>
                                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3" />
                                                Vencimento: {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            {getStatusBadge(inst.status, inst.dueDate)}
                                            {inst.status !== 'Pago' && (
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-8 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                                                onClick={() => handleMarkInstallmentPaid(transaction, inst.id)}
                                              >
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Marcar como Pago
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex justify-end mt-4">
                                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(transaction.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Excluir Recebimento Completo
                                      </Button>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            ) : (
                              <div className="px-6 py-4 flex items-center justify-between">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="font-semibold text-base">{transaction.description}</span>
                                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    {transaction.expand?.clientId?.name || 'Sem cliente'} • {new Date(transaction.date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <span className="font-bold block">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                                    </span>
                                    {getStatusBadge(transaction.status, transaction.date)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {transaction.status !== 'Recebido' && transaction.status !== 'Cancelado' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 text-xs border-green-500/30 text-green-600 hover:bg-green-500/10"
                                        onClick={() => handleMarkTransactionPaid(transaction)}
                                      >
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(transaction.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="border-dashed border-2 bg-muted/10">
                        <CardContent className="p-12 text-center">
                          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-semibold mb-2">Nenhum recebimento encontrado</h3>
                          <p className="text-muted-foreground">Não há recebimentos para o período selecionado.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                </TabsContent>

                <TabsContent value="relatorios">
                  <Card className="border-dashed border-2 bg-muted/10">
                    <CardContent className="p-12 text-center">
                      <h3 className="text-lg font-semibold mb-2">Relatórios</h3>
                      <p className="text-muted-foreground">Módulo de relatórios avançados em desenvolvimento.</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {/* Transaction Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar Recebimento' : 'Novo Recebimento'}</DialogTitle>
            <DialogDescription>
              {editingTransaction ? 'Atualize as informações do recebimento selecionado' : 'Adicione um novo recebimento ou parcelamento ao seu financeiro'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data de Pagamento Mensal *</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor Total *</Label>
                <Input id="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Cliente</Label>
                <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!editingTransaction ? (
                <div className="space-y-2">
                  <Label htmlFor="installmentCount">Número de Parcelas</Label>
                  <Select value={formData.installmentCount} onValueChange={(value) => setFormData({ ...formData, installmentCount: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'vez (À vista)' : 'vezes'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {!editingTransaction && formData.installmentCount !== '1' && formData.amount && !isNaN(parseFloat(formData.amount)) && (
              <div className="bg-muted/50 p-3 rounded-md text-sm flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  Serão geradas {formData.installmentCount} parcelas de aproximadamente{' '}
                  <strong>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(formData.amount) / parseInt(formData.installmentCount))}
                  </strong>
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingTransaction ? 'Atualizar Recebimento' : 'Criar Recebimento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FinanceiroPage;
