import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Edit2, TrendingUp, Clock, AlertCircle, Users, 
  Target, FileText, ChevronRight, Inbox, CheckSquare 
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const Index = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<number>(0);
  const [realized, setRealized] = useState<number>(0);
  
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [pendingRevenue, setPendingRevenue] = useState<number>(0);
  const [overdueRevenue, setOverdueRevenue] = useState<number>(0);
  
  const [totalClients, setTotalClients] = useState<number>(0);
  const [openOpportunities, setOpenOpportunities] = useState<number>(0);
  const [activeContracts, setActiveContracts] = useState<number>(0);
  
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_revenue_goal')
        .eq('id', user?.id)
        .single();
        
      const currentGoal = profile?.monthly_revenue_goal || 0;
      setGoal(currentGoal);
      setNewGoal(currentGoal.toString());

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let calcRealized = 0;
      let calcTotalRevenue = 0;
      let calcPendingRevenue = 0;
      let calcOverdueRevenue = 0;

      if (transactions) {
        transactions.forEach(tx => {
          let insts: any[] = [];
          if (tx.is_installment && tx.installments) {
            try {
              insts = typeof tx.installments === 'string' ? JSON.parse(tx.installments) : tx.installments;
            } catch (e) {}
          }

          if (insts.length > 0) {
            insts.forEach((inst: any) => {
              const instDate = new Date(inst.dueDate);
              const isCurrentMonth = instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear;
              const isPaid = inst.status === 'Pago' || inst.status === 'Recebido';
              const isOverdue = instDate < today && !isPaid && inst.status !== 'Cancelado';
              const amount = Number(inst.amount) || 0;

              if (isPaid) {
                calcTotalRevenue += amount;
                if (isCurrentMonth) calcRealized += amount;
              } else if (inst.status !== 'Cancelado') {
                if (isOverdue || inst.status === 'Atrasado') {
                  calcOverdueRevenue += amount;
                } else {
                  calcPendingRevenue += amount;
                }
              }
            });
          } else {
            const txDate = new Date(tx.date);
            const isCurrentMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
            const isPaid = tx.status === 'Recebido' || tx.status === 'Pago';
            const isOverdue = txDate < today && !isPaid && tx.status !== 'Cancelado';
            const amount = Number(tx.amount) || 0;

            if (isPaid) {
              calcTotalRevenue += amount;
              if (isCurrentMonth) calcRealized += amount;
            } else if (tx.status !== 'Cancelado') {
              if (isOverdue || tx.status === 'Atrasado') {
                calcOverdueRevenue += amount;
              } else {
                calcPendingRevenue += amount;
              }
            }
          }
        });
      }

      setRealized(calcRealized);
      setTotalRevenue(calcTotalRevenue);
      setPendingRevenue(calcPendingRevenue);
      setOverdueRevenue(calcOverdueRevenue);

      const { data: opsData } = await supabase
        .from('opportunities')
        .select('id, is_client, column_id, columns:column_id(name)')
        .eq('user_id', user?.id);

      if (opsData) {
        setTotalClients(opsData.filter(op => op.is_client).length);
        const openOps = opsData.filter(op => !op.is_client);
        setOpenOpportunities(openOps.length);
        
        const pipelineCounts: Record<string, number> = {};
        openOps.forEach(op => {
          const columnsObj = op.columns as any;
          const colName = columnsObj?.name ? columnsObj.name : 'Sem Etapa';
          pipelineCounts[colName] = (pipelineCounts[colName] || 0) + 1;
        });
        
        const chartData = Object.keys(pipelineCounts).map(name => ({
          name,
          quantidade: pipelineCounts[name]
        }));
        setPipelineData(chartData);
      }

      const { data: contractsData } = await supabase
        .from('contracts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('status', 'active');
        
      if (contractsData) setActiveContracts(contractsData.length);

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tasksData) setRecentTasks(tasksData);

    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async () => {
    try {
      const numGoal = Number(newGoal);
      if (isNaN(numGoal) || numGoal < 0) {
        toast.error("Por favor, insira um valor válido.");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ monthly_revenue_goal: numGoal })
        .eq('id', user?.id);

      if (error) throw error;

      setGoal(numGoal);
      setIsGoalModalOpen(false);
      toast.success("Meta atualizada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar a meta.");
    }
  };

  const percentage = goal > 0 ? Math.min(Math.round((realized / goal) * 100), 100) : 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 pb-10">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1 font-medium">Bem-vindo ao seu centro de controle</p>
          </div>
        </div>

        {/* Bloco de Meta - SUPER DESTAQUE */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-orange-100 relative overflow-hidden group transition-all hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-20 -mt-20 opacity-40 group-hover:scale-110 transition-transform duration-700"></div>
          
          <button 
            onClick={() => setIsGoalModalOpen(true)}
            className="absolute top-8 right-8 p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-all z-10"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          
          <div className="relative z-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-orange-500 mb-4">Meta de Faturamento Mensal</h3>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 mb-8">
              <span className="text-5xl sm:text-6xl font-black text-gray-900 tracking-tighter">
                {formatCurrency(goal)}
              </span>
              <span className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                {percentage}% alcançado
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 font-bold">
                  Realizado: <span className="text-gray-900">{formatCurrency(realized)}</span>
                </p>
                <p className="text-sm text-gray-400 font-medium">
                  Faltam: {formatCurrency(Math.max(0, goal - realized))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Faturamento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col justify-between h-36 transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-1">Faturamento Total</h3>
              <span className="text-2xl font-black text-gray-900">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col justify-between h-36 transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">A Receber</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-1">Faturamento Pendente</h3>
              <span className="text-2xl font-black text-gray-900">{formatCurrency(pendingRevenue)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex flex-col justify-between h-36 transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atrasado</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-1">Faturamento Atrasado</h3>
              <span className="text-2xl font-black text-gray-900">{formatCurrency(overdueRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-50 flex items-center gap-4 transition-all hover:shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Total de clientes</p>
              <p className="text-2xl font-black text-gray-900">{totalClients}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-50 flex items-center gap-4 transition-all hover:shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Oportunidades</p>
              <p className="text-2xl font-black text-gray-900">{openOpportunities}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-50 flex items-center gap-4 transition-all hover:shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500">Contratos ativos</p>
              <p className="text-2xl font-black text-gray-900">{activeContracts}</p>
            </div>
          </div>
        </div>

        {/* Bottom Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 transition-all hover:shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-gray-900">Pipeline de Vendas</h3>
                <p className="text-sm text-gray-500 font-medium">Distribuição por etapa</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-xl">
                <Target className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="h-[300px] w-full">
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="quantidade" radius={[6, 6, 0, 0]} barSize={40}>
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#f97316', '#fb923c', '#fdba74', '#fed7aa'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <Inbox className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-bold">Sem dados no pipeline</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 transition-all hover:shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-gray-900">Atividades Recentes</h3>
                <p className="text-sm text-gray-500 font-medium">Suas últimas tarefas</p>
              </div>
              <button className="text-xs font-bold text-orange-500 hover:underline uppercase tracking-wider">Ver todas</button>
            </div>
            <div className="space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-orange-200 transition-all group">
                    <div className="h-12 w-12 rounded-xl bg-white shadow-sm text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <CheckSquare className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{task.title}</h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Criada em {new Date(task.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        task.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {task.status || 'Pendente'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-2">
                  <CheckSquare className="w-10 h-10 opacity-20" />
                  <p className="text-sm font-bold">Nenhuma tarefa recente</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">Configurar Meta Mensal</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <label className="text-sm font-bold text-gray-700 block mb-3 uppercase tracking-wider">
              Qual é o seu objetivo para este mês?
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-orange-500 transition-colors">R$</span>
              <Input
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="pl-12 h-14 text-xl font-bold rounded-2xl bg-gray-50 border-gray-200 focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all"
                placeholder="0,00"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsGoalModalOpen(false)} className="rounded-xl h-12 font-bold text-gray-500">
              Cancelar
            </Button>
            <Button onClick={handleUpdateGoal} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-orange-200">
              Salvar Nova Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Index;