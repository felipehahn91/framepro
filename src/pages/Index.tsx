import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Edit2, TrendingUp, Clock, AlertCircle, Users, 
  Target, FileText, ChevronRight, Inbox, CheckSquare, Loader2
} from "lucide-react";
import { AIInsight } from "@/components/AIInsight";
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
  const [profile, setProfile] = useState<any>(null);
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
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
        
      setProfile(userProfile);
      const currentGoal = userProfile?.monthly_revenue_goal || 0;
      setGoal(currentGoal);
      setNewGoal(currentGoal.toString());

      const step = 1000;

      // 1. Busca em Lotes das Transações Financeiras (Para evitar limite de 1000 do Supabase)
      let allTransactions: any[] = [];
      let hasMoreTx = true;
      let txFrom = 0;

      while (hasMoreTx) {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user?.id)
          .range(txFrom, txFrom + step - 1);

        if (data && data.length > 0) {
          allTransactions = [...allTransactions, ...data];
          if (data.length < step) hasMoreTx = false;
          else txFrom += step;
        } else {
          hasMoreTx = false;
        }
      }

      const transactions = allTransactions;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let calcRealized = 0;
      let calcTotalRevenue = 0;
      let calcPendingRevenue = 0;
      let calcOverdueRevenue = 0;

      if (transactions.length > 0) {
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

      // 2. Busca em Lotes das Oportunidades e Clientes
      let allOpsData: any[] = [];
      let hasMoreOps = true;
      let opsFrom = 0;

      while (hasMoreOps) {
        const { data, error } = await supabase
          .from('opportunities')
          .select('id, is_client, column_id, columns:column_id(name)')
          .eq('user_id', user?.id)
          .range(opsFrom, opsFrom + step - 1);

        if (error) {
          console.error("Ops fetch error:", error);
          break;
        }

        if (data && data.length > 0) {
          allOpsData = [...allOpsData, ...data];
          if (data.length < step) {
            hasMoreOps = false;
          } else {
            opsFrom += step;
          }
        } else {
          hasMoreOps = false;
        }
      }

      const opsData = allOpsData;

      if (opsData && opsData.length > 0) {
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

      // 3. Busca de Contratos Ativos (Apenas a contagem via banco para ser mais rápido)
      const { count: contractsCount } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .in('status', ['active', 'Ativo']);
        
      if (contractsCount !== null) setActiveContracts(contractsCount);

      // 4. Últimas 5 tarefas (Limite de 5, não precisa de lote)
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tasksData) setRecentTasks(tasksData);

    } catch (error) {
      console.error("Dashboard fetch error:", error);
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
      toast.error("Erro ao atualizar a meta.");
    }
  };

  const percentage = goal > 0 ? Math.min(Math.round((realized / goal) * 100), 100) : 0;

  if (loading) {
    return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="min-h-full -m-4 sm:-m-8 p-4 sm:p-8" style={{ backgroundColor: '#e6e6e64c' }}>
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 text-sm">Bem-vindo de volta, {profile?.first_name || 'Usuário'}!</p>
            </div>
          </div>

          <AIInsight userId={user?.id || ''} initialData={profile?.ai_summary} />

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-lg relative group">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-900 text-base">Meta de Faturamento Mensal</h3>
              <button 
                onClick={() => setIsGoalModalOpen(true)}
                className="text-gray-400 hover:text-gray-900 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-6">
              <span className="text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight break-words">
                {formatCurrency(goal)}
              </span>
              <span className="text-gray-500 font-semibold text-sm whitespace-nowrap">
                {percentage}% alcançado
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Realizado: {formatCurrency(realized)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-gray-500">Faturamento Total</span>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</span>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-gray-500">Faturamento Pendente</span>
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(pendingRevenue)}</span>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-gray-500">Faturamento Atrasado</span>
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(overdueRevenue)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-500">Total de clientes</span>
                <Users className="w-4 h-4 text-gray-300" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{totalClients}</span>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-500">Oportunidades abertas</span>
                <Target className="w-4 h-4 text-gray-300" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{openOpportunities}</span>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md flex flex-col justify-between hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-500">Contratos ativos</span>
                <FileText className="w-4 h-4 text-gray-300" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{activeContracts}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md">
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900">Pipeline de oportunidades</h3>
                <p className="text-xs text-gray-500">Distribuição por status</p>
              </div>
              <div className="h-[250px] w-full">
                {pipelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} barSize={30}>
                        {pipelineData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#f97316', '#fb923c', '#fdba74', '#fed7aa'][index % 4]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                    <Inbox className="w-10 h-10 opacity-20" />
                    <p className="text-xs font-medium">Sem dados no pipeline</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-md flex flex-col">
              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900">Atividades recentes</h3>
                <p className="text-xs text-gray-500">Últimas tarefas criadas</p>
              </div>
              <div className="space-y-3 flex-1">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{task.title}</h4>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {new Date(task.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 py-10">
                    <CheckSquare className="w-8 h-8 opacity-20" />
                    <p className="text-xs font-medium">Nenhuma tarefa recente</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-bold text-gray-900 text-lg">Configurar Meta Mensal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Valor do objetivo (R$)
            </label>
            <Input
              type="number"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              className="h-11 rounded-lg border-gray-200 focus:ring-orange-400"
              placeholder="0,00"
              step="0.01"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsGoalModalOpen(false)} className="rounded-lg h-10 font-semibold text-gray-500">
              Cancelar
            </Button>
            <Button onClick={handleUpdateGoal} className="bg-orange-400 hover:bg-orange-500 text-white rounded-lg h-10 px-6 font-bold">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Index;