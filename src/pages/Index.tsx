import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Edit2, TrendingUp, Clock, AlertCircle, Users, Target, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  
  // Modal state
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
      // 1. Fetch Profile Goal
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_revenue_goal')
        .eq('id', user?.id)
        .single();
        
      const currentGoal = profile?.monthly_revenue_goal || 0;
      setGoal(currentGoal);
      setNewGoal(currentGoal.toString());

      // 2. Fetch Transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id);

      if (txError && txError.code !== '42P01') {
        console.error("Error fetching transactions:", txError);
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Zera as horas para comparar atrasos corretamente sem conflito de fuso
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

      // 3. Fetch Clients & Opportunities
      const { data: opsData } = await supabase
        .from('opportunities')
        .select('id, is_client, column_id, columns:column_id(name)')
        .eq('user_id', user?.id);

      if (opsData) {
        setTotalClients(opsData.filter(op => op.is_client).length);
        
        // Open opportunities (not clients)
        const openOps = opsData.filter(op => !op.is_client);
        setOpenOpportunities(openOps.length);
        
        // Count for pipeline chart based on column names
        const pipelineCounts: Record<string, number> = {};
        openOps.forEach(op => {
          const columnsObj = op.columns as any;
          const colName = columnsObj?.name ? columnsObj.name : 'Sem Etapa';
          pipelineCounts[colName] = (pipelineCounts[colName] || 0) + 1;
        });
        
        // Transform for Recharts
        const chartData = Object.keys(pipelineCounts).map(name => ({
          name,
          quantidade: pipelineCounts[name]
        }));
        setPipelineData(chartData);
      }

      // 4. Fetch Contracts
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('status', 'active');
        
      if (contractsData) {
        setActiveContracts(contractsData.length);
      }

      // 5. Fetch Recent Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (tasksData) {
        setRecentTasks(tasksData);
      }

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
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visão geral do seu negócio</p>
        </div>

        {/* Meta Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative">
          <button 
            onClick={() => setIsGoalModalOpen(true)}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          
          <h3 className="text-sm font-medium text-gray-900 mb-2">Meta de Faturamento Mensal</h3>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-bold text-gray-900">{formatCurrency(goal)}</span>
            <span className="text-sm font-medium text-gray-900">{percentage}% alcançado</span>
          </div>
          
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Realizado: {formatCurrency(realized)}</p>
        </div>

        {/* Faturamento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-500">Faturamento Total</h3>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-500">Faturamento Pendente</h3>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(pendingRevenue)}</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-500">Faturamento Atrasado</h3>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(overdueRevenue)}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-900">Total de clientes</h3>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{totalClients}</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-900">Oportunidades abertas</h3>
              <Target className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{openOpportunities}</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-900">Contratos ativos</h3>
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{activeContracts}</span>
          </div>
        </div>

        {/* Bottom Large Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[300px]">
            <h3 className="font-bold text-gray-900 mb-1">Pipeline de oportunidades</h3>
            <p className="text-sm text-gray-500 mb-6">Distribuição por status</p>
            <div className="h-[250px] w-full">
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="quantidade" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Sem oportunidades no pipeline
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[300px]">
            <h3 className="font-bold text-gray-900 mb-1">Atividades recentes</h3>
            <p className="text-sm text-gray-500 mb-6">Últimas tarefas criadas</p>
            <div className="space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
                      <p className="text-xs text-gray-500">
                        {new Date(task.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'Concluída' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status || 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400">
                  Nenhuma atividade recente
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar Meta Mensal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Qual é a sua meta de faturamento para este mês?
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
              <Input
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="pl-9"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGoal} className="bg-orange-500 hover:bg-orange-600 text-white">
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Index;